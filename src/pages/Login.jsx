import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Activity, User, Stethoscope } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user } = useAuth();

  // 'staff' | 'patient'
  const [portal, setPortal] = useState('staff');

  // Staff login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  // Patient self-registration state
  const [patForm, setPatForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    date_of_birth: '', gender: 'Male'
  });
  const [patMsg, setPatMsg] = useState('');
  const [patLoading, setPatLoading] = useState(false);
  const [patSuccess, setPatSuccess] = useState(false);

  /* ── Staff Login ─────────────────────────────── */
  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
  };

  /* ── Patient Self-Registration ───────────────── */
  const handlePatientRegister = async (e) => {
    e.preventDefault();
    setPatMsg('');
    setPatLoading(true);

    const { full_name, email: pEmail, password: pPass, confirm_password, date_of_birth, gender } = patForm;

    if (pPass !== confirm_password) {
      setPatMsg('Passwords do not match.');
      setPatLoading(false);
      return;
    }
    if (pPass.length < 6) {
      setPatMsg('Password must be at least 6 characters.');
      setPatLoading(false);
      return;
    }

    try {
      // 1. Create auth account
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: pEmail,
        password: pPass,
        options: { data: { full_name } }
      });
      if (authErr) throw authErr;

      const userId = authData?.user?.id;
      if (!userId) throw new Error('Could not create account. Please try again.');

      // 2. Create profile with role = 'patient'
      const { error: profileErr } = await supabase
        .from('profiles')
        .insert([{ id: userId, full_name, role: 'patient' }]);
      if (profileErr) throw profileErr;

      // 3. Create patients record with user_id link
      const nameParts = full_name.trim().split(' ');
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      const { error: patErr } = await supabase
        .from('patients')
        .insert([{
          first_name,
          last_name,
          date_of_birth: date_of_birth || null,
          gender,
          user_id: userId,
        }]);
      // Non-fatal if patients insert fails (user_id column may not exist yet until migration is run)
      if (patErr) console.warn('patients insert warning:', patErr.message);

      setPatSuccess(true);
    } catch (err) {
      setPatMsg(err.message);
    } finally {
      setPatLoading(false);
    }
  };

  if (user) return <Navigate to="/" />;

  const tabBtn = (active) => ({
    flex: 1,
    padding: '0.7rem 1rem',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s',
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? 'white' : 'var(--text-muted)',
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} className="animate-fade-in">
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: 'var(--mobile-pad, 2.5rem 2rem)', position: 'relative', overflow: 'hidden' }}>
        <style>{`
          @media (max-width: 480px) {
            .glass-panel { padding: 1.5rem !important; }
          }
        `}</style>

        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '150px', height: '150px', background: 'var(--primary)', filter: 'blur(80px)', opacity: 0.3, borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--secondary)', filter: 'blur(80px)', opacity: 0.3, borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '16px', borderRadius: '16px', color: 'white', boxShadow: 'var(--neon-glow)' }}>
              <Activity size={36} />
            </div>
          </div>

          <h2 style={{ textAlign: 'center', marginBottom: '0.25rem', fontSize: '1.85rem' }}>
            <span className="text-gradient">PHC Core</span>
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
            Protocol Health Care
          </p>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '4px', marginBottom: '2rem', border: '1px solid var(--border)' }}>
            <button onClick={() => { setPortal('staff'); setMessage(''); setPatMsg(''); }} style={tabBtn(portal === 'staff')}>
              <Stethoscope size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Staff Login
            </button>
            <button onClick={() => { setPortal('patient'); setMessage(''); setPatMsg(''); }} style={tabBtn(portal === 'patient')}>
              <User size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Patient Portal
            </button>
          </div>

          {/* ── STAFF LOGIN ── */}
          {portal === 'staff' && (
            <form onSubmit={handleStaffLogin}>
              <div className="form-group">
                <label>Institutional Email</label>
                <input type="email" placeholder="jane.doe@hospital.org" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}>
                Authenticate
              </button>
              {message && (
                <div style={{ marginTop: '1rem', padding: '0.875rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.9rem', textAlign: 'center' }}>
                  {message}
                </div>
              )}
            </form>
          )}

          {/* ── PATIENT PORTAL ── */}
          {portal === 'patient' && (
            <>
              {patSuccess ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                  <h3 style={{ marginBottom: '0.5rem' }}>Account Created!</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Check your email to confirm your address, then log in below.
                  </p>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setPatSuccess(false); setPortal('staff'); setEmail(patForm.email); }}>
                    Go to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePatientRegister}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" placeholder="John Doe" value={patForm.full_name} onChange={e => setPatForm(p => ({ ...p, full_name: e.target.value }))} required />
                  </div>

                  <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Date of Birth</label>
                      <input type="date" value={patForm.date_of_birth} onChange={e => setPatForm(p => ({ ...p, date_of_birth: e.target.value }))} max={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Gender</label>
                      <select value={patForm.gender} onChange={e => setPatForm(p => ({ ...p, gender: e.target.value }))}>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.875rem' }}>
                    <label>Email Address</label>
                    <input type="email" placeholder="you@email.com" value={patForm.email} onChange={e => setPatForm(p => ({ ...p, email: e.target.value }))} required />
                  </div>

                  <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Password</label>
                      <input type="password" placeholder="Min 6 chars" value={patForm.password} onChange={e => setPatForm(p => ({ ...p, password: e.target.value }))} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Confirm Password</label>
                      <input type="password" placeholder="Repeat" value={patForm.confirm_password} onChange={e => setPatForm(p => ({ ...p, confirm_password: e.target.value }))} required />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem', padding: '1rem' }} disabled={patLoading}>
                    {patLoading ? 'Creating Account...' : 'Create Patient Account'}
                  </button>

                  {patMsg && (
                    <div style={{ marginTop: '1rem', padding: '0.875rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.9rem', textAlign: 'center' }}>
                      {patMsg}
                    </div>
                  )}

                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1.25rem' }}>
                    Already have an account?{' '}
                    <button type="button" onClick={() => setPortal('staff')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', fontFamily: "'Inter', sans-serif" }}>
                      Sign in here
                    </button>
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
