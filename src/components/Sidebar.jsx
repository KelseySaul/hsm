import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, UserPlus, Users, ClipboardList, Stethoscope, ShieldCheck, CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Sidebar({ collapsed, setCollapsed }) {
    const { profile, loading } = useAuth();
    const location = useLocation();
    const role = loading ? null : (profile?.role ?? null);

    const navLinks = [
        { to: "/admin", icon: <ShieldCheck size={20} />, label: "Health Administration", roles: ['admin'] },
        { to: "/add-patient", icon: <UserPlus size={20} />, label: "Patient Registration", roles: ['admin', 'receptionist'] },
        { to: "/appointments", icon: <CalendarPlus size={20} />, label: "Scheduling Board", roles: ['admin', 'receptionist'] },
        { to: "/triage", icon: <ClipboardList size={20} />, label: "Nursing Triage", roles: ['admin', 'nurse'] },
        { to: "/consultation", icon: <Stethoscope size={20} />, label: "Clinical Consult", roles: ['admin', 'doctor'] },
        { to: "/patients", icon: <Users size={20} />, label: "Patient Directory", roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
        { to: "/patient-portal", icon: <Activity size={20} />, label: "Patient Portal", roles: ['patient'] },
    ];

    const filteredLinks = navLinks.filter(link => link.roles.includes(role));

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div style={{
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                borderBottom: '1px solid var(--border)',
                height: 'var(--header-height)'
            }}>
                {!collapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            background: 'var(--primary)',
                            padding: '6px',
                            borderRadius: '8px',
                            display: 'flex',
                            color: 'white'
                        }}>
                            <Activity size={18} />
                        </div>
                        <span style={{ fontWeight: '700', fontSize: '1rem', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Protocol HMS</span>
                    </div>
                )}
                {collapsed && (
                    <div style={{ color: 'var(--primary)' }}>
                        <Activity size={24} />
                    </div>
                )}
            </div>

            <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
                {filteredLinks.map(link => {
                    const isActive = location.pathname === link.to;
                    return (
                        <Link
                            key={link.to}
                            to={link.to}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '0.875rem',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                color: isActive ? 'white' : 'var(--text-muted)',
                                background: isActive ? 'var(--primary)' : 'transparent',
                                transition: 'var(--transition)',
                                justifyContent: collapsed ? 'center' : 'flex-start'
                            }}
                            title={collapsed ? link.label : ''}
                        >
                            <div style={{ flexShrink: 0 }}>{link.icon}</div>
                            {!collapsed && <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{link.label}</span>}
                        </Link>
                    );
                })}
            </div>

            <button
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    margin: '1rem',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition)'
                }}
            >
                {collapsed ? <ChevronRight size={18} /> : <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ChevronLeft size={18} /> <span style={{ fontSize: '0.8rem' }}>Collapse</span></div>}
            </button>
        </aside>
    );
}
