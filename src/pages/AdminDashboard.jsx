import { Users, Settings, Activity, ShieldCheck, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ staff: 0, patients: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { count: staffCount } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .neq('role', 'patient');

                const { count: patientCount } = await supabase
                    .from('patients')
                    .select('*', { count: 'exact', head: true });

                setStats({
                    staff: staffCount || 0,
                    patients: patientCount || 0
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="container animate-fade-in">
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '12px', borderRadius: '12px', color: 'white', boxShadow: 'var(--neon-glow)' }}>
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h1 style={{ marginBottom: 0 }}>Administrator Control Panel</h1>
                        <p className="subtitle" style={{ marginBottom: 0 }}>Overview and system management</p>
                    </div>
                </div>
            </div>

            <div className="grid-cards" style={{ marginBottom: '2rem' }}>
                <StatCard icon={<Users />} label="Total Staff Members" value={loading ? "..." : stats.staff.toString()} color="#3b82f6" />
                <StatCard icon={<Users />} label="Total Patients" value={loading ? "..." : stats.patients.toString()} color="#10b981" />
                <StatCard icon={<Settings />} label="System Uptime" value="99.9%" color="#f59e0b" />
            </div>

            <div className="grid-cards">
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '10px', borderRadius: '10px' }}>
                            <Settings size={24} />
                        </div>
                        <h2 style={{ marginBottom: 0 }}>User Management</h2>
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Create and manage access for Doctors, Nurses, and Receptionists across the entire hospital system.</p>
                    <Link
                        to="/manage-users"
                        className="btn btn-primary"
                        style={{ width: '100%', display: 'block', textAlign: 'center' }}
                    >
                        Manage System Users
                    </Link>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
                            <UserPlus size={24} />
                        </div>
                        <h2 style={{ marginBottom: 0 }}>Quick Registration</h2>
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>As an admin, you can bypass standard reception to directly register new patients into the database.</p>
                    <Link to="/add-patient" className="btn btn-outline" style={{ width: '100%' }}>Register Patient</Link>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: color, filter: 'blur(50px)', opacity: 0.15, borderRadius: '50%' }}></div>

            <div style={{ background: `${color}20`, color: color, padding: '16px', borderRadius: '12px', border: `1px solid ${color}30` }}>
                {icon}
            </div>
            <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500', fontFamily: "'Outfit', sans-serif" }}>{label}</p>
                <p style={{ fontSize: '2rem', fontWeight: '700', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', background: `linear-gradient(135deg, #fff, ${color})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{value}</p>
            </div>
        </div>
    );
}
