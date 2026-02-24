import { useState, useEffect } from 'react';
import { ClipboardList, Users, Pill, Activity, Clock, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { patientService } from '../services/patientService';

export default function NurseDashboard() {
    const navigate = useNavigate();
    const [triageQueue, setTriageQueue] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQueue = async () => {
            try {
                const data = await patientService.getTriageQueue();
                setTriageQueue(data || []);
            } catch (error) {
                console.error("Failed to load triage queue:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchQueue();

        // Polling for live updates (simulating real-time)
        const interval = setInterval(fetchQueue, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container animate-fade-in">
            <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                <ArrowLeft size={16} /> Back
            </button>
            <h1 style={{ marginBottom: '0.5rem' }}>Nurse's Station</h1>
            <p className="subtitle" style={{ marginBottom: '2rem' }}>Patient triage and ward management</p>

            <div className="grid-cards" style={{ marginBottom: '2rem' }}>
                <ActionCard
                    to="/patients"
                    icon={<ClipboardList size={28} />}
                    title="Patient Directory"
                    desc="Search entire hospital records."
                    color="#3b82f6"
                />
                <ActionCard
                    to="/medication"
                    icon={<Pill size={28} />}
                    title="Medication Log"
                    desc="Record administered treatments."
                    color="#10b981"
                />
                <ActionCard
                    to="/ward-status"
                    icon={<Activity size={28} />}
                    title="Ward Status"
                    desc="Update patient acuity and occupancy."
                    color="#8b5cf6"
                />
            </div>

            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '10px', borderRadius: '10px' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <h2 style={{ marginBottom: 0 }}>Live Triage Queue</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Patients waiting for initial assessment</p>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading queue...</div>
                ) : triageQueue.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                        <ClipboardList size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p>No patients are currently waiting for triage.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {triageQueue.map((appt) => (
                            <div key={appt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                                        {appt.patients?.first_name} {appt.patients?.last_name}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', marginTop: '4px' }}>
                                        <span>Gender: {appt.patients?.gender}</span>
                                        <span>Waiting since: {new Date(appt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                <Link to={`/triage?id=${appt.patient_id}&appt_id=${appt.id}`} className="btn btn-primary" style={{ padding: '8px 16px' }}>
                                    Start Triage
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionCard({ to, icon, title, desc, color }) {
    return (
        <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{
                height: '100%',
                borderLeft: `4px solid ${color}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                <div style={{ color: color, marginBottom: '0.5rem' }}>
                    {icon}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>{desc}</p>
            </div>
        </Link>
    );
}
