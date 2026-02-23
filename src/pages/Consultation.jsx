import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Stethoscope, Clipboard, FileText, Pill, User, ArrowLeft } from 'lucide-react';
import { patientService } from '../services/patientService';
import { supabase } from '../services/supabaseClient';

export default function Consultation() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const patientId = searchParams.get('id');
    const appointmentId = searchParams.get('appt_id');

    const [consultation, setConsultation] = useState({
        diagnosis: '',
        prescription: '',
        follow_up_date: ''
    });

    const [appointment, setAppointment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (appointmentId) {
            const fetchDetails = async () => {
                try {
                    const data = await patientService.getAppointmentDetails(appointmentId);
                    setAppointment(data);
                } catch (error) {
                    console.error("Failed to load appointment details:", error);
                    alert("Could not load patient clinical context.");
                } finally {
                    setLoading(false);
                }
            };
            fetchDetails();
        } else {
            setLoading(false);
        }
    }, [appointmentId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                alert("Authentication error. Please log in again.");
                return;
            }

            await patientService.submitConsultation(
                appointmentId,
                user.id,
                consultation.diagnosis,
                consultation.prescription,
                consultation.follow_up_date
            );

            alert('Consultation encounter recorded securely. Patient cleared from queue.');
            navigate('/'); // Navigate back to doctor dashboard
        } catch (error) {
            console.error("Failed to submit consultation:", error);
            alert("Error saving record: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="container" style={{ padding: '3rem', textAlign: 'center' }}>Loading clinical context...</div>;
    }

    if (!appointment) {
        return <div className="container" style={{ padding: '3rem', textAlign: 'center' }}>Invalid appointment reference. Please return to the queue.</div>;
    }

    // Nurse saves { state, vitals, notes } into the `reason` JSON field
    // patientService.getAppointmentDetails() parses it into appointment.payload
    const vitals = appointment.payload?.vitals || {};
    const triageNotes = appointment.payload?.notes || '';
    const patientName = `${appointment.patients?.first_name} ${appointment.patients?.last_name}`;

    return (
        <div className="container animate-fade-in">
            <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                <ArrowLeft size={16} /> Back
            </button>
            <div className="glass-panel" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0', overflow: 'hidden' }}>
                <style>{`
                    @media (max-width: 800px) {
                        .consultation-grid { grid-template-columns: 1fr !important; }
                        .consultation-sidebar { border-right: none !important; border-bottom: 1px solid var(--border); }
                        .consultation-main { padding: 1.5rem !important; }
                        .consultation-header { padding: 1.5rem !important; }
                        .consultation-btn-group { flex-direction: column; width: 100%; }
                        .consultation-btn-group button { width: 100% !important; }
                    }
                `}</style>
                <div className="consultation-header" style={{ background: 'var(--bg-card)', padding: '2rem 2.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '14px', borderRadius: '14px', color: 'white', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)' }}>
                                <Stethoscope size={32} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0 }}>Clinical Consultation Profile</h2>
                                <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>Active engagement documentation.</p>
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-main)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <User size={18} color="var(--primary)" />
                            <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{patientName}</span>
                        </div>
                    </div>
                </div>

                <div className="consultation-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2.5fr', minHeight: '500px' }}>

                    {/* Sidebar: Clinical Context & Vitals pulled from Nurse */}
                    <div className="consultation-sidebar" style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)', padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                            <Clipboard size={18} color="var(--secondary)" /> Presenting Vitals
                        </h3>

                        <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                            <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
                                <VitalRow label="Temp" value={vitals.temperature ? `${vitals.temperature} °C` : '--'} />
                                <VitalRow label="BP" value={vitals.blood_pressure || '--'} />
                                <VitalRow label="Pulse" value={vitals.heart_rate ? `${vitals.heart_rate} BPM` : '--'} />
                                <VitalRow label="Weight" value={vitals.weight ? `${vitals.weight} kg` : '--'} />
                                <VitalRow label="SpO2" value={vitals.oxygen_saturation ? `${vitals.oxygen_saturation}%` : '--'} />
                                <VitalRow label="Resp" value={vitals.respiratory_rate ? `${vitals.respiratory_rate}/min` : '--'} />
                            </div>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Nurse's Observation</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--border)', lineHeight: '1.5' }}>
                            {triageNotes || "No additional triage notes provided."}
                        </p>
                    </div>

                    {/* Main Form: Doctor's Input */}
                    <div className="consultation-main" style={{ padding: '2.5rem' }}>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                                    <FileText size={18} color="var(--primary)" /> Clinical Assessment & Diagnosis
                                </label>
                                <textarea
                                    required
                                    rows="4"
                                    value={consultation.diagnosis}
                                    onChange={e => setConsultation({ ...consultation, diagnosis: e.target.value })}
                                    placeholder="Enter structured diagnostic evaluation and findings..."
                                    style={{ background: 'var(--bg-card)' }}
                                ></textarea>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                                    <Pill size={18} color="var(--success)" /> Treatment & Prescriptions
                                </label>
                                <textarea
                                    rows="4"
                                    value={consultation.prescription}
                                    onChange={e => setConsultation({ ...consultation, prescription: e.target.value })}
                                    placeholder="Enter pharmacological instructions, dosage, and frequency..."
                                    style={{ background: 'var(--bg-card)' }}
                                ></textarea>
                            </div>

                            <div className="form-group" style={{ maxWidth: '250px' }}>
                                <label style={{ color: 'var(--text-main)' }}>Scheduled Follow-up</label>
                                <input
                                    type="date"
                                    value={consultation.follow_up_date}
                                    onChange={e => setConsultation({ ...consultation, follow_up_date: e.target.value })}
                                    style={{ background: 'var(--bg-card)' }}
                                />
                            </div>

                            <div className="consultation-btn-group" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>
                                    Suspend Session
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)' }}>
                                    {submitting ? 'Committing Record...' : 'Sign & Complete Consultation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VitalRow({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{value}</span>
        </div>
    );
}
