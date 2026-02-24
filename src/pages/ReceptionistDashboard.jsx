import { UserPlus, Calendar, CreditCard, Users, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReceptionistDashboard() {
    return (
        <div className="container animate-fade-in">
            <h1 style={{ marginBottom: '0.5rem' }}>Reception Desk</h1>
            <p className="subtitle" style={{ marginBottom: '2rem' }}>Patient registration and appointment management</p>

            <div className="grid-cards">
                <MenuCard
                    to="/add-patient"
                    icon={<UserPlus size={32} />}
                    label="New Registration"
                    desc="Register a new patient into the hospital system."
                    color="var(--primary)"
                />
                <MenuCard
                    to="/patients"
                    icon={<Search size={32} />}
                    label="Patient Directory"
                    desc="View, search and manage existing records."
                    color="#3b82f6"
                />
                <MenuCard
                    to="/appointments"
                    icon={<Calendar size={32} />}
                    label="Appointments"
                    desc="Book or reschedule future patient visits."
                    color="#10b981"
                />
                <MenuCard
                    to="/billing"
                    icon={<CreditCard size={32} />}
                    label="Billing & POS"
                    desc="Generate invoices and handle patient payments."
                    color="#f59e0b"
                />
            </div>
        </div>
    );
}

function MenuCard({ to, icon, label, desc, color }) {
    return (
        <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card flex-center" style={{
                height: '100%',
                flexDirection: 'column',
                textAlign: 'center',
                padding: '2.5rem 1.5rem',
                borderLeft: `4px solid ${color}`
            }}>
                <div style={{
                    background: `${color}15`,
                    padding: '20px',
                    borderRadius: 'var(--radius-sm)',
                    color: color,
                    marginBottom: '1.5rem'
                }}>
                    {icon}
                </div>
                <h3 style={{ marginBottom: '0.75rem', fontSize: '1.3rem' }}>{label}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{desc}</p>
            </div>
        </Link>
    );
}
