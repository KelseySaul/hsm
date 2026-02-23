import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { patientService } from '../services/patientService';
import { UserPlus, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

export default function AddPatient() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', date_of_birth: '',
    gender: 'Male', address: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      // Only include columns that exist in the patients table
      const patientPayload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender,
      };

      const newPatient = await patientService.addPatient(patientPayload);

      // Auto-add to triage queue
      if (newPatient && newPatient.length > 0) {
        await patientService.addToQueue(newPatient[0].id);
      }

      setMessage({ type: 'success', text: `${formData.first_name} ${formData.last_name} registered and sent to Triage Queue!` });
      setFormData({ first_name: '', last_name: '', date_of_birth: '', gender: 'Male', address: '' });
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({ type: 'error', text: error.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const field = (label, name, type = 'text', placeholder = '', required = false, opts = {}) => (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label>{label}{required && <span style={{ color: 'var(--error)', marginLeft: '4px' }}>*</span>}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        value={formData[name]}
        onChange={handleChange}
        {...opts}
      />
    </div>
  );

  return (
    <div className="container animate-fade-in">
      <div className="glass-panel" style={{ maxWidth: '700px', margin: '0 auto', padding: '2.5rem' }}>
        <button onClick={() => navigate('/')} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '12px', borderRadius: '12px', color: 'white', boxShadow: 'var(--neon-glow)' }}>
            <UserPlus size={32} />
          </div>
          <div>
            <h2 style={{ marginBottom: 0 }}>Register New Patient</h2>
            <p className="subtitle" style={{ marginBottom: 0, marginTop: '4px' }}>Enter demographic details for hospital records</p>
          </div>
        </div>

        {message && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', marginBottom: '1.5rem',
            color: message.type === 'success' ? '#10b981' : '#ef4444'
          }}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {field('First Name', 'first_name', 'text', 'John', true)}
            {field('Last Name', 'last_name', 'text', 'Doe', true)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {field('Date of Birth', 'date_of_birth', 'date', '', true)}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 2rem' }}>
              {loading ? 'Registering...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
