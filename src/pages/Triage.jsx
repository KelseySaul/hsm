import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { patientService } from '../services/patientService';
import { ClipboardList, User, Activity, ArrowLeft } from 'lucide-react';

export default function Triage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const patientId = searchParams.get('id');
    const appointmentId = searchParams.get('appt_id'); // Passed from Nurse Dashboard

    const [vitals, setVitals] = useState({
        temperature: '',
        blood_pressure: '',
        heart_rate: '',
        respiratory_rate: '',
        weight: '',
        height: '',
        oxygen_saturation: '',
        notes: ''
    });
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (patientId) {
            // Fetch real name for the header via the service (we can reuse getPatients logic if we had a getPatientById)
            // For now, simpler fetch directly:
            const fetchPatientName = async () => {
                const { supabase } = await import('../services/supabaseClient');
                const { data } = await supabase.from('patients').select('first_name, last_name').eq('id', patientId).single();
                if (data) {
                    setPatient({ id: patientId, name: `${data.first_name} ${data.last_name}` });
                }
            };
            fetchPatientName();
        }
    }, [patientId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!appointmentId) {
            alert("Error: Missing Appointment/Queue ID. Cannot submit vitals.");
            return;
        }

        setLoading(true);
        try {
            await patientService.submitTriage(appointmentId, vitals, vitals.notes);
            alert('Clinical vitals recorded successfully! Patient forwarded to Doctor Queue.');
            navigate('/'); // Navigate back to dashboard instead of full list
        } catch (error) {
            console.error("Error submitting triage:", error);
            alert("Failed to submit vitals: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container animate-fade-in">
            <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                <ArrowLeft size={16} /> Back
            </button>
            <div className="glass-panel" style={{ maxWidth: '850px', margin: '0 auto', padding: 'var(--mobile-pad-lg, 2.5rem)' }}>
                <style>{`
                    @media (max-width: 600px) {
                        .glass-panel { padding: 1.25rem !important; }
                        .flex-between { flex-direction: column; align-items: flex-start !important; }
                        .btn-group { flex-direction: column; width: 100%; }
                        .btn-group button { width: 100% !important; }
                    }
                `}</style>
                <div className="flex-between" style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '14px', borderRadius: '14px', color: 'white', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}>
                            <Activity size={32} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0 }}>Clinical Triage</h2>
                            <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>Capture baseline vitals for consultation.</p>
                        </div>
                    </div>
                    {patient && (
                        <div style={{ background: 'var(--bg-card)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <User size={18} color="var(--primary)" />
                            <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{patient.name}</span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Core Temperature (°C)</label>
                            <input type="number" step="0.1" value={vitals.temperature} onChange={e => setVitals({ ...vitals, temperature: e.target.value })} placeholder="36.5" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Blood Pressure (mmHg)</label>
                            <input type="text" value={vitals.blood_pressure} onChange={e => setVitals({ ...vitals, blood_pressure: e.target.value })} placeholder="120/80" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Heart Rate (BPM)</label>
                            <input type="number" value={vitals.heart_rate} onChange={e => setVitals({ ...vitals, heart_rate: e.target.value })} placeholder="72" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>SpO2 Level (%)</label>
                            <input type="number" value={vitals.oxygen_saturation} onChange={e => setVitals({ ...vitals, oxygen_saturation: e.target.value })} placeholder="98" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Body Weight (kg)</label>
                            <input type="number" step="0.1" value={vitals.weight} onChange={e => setVitals({ ...vitals, weight: e.target.value })} placeholder="70.5" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Respiratory Rate</label>
                            <input type="number" value={vitals.respiratory_rate} onChange={e => setVitals({ ...vitals, respiratory_rate: e.target.value })} placeholder="16" />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '2rem' }}>
                        <label>Initial Clinical Observations</label>
                        <textarea
                            rows="4"
                            value={vitals.notes}
                            onChange={e => setVitals({ ...vitals, notes: e.target.value })}
                            placeholder="Document any acute symptoms, patient complaints, or visible distress..."
                        ></textarea>
                    </div>

                    <div className="btn-group" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                        <button type="button" className="btn btn-outline" onClick={() => navigate('/patients')}>
                            Void Entry
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}>
                            {loading ? 'Submitting to EMR...' : 'Commit Vitals Protocol'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
