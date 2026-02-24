import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { patientService } from '../services/patientService';
import { Search, User, FileText, Activity, ChevronDown, ChevronUp, Stethoscope, Calendar, RefreshCw, AlertCircle, Pill, Clock, ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PatientList() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const role = profile?.role;

    const [patients, setPatients] = useState([]);
    const [apptMap, setApptMap] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(null);
    const [clinicalRecords, setClinicalRecords] = useState({});
    const [recordLoading, setRecordLoading] = useState({});

    const fetchPatients = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch patients - simple select, no joins
            const { data: patientsData, error: pErr } = await supabase
                .from('patients')
                .select('*')
                .order('created_at', { ascending: false });
            if (pErr) throw pErr;

            // Fetch only scheduled/active appointments separately (no joined queries)
            const { data: apptsData, error: aErr } = await supabase
                .from('appointments')
                .select('id, patient_id, status, reason, created_at')
                .eq('status', 'scheduled')
                .order('created_at', { ascending: false });

            if (aErr) {
                console.warn('Could not fetch appointments:', aErr.message);
            }

            // Build map: patientId → most recent active appointment
            const map = {};
            (apptsData || []).forEach(appt => {
                if (!map[appt.patient_id]) {
                    map[appt.patient_id] = appt;
                }
            });

            setPatients(patientsData || []);
            setApptMap(map);
        } catch (err) {
            console.error('Error fetching patients:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();

        // Handle search query parameter
        const params = new URLSearchParams(location.search);
        const searchId = params.get('search');
        if (searchId) {
            setSearchTerm(searchId);
            setExpanded(searchId);
            if (role === 'doctor' || role === 'admin') {
                fetchClinicalRecords(searchId);
            }
        }
    }, [location.search]);

    const getApptState = (appt) => {
        if (!appt) return null;
        try { return JSON.parse(appt.reason || '{}').state; } catch { return null; }
    };

    // Only doctors and admins can fetch and view clinical records
    const fetchClinicalRecords = async (patientId) => {
        if (clinicalRecords[patientId]) return;
        setRecordLoading(prev => ({ ...prev, [patientId]: true }));
        try {
            // Fetch completed appointments with the doctor's profile joined
            const { data: appts, error } = await supabase
                .from('appointments')
                .select('id, reason, status, created_at, doctor_id')
                .eq('patient_id', patientId)
                .eq('status', 'completed')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // For each completed appointment, get the doctor name from profiles
            const records = await Promise.all((appts || []).map(async (appt) => {
                let doctorName = 'Unknown Doctor';
                if (appt.doctor_id) {
                    const { data: doc } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', appt.doctor_id)
                        .single();
                    if (doc?.full_name) doctorName = doc.full_name;
                }
                return { ...appt, doctorName };
            }));

            setClinicalRecords(prev => ({ ...prev, [patientId]: records }));
        } catch (err) {
            console.error('Error fetching records:', err);
            setClinicalRecords(prev => ({ ...prev, [patientId]: [] }));
        } finally {
            setRecordLoading(prev => ({ ...prev, [patientId]: false }));
        }
    };

    const toggleExpand = async (patientId) => {
        if (expanded === patientId) { setExpanded(null); return; }
        setExpanded(patientId);
        if (role === 'doctor' || role === 'admin') {
            await fetchClinicalRecords(patientId);
        }
    };

    const filteredPatients = patients.filter(p => {
        const fullName = `${p?.first_name || ''} ${p?.last_name || ''}`.toLowerCase();
        const phone = (p?.phone || '').toLowerCase();
        const id = (p?.id || '').toLowerCase();
        return fullName.includes(searchTerm.toLowerCase()) ||
            phone.includes(searchTerm.toLowerCase()) ||
            id.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="container animate-fade-in">
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ marginBottom: 0 }}>Patient Directory</h1>
                        <p className="subtitle" style={{ marginBottom: 0 }}>
                            {role === 'doctor' ? 'Search patients and view clinical records' : 'Manage patient registrations and queue'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or phone..."
                                style={{ paddingLeft: '38px', borderRadius: 'var(--radius-full)', minWidth: '260px' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={fetchPatients} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.875rem', fontSize: '0.875rem' }}>
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                    <AlertCircle size={20} />
                    <div>
                        <strong>Failed to load patients</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>{error}</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                    <p>Loading directory...</p>
                </div>
            ) : filteredPatients.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Search size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>{searchTerm ? 'No patients match your search.' : 'No patients registered yet.'}</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {filteredPatients.map(patient => {
                        const latestAppt = apptMap[patient.id] || null;
                        const apptState = getApptState(latestAppt);
                        const isExpanded = expanded === patient.id;
                        const records = clinicalRecords[patient.id];
                        const isLoadingRec = recordLoading[patient.id];
                        const isDoctor = role === 'doctor' || role === 'admin';

                        let triagePayload = null;
                        try { triagePayload = latestAppt ? JSON.parse(latestAppt.reason || '{}') : null; } catch { }

                        return (
                            <div key={patient.id} style={{ background: 'rgba(22,32,52,0.92)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                {/* Patient Row */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    {/* Identity */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                                        <div style={{ background: 'rgba(14,165,233,0.12)', padding: '10px', borderRadius: '50%', color: 'var(--secondary)', flexShrink: 0 }}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-main)' }}>
                                                {patient.first_name} {patient.last_name}
                                            </strong>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '2px' }}>
                                                {patient.date_of_birth && <span>DOB: {patient.date_of_birth}</span>}
                                                {patient.gender && <span>{patient.gender}</span>}
                                                {patient.phone && <span>📞 {patient.phone}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                        {/* Queue status badge */}
                                        {apptState && (
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: '600', padding: '3px 10px', borderRadius: '999px',
                                                background: apptState === 'waiting_for_doctor' ? 'rgba(245,158,11,0.15)' : apptState === 'waiting_for_triage' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                                                color: apptState === 'waiting_for_doctor' ? '#f59e0b' : apptState === 'waiting_for_triage' ? '#3b82f6' : '#10b981'
                                            }}>
                                                {apptState === 'waiting_for_doctor' ? '🩺 Awaiting Doctor' : apptState === 'waiting_for_triage' ? '⏳ Awaiting Triage' : '✅ Completed'}
                                            </span>
                                        )}

                                        {/* Nurse: Triage */}
                                        {(role === 'nurse' || role === 'admin') && apptState === 'waiting_for_triage' && latestAppt && (
                                            <Link to={`/triage?id=${patient.id}&appt_id=${latestAppt.id}`} className="btn" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <Activity size={14} /> Triage
                                            </Link>
                                        )}

                                        {/* Doctor: Consult */}
                                        {isDoctor && apptState === 'waiting_for_doctor' && latestAppt && (
                                            <Link to={`/consultation?id=${patient.id}&appt_id=${latestAppt.id}`} className="btn" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <Stethoscope size={14} /> Consult
                                            </Link>
                                        )}

                                        {/* Receptionist / admin: Add to queue for waiting patients */}
                                        {(role === 'receptionist' || role === 'admin') && !latestAppt && (
                                            <button className="btn" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', background: 'rgba(79,70,229,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                                onClick={async () => {
                                                    try { await patientService.addToQueue(patient.id); fetchPatients(); }
                                                    catch (err) { alert('Failed to queue patient: ' + err.message); }
                                                }}>
                                                <Calendar size={14} /> Add to Queue
                                            </button>
                                        )}

                                        {/* Doctor/Admin: Records toggle */}
                                        {isDoctor && (
                                            <button onClick={() => toggleExpand(patient.id)} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <FileText size={14} />
                                                Records
                                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Clinical Records Panel — Doctors Only */}
                                {isExpanded && isDoctor && (
                                    <div style={{ borderTop: '1px solid var(--border)', padding: '1.25rem 1.5rem', background: 'rgba(10,15,30,0.6)' }}>
                                        {/* Current triage vitals if in queue */}
                                        {triagePayload?.vitals && Object.values(triagePayload.vitals).some(v => v) && (
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <p style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Activity size={12} /> Current Triage Vitals
                                                </p>
                                                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                    {triagePayload.vitals.temperature && <VitalChip label="Temp" value={`${triagePayload.vitals.temperature}°C`} />}
                                                    {triagePayload.vitals.blood_pressure && <VitalChip label="BP" value={triagePayload.vitals.blood_pressure} />}
                                                    {triagePayload.vitals.heart_rate && <VitalChip label="HR" value={`${triagePayload.vitals.heart_rate} BPM`} />}
                                                    {triagePayload.vitals.oxygen_saturation && <VitalChip label="SpO2" value={`${triagePayload.vitals.oxygen_saturation}%`} />}
                                                    {triagePayload.vitals.weight && <VitalChip label="Weight" value={`${triagePayload.vitals.weight}kg`} />}
                                                    {triagePayload.vitals.respiratory_rate && <VitalChip label="Resp" value={`${triagePayload.vitals.respiratory_rate}/min`} />}
                                                </div>
                                                {triagePayload.notes && (
                                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.6rem', fontStyle: 'italic', background: 'rgba(245,158,11,0.06)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.15)' }}>
                                                        💬 Nurse: "{triagePayload.notes}"
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Clinical history */}
                                        <p style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <FileText size={12} /> Clinical History
                                        </p>

                                        {isLoadingRec ? (
                                            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                                                <div style={{ width: '28px', height: '28px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
                                                <p style={{ margin: 0, fontSize: '0.83rem' }}>Loading records...</p>
                                            </div>
                                        ) : !records || records.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
                                                No completed consultations on record for this patient.
                                            </p>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '0.6rem' }}>
                                                {records.map((rec, idx) => {
                                                    let payload = {};
                                                    try { payload = JSON.parse(rec.reason || '{}'); } catch { }
                                                    return (
                                                        <div key={rec.id || idx} style={{ background: 'rgba(22,32,52,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1rem 1.1rem' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                                <div>
                                                                    <p style={{ fontWeight: '600', margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                                                        {payload.diagnosis || 'Consultation record'}
                                                                    </p>
                                                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <Clock size={11} />
                                                                        {new Date(rec.created_at).toLocaleDateString([], { dateStyle: 'long' })}
                                                                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                                                                        <span style={{ color: 'var(--secondary)' }}>Dr. {rec.doctorName}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {payload.prescription && (
                                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '6px', padding: '0.5rem 0.75rem', marginTop: '0.4rem' }}>
                                                                    <Pill size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#10b981' }} />
                                                                    <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                                                                        <strong style={{ color: '#10b981', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Prescription</strong>
                                                                        {payload.prescription}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function VitalChip({ label, value }) {
    return (
        <div style={{ background: 'rgba(22,32,52,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.3rem 0.7rem', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '65px' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)' }}>{value}</span>
        </div>
    );
}
