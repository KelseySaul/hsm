import { supabase } from './supabaseClient';

export const patientService = {

  // Create a new patient — only include columns that exist in the DB schema
  async addPatient(patientData) {
    const { data, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select();
    if (error) throw error;
    return data;
  },

  // Get all patients
  async getPatients() {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Add a patient to the triage queue (creates a scheduled appointment)
  async addToQueue(patientId) {
    const payload = { state: 'waiting_for_triage' };
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        patient_id: patientId,
        status: 'scheduled',
        appointment_date: new Date().toISOString(),
        reason: JSON.stringify(payload)
      }])
      .select();
    if (error) throw error;
    return data;
  },

  // Get Triage Queue (Nurse) — use separate queries to avoid needing FK relationships
  async getTriageQueue() {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, patient_id, status, reason, created_at, appointment_date')
      .eq('status', 'scheduled')
      .like('reason', '%"state":"waiting_for_triage"%')
      .lte('appointment_date', todayEnd.toISOString())
      .order('appointment_date', { ascending: true });
    if (error) throw error;

    if (!appointments || appointments.length === 0) return [];

    // Fetch patient names separately
    const patientIds = [...new Set(appointments.map(a => a.patient_id))];
    const { data: patients } = await supabase
      .from('patients')
      .select('id, first_name, last_name, gender, date_of_birth')
      .in('id', patientIds);

    const patientMap = {};
    (patients || []).forEach(p => { patientMap[p.id] = p; });

    return appointments.map(appt => ({
      ...appt,
      patients: patientMap[appt.patient_id] || null
    }));
  },

  // Get Doctor Queue — use separate queries to avoid needing FK relationships
  async getDoctorQueue() {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, patient_id, status, reason, created_at, appointment_date')
      .eq('status', 'scheduled')
      .like('reason', '%"state":"waiting_for_doctor"%')
      .lte('appointment_date', todayEnd.toISOString())
      .order('appointment_date', { ascending: true });
    if (error) throw error;

    if (!appointments || appointments.length === 0) return [];

    // Fetch patient names separately
    const patientIds = [...new Set(appointments.map(a => a.patient_id))];
    const { data: patients } = await supabase
      .from('patients')
      .select('id, first_name, last_name, gender, date_of_birth')
      .in('id', patientIds);

    const patientMap = {};
    (patients || []).forEach(p => { patientMap[p.id] = p; });

    return appointments.map(appt => ({
      ...appt,
      patients: patientMap[appt.patient_id] || null
    }));
  },

  // Get a specific appointment with patient data — separate queries, no nested joins
  async getAppointmentDetails(appointmentId) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();
    if (error) throw error;

    // Fetch patient separately
    if (data?.patient_id) {
      const { data: patient } = await supabase
        .from('patients')
        .select('id, first_name, last_name, gender, date_of_birth')
        .eq('id', data.patient_id)
        .single();
      data.patients = patient || null;
    }

    // Parse the reason payload
    if (data?.reason) {
      try { data.payload = JSON.parse(data.reason); }
      catch { data.payload = {}; }
    }

    return data;
  },

  // Nurse saves vitals and forwards to doctor
  async submitTriage(appointmentId, vitals, notes) {
    const payload = { state: 'waiting_for_doctor', vitals, notes };
    const { data, error } = await supabase
      .from('appointments')
      .update({ reason: JSON.stringify(payload) })
      .eq('id', appointmentId)
      .select();
    if (error) throw error;
    return data;
  },

  // Doctor completes the consultation
  async submitConsultation(appointmentId, doctorId, diagnosis, prescription, followUpDate) {
    // Preserve existing payload (vitals, nurse notes) and add diagnosis on top
    const { data: existing } = await supabase
      .from('appointments')
      .select('reason')
      .eq('id', appointmentId)
      .single();

    let currentPayload = {};
    if (existing?.reason) {
      try { currentPayload = JSON.parse(existing.reason); } catch { }
    }

    const finalPayload = { ...currentPayload, diagnosis, prescription, state: 'completed' };

    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        doctor_id: doctorId,
        reason: JSON.stringify(finalPayload)
      })
      .eq('id', appointmentId)
      .select();
    if (error) throw error;
    return data;
  },

  // Search patients by name or ID
  async searchPatients(query) {
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
      .from('patients')
      .select('id, first_name, last_name, gender, date_of_birth')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,id.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  }
};