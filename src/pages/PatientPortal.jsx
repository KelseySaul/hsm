import { useState, useEffect } from 'react';
import {
    Calendar, Clock, FileText, HeartPulse, User, CheckCircle, AlertCircle,
    RefreshCw, PlusCircle, ChevronDown, ChevronUp, Pill, ShieldCheck
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function PatientPortal() {
    const { user, profile } = useAuth();

    // Linked patients record
    const [patient, setPatient] = useState(null);
    const [loadingPatient, setLoadingPatient] = useState(true);

    // Appointment booking form
    const [form, setForm] = useState({
        reason: '', preferred_date: '', preferred_time: '', notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Appointment requests submitted via the portal
    const [myRequests, setMyRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);

    // Medical history: completed appointments for this patient
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    /* ── Fetch linked patients record ───────────── */
    const fetchPatient = async () => {
        setLoadingPatient(true);
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
            if (!error) setPatient(data || null);
        } catch (err) {
            console.error('fetchPatient error:', err);
        } finally {
            setLoadingPatient(false);
        }
    };

    /* ── Fetch appointment requests submitted via portal ── */
    const fetchMyRequests = async () => {
        setLoadingRequests(true);
        try {
            const { data, error } = await supabase
                .from('appointment_requests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (!error) setMyRequests(data || []);
        } finally {
            setLoadingRequests(false);
        }
    };

    /* ── Fetch medical history (completed appointments) ── */
    const fetchHistory = async (patientId) => {
        setLoadingHistory(true);
        try {
            const { data: appts, error } = await supabase
                .from('appointments')
                .select('id, patient_id, status, reason, created_at, doctor_id')
                .eq('patient_id', patientId)
                .eq('status', 'completed')
                .order('created_at', { ascending: false });
            if (error) throw error;

            // Fetch attending doctor names
            const doctorIds = [...new Set((appts || []).map(a => a.doctor_id).filter(Boolean))];
            let doctorMap = {};
            if (doctorIds.length > 0) {
                const { data: docs } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', doctorIds);
                (docs || []).forEach(d => { doctorMap[d.id] = d.full_name; });
            }

            const parsed = (appts || []).map(appt => {
                let payload = {};
                try { payload = JSON.parse(appt.reason || '{}'); } catch { }
                return {
                    ...appt,
                    payload,
                    doctorName: doctorMap[appt.doctor_id] || 'Attending Physician',
                };
            }).filter(a => a.payload.diagnosis || a.payload.prescription);

            setHistory(parsed);
        } catch (err) {
            console.error('fetchHistory error:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchPatient();
            fetchMyRequests();
        }
    }, [user]);

    // Once we have the patient record, load their medical history
    useEffect(() => {
        if (patient?.id) {
            fetchHistory(patient.id);
        } else if (!loadingPatient) {
            setLoadingHistory(false);
        }
    }, [patient, loadingPatient]);

    /* ── Submit appointment request ─────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(false);
        try {
            const nameParts = (profile?.full_name || '').split(' ');
            const { error } = await supabase
                .from('appointment_requests')
                .insert([{
                    user_id: user.id,
                    first_name: nameParts[0] || '',
                    last_name: nameParts.slice(1).join(' ') || '',
                    email: user.email,
                    reason: form.reason,
                    preferred_date: form.preferred_date,
                    preferred_time: form.preferred_time || null,
                    notes: form.notes || null,
                    status: 'pending',
                }]);
            if (error) throw error;
            setSubmitSuccess(true);
            setForm({ reason: '', preferred_date: '', preferred_time: '', notes: '' });
            fetchMyRequests();
        } catch (err) {
            setSubmitError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '⏳ Pending' },
            scheduled: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: '📅 Scheduled' },
            completed: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: '✅ Completed' },
            cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: '❌ Cancelled' },
        };
        return map[status] || { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', label: status };
    };

    const inputStyle = {
        width: '100%', padding: '0.75rem 1rem',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', color: 'var(--text-main)',
        fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
    };
    const labelStyle = {
        display: 'block', marginBottom: '0.4rem', fontSize: '0.82rem',
        fontWeight: '600', color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
    };

    /* ─────────────────── RENDER ─────────────────── */
    return (
        <div className="container animate-fade-in" style={{ maxWidth: '980px' }}>
            <style>{`
                @media (max-width: 600px) {
                   .portal-header { padding: 1.5rem !important; }
                   .header-content { flex-direction: column; align-items: flex-start !important; text-align: left; }
                }
            `}</style>

            {/* ── Header / Profile Banner ── */}
            <div className="glass-panel portal-header" style={{
                padding: '2rem 2.5rem', marginBottom: '2rem',
                display: 'flex', alignItems: 'center', gap: '1.5rem',
                position: 'relative', overflow: 'hidden', flexWrap: 'wrap'
            }}>
                <div style={{ position: 'absolute', right: '-40px', top: '-40px', background: 'var(--primary)', opacity: 0.08, width: '200px', height: '200px', filter: 'blur(60px)', borderRadius: '50%' }} />
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-light), var(--bg-surface))', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', boxShadow: 'var(--neon-glow)', flexShrink: 0, zIndex: 1 }}>
                    <User size={36} />
                </div>
                <div style={{ flex: '1 1 300px', zIndex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: '1.9rem' }}>
                        My <span className="text-gradient">Patient Portal</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
                        Welcome, <strong style={{ color: 'var(--text-main)' }}>{profile?.full_name || user?.email}</strong>
                    </p>
                </div>

                {/* Personal details chip */}
                {patient && (
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', zIndex: 1, minWidth: 'fit-content' }}>
                        {[
                            { label: 'Date of Birth', value: patient.date_of_birth ? new Date(patient.date_of_birth + 'T00:00:00').toLocaleDateString([], { dateStyle: 'medium' }) : '—' },
                            { label: 'Gender', value: patient.gender || '—' },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ textAlign: 'left' }}>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
                                <p style={{ fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>{value}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Appointment Request Form ── */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(79,70,229,0.1)', padding: '10px', borderRadius: '10px', color: 'var(--primary)', flexShrink: 0 }}>
                        <PlusCircle size={22} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Request an Appointment</h2>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fill in your reason and preferred date — our team will confirm your slot.</p>
                    </div>
                </div>

                {submitSuccess && (
                    <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
                        <CheckCircle size={20} /> Request submitted! We'll confirm your slot soon.
                    </div>
                )}
                {submitError && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                        <AlertCircle size={20} /> {submitError}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Reason for Visit *</label>
                        <select style={inputStyle} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} required>
                            <option value="">— Select a reason —</option>
                            <option>General Check-up</option>
                            <option>Follow-up Consultation</option>
                            <option>Prescription Renewal</option>
                            <option>Lab Results Review</option>
                            <option>Specialist Referral</option>
                            <option>Urgent / Sick Visit</option>
                            <option>Other</option>
                        </select>
                    </div>

                    <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Preferred Date *</label>
                            <input style={inputStyle} type="date" value={form.preferred_date} onChange={e => setForm(p => ({ ...p, preferred_date: e.target.value }))} required min={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div>
                            <label style={labelStyle}>Preferred Time</label>
                            <select style={inputStyle} value={form.preferred_time} onChange={e => setForm(p => ({ ...p, preferred_time: e.target.value }))}>
                                <option value="">— Any time —</option>
                                <option>Morning (8am–12pm)</option>
                                <option>Afternoon (12pm–4pm)</option>
                                <option>Evening (4pm–7pm)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={labelStyle}>Additional Notes</label>
                        <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Symptoms, allergies, or anything you'd like the doctor to know..." />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', width: 'fit-content', minWidth: '200px' }} disabled={submitting}>
                        {submitting ? <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</> : <><Calendar size={18} /> Request Appointment</>}
                    </button>
                    <style>{`
                      @media (max-width: 480px) {
                        button[type="submit"] { width: 100% !important; }
                      }
                    `}</style>
                </form>
            </div>

            {/* ── My Appointment Requests ── */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'rgba(59,130,246,0.1)', padding: '10px', borderRadius: '10px', color: '#3b82f6' }}><Clock size={20} /></div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>My Appointment Requests</h2>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Track status of your bookings</p>
                        </div>
                    </div>
                    <button onClick={fetchMyRequests} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.875rem', fontSize: '0.85rem' }}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                {loadingRequests ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading requests...</div>
                ) : myRequests.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                        <Calendar size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                        <p>No requests yet. Use the form above to book an appointment.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.6rem' }}>
                        {myRequests.map(req => {
                            const badge = getStatusBadge(req.status);
                            return (
                                <div key={req.id} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div>
                                        <p style={{ fontWeight: '600', margin: 0, marginBottom: '2px' }}>{req.reason || 'Visit'}</p>
                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                                            Preferred: {req.preferred_date ? new Date(req.preferred_date + 'T00:00:00').toLocaleDateString([], { dateStyle: 'medium' }) : '—'}
                                            {req.preferred_time ? ` · ${req.preferred_time}` : ''}
                                            {req.scheduled_date ? ` · ✅ Confirmed: ${new Date(req.scheduled_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
                                        </p>
                                    </div>
                                    <span style={{ background: badge.bg, color: badge.color, padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                        {badge.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Medical History ── */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: 'rgba(16,185,129,0.1)', padding: '10px', borderRadius: '10px', color: '#10b981' }}><HeartPulse size={20} /></div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Medical History</h2>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Your past consultations from completed visits</p>
                    </div>
                </div>

                {loadingPatient || loadingHistory ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading medical history...</div>
                ) : !patient ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                        <ShieldCheck size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                        <p style={{ marginBottom: '0.5rem' }}>No clinical record linked to your account yet.</p>
                        <p style={{ fontSize: '0.85rem' }}>Once a receptionist checks you in and a doctor completes your visit, your history will appear here.</p>
                    </div>
                ) : history.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                        <FileText size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                        <p>No completed consultations on record yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {history.map(record => {
                            const isOpen = expandedId === record.id;
                            const date = new Date(record.created_at).toLocaleDateString([], { dateStyle: 'long' });
                            return (
                                <div key={record.id} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                    <button
                                        onClick={() => setExpandedId(isOpen ? null : record.id)}
                                        style={{ width: '100%', padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', color: 'var(--text-main)' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ background: 'rgba(79,70,229,0.1)', padding: '8px', borderRadius: '8px', color: 'var(--primary)' }}><FileText size={16} /></div>
                                            <div>
                                                <p style={{ fontWeight: '600', margin: 0 }}>{record.payload.diagnosis || 'Consultation'}</p>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                                    {date} · Dr. {record.doctorName}
                                                </p>
                                            </div>
                                        </div>
                                        {isOpen ? <ChevronUp size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                                    </button>

                                    {isOpen && (
                                        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border)' }}>
                                            {record.payload.vitals && Object.keys(record.payload.vitals).some(k => record.payload.vitals[k]) && (
                                                <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {Object.entries(record.payload.vitals).filter(([, v]) => v).map(([k, v]) => (
                                                        <span key={k} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '999px', padding: '3px 10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                            {k.replace(/_/g, ' ')}: <strong style={{ color: 'var(--text-main)' }}>{v}</strong>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {record.payload.prescription && (
                                                <div style={{ marginTop: '1rem', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '0.875rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                                    <Pill size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                    <div>
                                                        <p style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981', margin: 0, marginBottom: '4px' }}>Prescription</p>
                                                        <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.6 }}>{record.payload.prescription}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {record.payload.notes && (
                                                <div style={{ marginTop: '0.75rem' }}>
                                                    <p style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Nurse's Notes</p>
                                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{record.payload.notes}</p>
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
        </div>
    );
}
