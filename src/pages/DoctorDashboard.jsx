import { useState, useEffect } from 'react';
import { Calendar, Users, FileText, ClipboardList, Clock, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { patientService } from '../services/patientService';

export default function DoctorDashboard() {
    const navigate = useNavigate();
    const [doctorQueue, setDoctorQueue] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQueue = async () => {
            try {
                const data = await patientService.getDoctorQueue();
                setDoctorQueue(data || []);
            } catch (error) {
                console.error("Failed to load doctor queue:", error);
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
            <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: 0 }}>Doctor's Workspace</h1>
                    <p className="subtitle" style={{ marginBottom: 0 }}>Review schedule and consult your patients</p>
                </div>

                <div className="status-badge status-warning" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Calendar size={18} />
                    <span>Clinical Schedule</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--secondary)', padding: '10px', borderRadius: '10px' }}>
                            <Clock size={24} />
                        </div>
                        <h2 style={{ marginBottom: 0 }}>Today's Patient Queue</h2>
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Patients triaged by nursing staff waiting for consultation.</p>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                        {loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading queue...</div>
                        ) : doctorQueue.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No patients are currently waiting for a doctor.
                            </div>
                        ) : (
                            doctorQueue.map((appt) => (
                                <PatientRow
                                    key={appt.id}
                                    appt={appt}
                                />
                            ))
                        )}
                    </div>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '10px', borderRadius: '10px' }}>
                            <FileText size={24} />
                        </div>
                        <h2 style={{ marginBottom: 0 }}>Quick Actions</h2>
                    </div>
                    <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
                        <Link to="/patients" className="btn btn-primary" style={{ textAlign: 'left', display: 'flex', gap: '0.8rem', justifyContent: 'flex-start' }}>
                            <Users size={20} /> Search Patient Directory
                        </Link>
                        <Link to="/patients" className="btn btn-outline" style={{ textAlign: 'left', display: 'flex', gap: '0.8rem', justifyContent: 'flex-start' }}>
                            <FileText size={20} /> View Clinical Records
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PatientRow({ appt }) {
    const timeWaited = new Date(appt.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--border)', alignItems: 'center', transition: 'background-color 0.2s' }}>
            <div>
                <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1.05rem', fontFamily: "'Outfit', sans-serif" }}>
                    {appt.patients?.first_name} {appt.patients?.last_name}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <Calendar size={14} /> Triaged at: {timeWaited}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="status-badge status-success">Ready</span>
                <Link to={`/consultation?id=${appt.patient_id}&appt_id=${appt.id}`} className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>Consult</Link>
            </div>
        </div>
    );
}
