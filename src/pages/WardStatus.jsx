import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, User, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Clock, Stethoscope } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const WARD_STATES = {
    waiting_for_triage: {
        label: 'Awaiting Triage',
        icon: <Clock size={16} />,
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.12)',
        border: 'rgba(245,158,11,0.3)',
    },
    waiting_for_doctor: {
        label: 'With Doctor',
        icon: <Stethoscope size={16} />,
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.12)',
        border: 'rgba(59,130,246,0.3)',
    },
    completed: {
        label: 'Cleared',
        icon: <CheckCircle2 size={16} />,
        color: '#10b981',
        bg: 'rgba(16,185,129,0.12)',
        border: 'rgba(16,185,129,0.3)',
    },
};

export default function WardStatus() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchWard = async () => {
        setLoading(true);
        setError(null);
        try {
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: appts, error } = await supabase
                .from('appointments')
                .select('id, patient_id, status, reason, created_at')
                .gte('created_at', since)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Fetch patient details separately
            const patientIds = [...new Set((appts || []).map(a => a.patient_id).filter(Boolean))];
            let patientMap = {};
            if (patientIds.length > 0) {
                const { data: patients } = await supabase
                    .from('patients')
                    .select('id, first_name, last_name, gender')
                    .in('id', patientIds);
                (patients || []).forEach(p => { patientMap[p.id] = p; });
            }

            const parsed = (appts || []).map(appt => {
                let state = 'waiting_for_triage';
                try {
                    const p = JSON.parse(appt.reason || '{}');
                    state = appt.status === 'completed' ? 'completed' : (p.state || 'waiting_for_triage');
                } catch { }
                return { ...appt, patients: patientMap[appt.patient_id] || null, wardState: state };
            });

            setPatients(parsed);
        } catch (err) {
            console.error('Failed to load ward status:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWard();
        const interval = setInterval(fetchWard, 30000);
        return () => clearInterval(interval);
    }, []);

    const grouped = {
        waiting_for_triage: patients.filter(p => p.wardState === 'waiting_for_triage'),
        waiting_for_doctor: patients.filter(p => p.wardState === 'waiting_for_doctor'),
        completed: patients.filter(p => p.wardState === 'completed'),
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
                    <h1 style={{ marginBottom: '0.25rem' }}>Ward Status</h1>
                    <p className="subtitle">Live patient flow — last 24 hours · auto-refreshes every 30s</p>
                </div>
                <button onClick={fetchWard} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid-cards" style={{ marginBottom: '2rem' }}>
                {Object.entries(WARD_STATES).map(([key, cfg]) => (
                    <div key={key} className="card" style={{ textAlign: 'center', padding: '1.5rem', borderTop: `3px solid ${cfg.color}` }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: '700', color: cfg.color, lineHeight: 1 }}>
                            {grouped[key]?.length ?? 0}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{cfg.label}</div>
                    </div>
                ))}
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {loading ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Activity size={32} style={{ opacity: 0.4, marginBottom: '1rem' }} />
                    <p>Loading ward data...</p>
                </div>
            ) : patients.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Activity size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p>No patient activity in the last 24 hours.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {Object.entries(WARD_STATES).map(([key, cfg]) => (
                        grouped[key].length > 0 && (
                            <div key={key}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: cfg.color, marginBottom: '0.75rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {cfg.icon} {cfg.label} <span style={{ fontWeight: '400', color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 'normal' }}>({grouped[key].length})</span>
                                </h3>
                                <div style={{ display: 'grid', gap: '0.6rem' }}>
                                    {grouped[key].map(appt => (
                                        <div key={appt.id} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 'var(--radius)', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <User size={18} color={cfg.color} />
                                                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                                    {appt.patients?.first_name} {appt.patients?.last_name}
                                                </span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                    · {appt.patients?.gender}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {new Date(appt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}
        </div>
    );
}
