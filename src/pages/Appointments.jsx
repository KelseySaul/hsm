import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, ArrowLeft, RefreshCw, AlertCircle, CheckCircle, XCircle, Inbox } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export default function Appointments() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'scheduled'

    // Patient appointment requests
    const [requests, setRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [requestError, setRequestError] = useState(null);

    // Scheduled/confirmed appointments (existing table)
    const [appointments, setAppointments] = useState([]);
    const [loadingAppts, setLoadingAppts] = useState(true);
    const [apptError, setApptError] = useState(null);

    // Schedule modal state
    const [scheduling, setScheduling] = useState(null); // the request being scheduled
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('09:00');
    const [scheduleLoading, setScheduleLoading] = useState(false);

    const fetchRequests = async () => {
        setLoadingRequests(true);
        setRequestError(null);
        try {
            const { data, error } = await supabase
                .from('appointment_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            setRequestError(err.message);
        } finally {
            setLoadingRequests(false);
        }
    };

    const fetchAppointments = async () => {
        setLoadingAppts(true);
        setApptError(null);
        try {
            const { data: appts, error } = await supabase
                .from('appointments')
                .select('id, patient_id, status, reason, created_at, doctor_id, appointment_date')
                .order('created_at', { ascending: false });
            if (error) throw error;

            // Fetch patient names separately
            const patientIds = [...new Set((appts || []).map(a => a.patient_id).filter(Boolean))];
            let patientMap = {};
            if (patientIds.length > 0) {
                const { data: patients } = await supabase
                    .from('patients')
                    .select('id, first_name, last_name, gender, date_of_birth')
                    .in('id', patientIds);
                (patients || []).forEach(p => { patientMap[p.id] = p; });
            }

            setAppointments((appts || []).map(a => ({ ...a, patients: patientMap[a.patient_id] || null })));
        } catch (err) {
            setApptError(err.message);
        } finally {
            setLoadingAppts(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        fetchAppointments();
    }, []);

    const handleSchedule = async (req) => {
        if (!scheduledDate) return;
        setScheduleLoading(true);
        try {
            const dateTimeStr = `${scheduledDate}T${scheduledTime}:00`;

            // 1. Update request status
            const { error: reqErr } = await supabase
                .from('appointment_requests')
                .update({ status: 'scheduled', scheduled_date: dateTimeStr })
                .eq('id', req.id);
            if (reqErr) throw reqErr;

            // 2. Sync to live appointments table
            // First, find or create the patient record linked to this user
            let patientId = null;
            if (req.user_id) {
                const { data: pData } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('user_id', req.user_id)
                    .maybeSingle();

                if (pData) {
                    patientId = pData.id;
                } else {
                    // Create minimal patient record if not exists
                    const { data: newP, error: pErr } = await supabase
                        .from('patients')
                        .insert([{
                            first_name: req.first_name,
                            last_name: req.last_name,
                            user_id: req.user_id,
                            gender: 'Male' // Default
                        }])
                        .select()
                        .single();
                    if (!pErr) patientId = newP.id;
                }
            }

            if (patientId) {
                const { error: apptErr } = await supabase
                    .from('appointments')
                    .insert([{
                        patient_id: patientId,
                        status: 'scheduled',
                        appointment_date: dateTimeStr,
                        reason: JSON.stringify({
                            state: 'confirmed',
                            symptoms: req.reason + (req.notes ? ` - ${req.notes}` : '')
                        })
                    }]);
                if (apptErr) console.warn('Sync to appointments failed:', apptErr.message);
            }

            setScheduling(null);
            setScheduledDate('');
            setScheduledTime('09:00');
            fetchRequests();
            fetchAppointments();
        } catch (err) {
            alert('Failed to schedule: ' + err.message);
        } finally {
            setScheduleLoading(false);
        }
    };

    const handleCancel = async (req) => {
        if (!window.confirm(`Cancel appointment request from ${req.first_name} ${req.last_name}?`)) return;
        await supabase.from('appointment_requests').update({ status: 'cancelled' }).eq('id', req.id);
        fetchRequests();
    };

    const handleCheckIn = async (appt) => {
        try {
            let payload = {};
            try { payload = JSON.parse(appt.reason || '{}'); } catch { }
            payload.state = 'waiting_for_triage';

            const { error } = await supabase
                .from('appointments')
                .update({ reason: JSON.stringify(payload) })
                .eq('id', appt.id);

            if (error) throw error;
            alert('Patient successfully checked in and added to triage queue.');
            fetchAppointments();
        } catch (err) {
            alert('Failed to check in: ' + err.message);
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

    const getApptStatusStyle = (status) => {
        const map = {
            scheduled: { background: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Scheduled' },
            completed: { background: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Completed' },
            cancelled: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Cancelled' },
        };
        return map[status] || { background: 'rgba(156,163,175,0.15)', color: '#9ca3af', label: status };
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    const tabStyle = (active) => ({
        padding: '0.6rem 1.25rem',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.9rem',
        transition: 'all 0.2s',
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? 'white' : 'var(--text-muted)',
    });

    const inputStyle = {
        padding: '0.6rem 0.875rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-main)',
        fontSize: '0.9rem',
        outline: 'none',
    };

    return (
        <div className="container animate-fade-in">
            <button
                onClick={() => navigate('/')}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Appointments</h1>
                    <p className="subtitle">Manage patient appointment requests and scheduled visits</p>
                </div>
                <button onClick={() => { fetchRequests(); fetchAppointments(); }} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', width: 'fit-content' }}>
                <button style={tabStyle(activeTab === 'requests')} onClick={() => setActiveTab('requests')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Inbox size={16} />
                        Patient Requests
                        {pendingCount > 0 && (
                            <span style={{ background: '#f59e0b', color: 'white', borderRadius: '999px', padding: '1px 7px', fontSize: '0.75rem', marginLeft: '2px' }}>
                                {pendingCount}
                            </span>
                        )}
                    </span>
                </button>
                <button style={tabStyle(activeTab === 'scheduled')} onClick={() => setActiveTab('scheduled')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={16} /> All Appointments
                    </span>
                </button>
            </div>

            {/* ─── Patient Requests Tab ─── */}
            {activeTab === 'requests' && (
                <>
                    {requestError && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                            <AlertCircle size={20} /> {requestError}
                        </div>
                    )}

                    {loadingRequests ? (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <RefreshCw size={32} style={{ opacity: 0.4, marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
                            <p>Loading requests...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Inbox size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>No appointment requests yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {requests.map(req => {
                                const badge = getStatusBadge(req.status);
                                const isSchedulingThis = scheduling?.id === req.id;
                                return (
                                    <div key={req.id} className="card" style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ background: 'rgba(79,70,229,0.1)', padding: '10px', borderRadius: '10px', color: 'var(--primary)', flexShrink: 0 }}>
                                                    <User size={22} />
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '2px', color: 'var(--text-main)' }}>
                                                        {req.first_name} {req.last_name}
                                                    </p>
                                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 2px' }}>
                                                        {req.email}{req.phone ? ` · ${req.phone}` : ''}
                                                    </p>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0 }}>
                                                        <strong>Reason:</strong> {req.reason || '—'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                                                <span style={{ background: badge.bg, color: badge.color, padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600' }}>
                                                    {badge.label}
                                                </span>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                    <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                    Preferred: {req.preferred_date ? new Date(req.preferred_date + 'T00:00:00').toLocaleDateString([], { dateStyle: 'medium' }) : '—'}
                                                    {req.preferred_time ? ` · ${req.preferred_time}` : ''}
                                                </span>
                                                {req.scheduled_date && (
                                                    <span style={{ fontSize: '0.78rem', color: '#3b82f6' }}>
                                                        <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                        Scheduled: {new Date(req.scheduled_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {req.notes && (
                                            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '0.6rem 0.875rem', borderRadius: '8px', borderLeft: '3px solid var(--border)' }}>
                                                <strong>Notes:</strong> {req.notes}
                                            </p>
                                        )}

                                        {/* Schedule inline form */}
                                        {isSchedulingThis && (
                                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Confirmed Date</label>
                                                    <input
                                                        type="date" style={inputStyle}
                                                        value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                                                        min={new Date().toISOString().split('T')[0]}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Time</label>
                                                    <input type="time" style={inputStyle} value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.1rem' }}>
                                                    <button
                                                        onClick={() => handleSchedule(req)}
                                                        disabled={!scheduledDate || scheduleLoading}
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.55rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                    >
                                                        <CheckCircle size={16} /> Confirm
                                                    </button>
                                                    <button onClick={() => setScheduling(null)} className="btn btn-outline" style={{ padding: '0.55rem 0.875rem', fontSize: '0.875rem' }}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        {req.status === 'pending' && !isSchedulingThis && (
                                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                                                <button
                                                    onClick={() => { setScheduling(req); setScheduledDate(req.preferred_date || ''); }}
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                >
                                                    <Calendar size={16} /> Schedule
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(req)}
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.5rem 0.875rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                                                >
                                                    <XCircle size={16} /> Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ─── All Appointments Tab ─── */}
            {activeTab === 'scheduled' && (
                <>
                    {apptError && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                            <AlertCircle size={20} /> {apptError}
                        </div>
                    )}

                    {loadingAppts ? (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <RefreshCw size={32} style={{ opacity: 0.4, marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
                            <p>Loading appointments...</p>
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>No appointments found.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {appointments.map((appt) => {
                                const statusStyle = getApptStatusStyle(appt.status);
                                const patient = appt.patients;
                                const apptDate = appt.appointment_date
                                    ? new Date(appt.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                                    : '—';
                                return (
                                    <div key={appt.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ background: 'rgba(79,70,229,0.1)', padding: '10px', borderRadius: '10px', color: 'var(--primary)' }}>
                                                <User size={22} />
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: '600', fontSize: '1.05rem', marginBottom: '2px', color: 'var(--text-main)' }}>
                                                    {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                                                </p>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                                                    {patient?.gender}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                <Clock size={14} /> {apptDate}
                                            </div>
                                            <span style={{ ...statusStyle, padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600' }}>
                                                {statusStyle.label}
                                            </span>
                                            {appt.status === 'scheduled' && !appt.reason?.includes('"state":"waiting_for_triage"') && (
                                                <button
                                                    onClick={() => handleCheckIn(appt)}
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                                >
                                                    Check-in
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
