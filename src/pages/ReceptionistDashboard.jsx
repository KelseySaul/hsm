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
                    gradient="linear-gradient(135deg, var(--primary), var(--secondary))"
                />
                <MenuCard
                    to="/patients"
                    icon={<Search size={32} />}
                    label="Patient Directory"
                    desc="View, search and manage existing records."
                    gradient="linear-gradient(135deg, #3b82f6, #8b5cf6)"
                />
                <MenuCard
                    to="/appointments"
                    icon={<Calendar size={32} />}
                    label="Appointments"
                    desc="Book or reschedule future patient visits."
                    gradient="linear-gradient(135deg, #10b981, #059669)"
                />
                <MenuCard
                    to="/billing"
                    icon={<CreditCard size={32} />}
                    label="Billing & POS"
                    desc="Generate invoices and handle patient payments."
                    gradient="linear-gradient(135deg, #f59e0b, #d97706)"
                />
            </div>
        </div>
    );
}

function MenuCard({ to, icon, label, desc, gradient }) {
    return (
        <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card flex-center" style={{
                height: '100%',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                flexDirection: 'column',
                textAlign: 'center',
                padding: '2.5rem 1.5rem'
            }}
                onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.boxShadow = 'var(--neon-glow)';
                }}
                onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
                }}>
                <div style={{
                    background: gradient,
                    padding: '16px',
                    borderRadius: '20px',
                    color: 'white',
                    marginBottom: '1.5rem',
                    boxShadow: '0 8px 20px -5px rgba(0,0,0,0.3)'
                }}>
                    {icon}
                </div>
                <h3 style={{ marginBottom: '0.75rem', fontSize: '1.3rem' }}>{label}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{desc}</p>
            </div>
        </Link>
    );
}
