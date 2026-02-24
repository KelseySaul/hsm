import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { patientService } from '../services/patientService';
import { LogOut, Search, User, Loader2 } from 'lucide-react';

export default function Navbar() {
  const { profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const role = loading ? null : (profile?.role ?? null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const data = await patientService.searchPatients(searchQuery);
          setResults(data || []);
          setShowResults(true);
        } catch (err) {
          console.error("Search error:", err);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Close results on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchRef]);

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

  const handleSelectPatient = (patient) => {
    setShowResults(false);
    setSearchQuery('');
    // For now, navigate to directory with a search param
    navigate(`/patients?search=${patient.id}`);
  };

  return (
    <header className="top-header">
      <div
        ref={searchRef}
        style={{ position: 'relative', width: '400px' }}
        className="hide-mobile"
      >
        <div style={{ position: 'relative' }}>
          {isSearching ? (
            <Loader2 size={18} className="animate-spin" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
          ) : (
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            placeholder="Global Patient Search (Name or ID)..."
            style={{
              paddingLeft: '40px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.03)',
              height: '40px',
              fontSize: '0.9rem',
              width: '100%',
              border: results.length > 0 && showResults ? '1px solid var(--primary)' : '1px solid var(--border)',
              transition: 'var(--transition)'
            }}
          />
        </div>

        {/* Search Results Dropdown */}
        {showResults && (results.length > 0 || isSearching) && (
          <div className="card" style={{
            position: 'absolute',
            top: '48px',
            left: 0,
            right: 0,
            zIndex: 1000,
            padding: '0.5rem',
            boxShadow: 'var(--glass-shadow)',
            background: 'var(--bg-surface)',
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)'
          }}>
            {isSearching && results.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Searching...</div>
            ) : results.length > 0 ? (
              results.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    gap: '2px',
                    transition: 'var(--transition)'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-main)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{patient.first_name} {patient.last_name}</span>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>ID: {patient.id.substring(0, 8)}</span>
                    <span>{patient.gender} • {patient.date_of_birth}</span>
                  </div>
                </button>
              ))
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No patients found</div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }} className="hide-mobile">
            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>{profile?.full_name || 'User'}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{role}</p>
          </div>
          <div style={{
            width: '40px', height: '40px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-main)',
            border: '2px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)'
          }}>
            <User size={20} />
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-outline"
          style={{ height: '40px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
        >
          <LogOut size={16} />
          <span className="hide-mobile">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
