import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, LogOut, UserPlus, Users, ClipboardList, Stethoscope, ShieldCheck, CalendarPlus, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = loading ? null : (profile?.role ?? null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/login';
    }
  };

  const navLinks = [
    { to: "/admin", icon: <ShieldCheck size={18} />, label: "Admin", roles: ['admin'] },
    { to: "/add-patient", icon: <UserPlus size={18} />, label: "Register", roles: ['admin', 'receptionist'] },
    { to: "/appointments", icon: <CalendarPlus size={18} />, label: "Appointments", roles: ['admin', 'receptionist'] },
    { to: "/triage", icon: <ClipboardList size={18} />, label: "Triage", roles: ['admin', 'nurse'] },
    { to: "/consultation", icon: <Stethoscope size={18} />, label: "Consult", roles: ['admin', 'doctor'] },
    { to: "/patients", icon: <Users size={18} />, label: "Directory", roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
    { to: "/patient-portal", icon: <CalendarPlus size={18} />, label: "My Portal", roles: ['patient'] },
  ];

  const filteredLinks = navLinks.filter(link => link.roles.includes(role));

  return (
    <>
      <nav className="glass-panel" style={{
        margin: '1rem auto',
        maxWidth: '1280px',
        borderRadius: 'var(--radius)',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: '1rem',
        zIndex: 1000,
        width: 'calc(100% - 1.5rem)',
      }}>
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          textDecoration: 'none', color: 'var(--text-main)',
          fontWeight: '700', fontFamily: "'Outfit', sans-serif",
          fontSize: '1.1rem', letterSpacing: '-0.02em', flexShrink: 0
        }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            padding: '6px', borderRadius: '10px', display: 'flex', color: 'white', boxShadow: 'var(--neon-glow)'
          }}>
            <Activity size={20} />
          </div>
          <span className="brand-text">Protocol Health Care</span>
        </Link>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {user && !loading && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} className="hide-mobile">
              {filteredLinks.map(link => (
                <NavLink key={link.to} to={link.to} icon={link.icon} label={link.label} />
              ))}
              <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem' }} />
            </div>
          )}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }} className="hide-mobile">
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-main)' }}>{profile?.full_name || 'User'}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-outline"
                style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                title="Logout"
              >
                <LogOut size={18} />
                <span className="hide-mobile" style={{ marginLeft: '0.4rem', fontSize: '0.85rem' }}>Logout</span>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                className="show-mobile btn btn-outline"
                style={{ padding: '0.5rem', border: 'none' }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          ) : (
            !loading && <Link to="/login" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Login</Link>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="show-mobile animate-fade-in" style={{
          position: 'fixed', top: '5.5rem', left: '0.75rem', right: '0.75rem',
          background: 'var(--bg-modal)', backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius)', border: '1px solid var(--border)',
          zIndex: 999, padding: '1.5rem', boxShadow: 'var(--glass-shadow)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <p style={{ fontWeight: '600', margin: 0 }}>{profile?.full_name || 'User'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{role}</p>
            </div>
            {filteredLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem', borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none', color: 'var(--text-main)',
                  background: location.pathname === link.to ? 'rgba(255,255,255,0.05)' : 'transparent'
                }}
              >
                {link.icon}
                <span style={{ fontWeight: '500' }}>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({ to, icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: '0.3rem',
      textDecoration: 'none', color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
      background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
      fontWeight: '500', fontSize: '0.85rem',
      transition: 'all 0.2s ease', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)'
    }}
      onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
      onMouseOut={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
