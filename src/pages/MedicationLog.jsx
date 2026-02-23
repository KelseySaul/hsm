import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, User, ArrowLeft, RefreshCw, ClipboardList, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export default function MedicationLog() {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    const fetchRecords = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: appts, error } = await supabase
                .from('appointments')
                .select('id, patient_id, status, reason, created_at')
                .eq('status', 'completed')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch patient details separately
            const patientIds = [...new Set((appts || []).map(a => a.patient_id).filter(Boolean))];
            let patientMap = {};
            if (patientIds.length > 0) {
                const { data: patients } = await supabase
                    .from('patients')
                    .select('id, first_name, last_name, gender, date_of_birth')
                    .in('id', patientIds);
                (patients || []).forEach(p => { patientMap[p.id] = p; });
            }

            // Parse prescribed meds from reason JSON
            const parsed = (appts || []).map(appt => {
                let payload = {};
                try { payload = JSON.parse(appt.reason || '{}'); } catch { }
                return { ...appt, patients: patientMap[appt.patient_id] || null, payload };
            }).filter(r => r.payload.prescription);

            setRecords(parsed);
        } catch (err) {
            console.error('Failed to load medication logs:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRecords(); }, []);

    const filtered = records.filter(r => {
        const name = `${r.patients?.first_name} ${r.patients?.last_name}`.toLowerCase();
        return name.includes(search.toLowerCase()) || r.payload.prescription?.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="container animate-fade-in">
            <button
                onClick={() => navigate('/')}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Medication Log</h1>
                    <p className="subtitle">Prescriptions administered from completed consultations</p>
                </div>
                <button onClick={fetchRecords} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    placeholder="Search by patient name or medication..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ maxWidth: '400px' }}
                />
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {loading ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={32} style={{ opacity: 0.4, marginBottom: '1rem' }} />
                    <p>Loading medication records...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p>{search ? 'No records match your search.' : 'No medication records available yet.'}</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Records appear here once a doctor completes a consultation with a prescription.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {filtered.map(record => (
                        <div key={record.id} className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ background: 'rgba(16,185,129,0.1)', padding: '8px', borderRadius: '8px', color: '#10b981' }}>
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '2px' }}>
                                            {record.patients?.first_name} {record.patients?.last_name}
                                        </p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                            {record.patients?.gender}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <Calendar size={14} />
                                    {new Date(record.created_at).toLocaleDateString([], { dateStyle: 'medium' })}
                                </div>
                            </div>

                            {record.payload.diagnosis && (
                                <div style={{ background: 'var(--bg-main)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem', borderLeft: '3px solid var(--primary)', fontSize: '0.9rem' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Diagnosis</span>
                                    <p style={{ margin: '4px 0 0', color: 'var(--text-main)' }}>{record.payload.diagnosis}</p>
                                </div>
                            )}

                            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <Pill size={18} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                                <div>
                                    <span style={{ fontWeight: '600', color: '#10b981', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prescription</span>
                                    <p style={{ margin: '4px 0 0', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>{record.payload.prescription}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
