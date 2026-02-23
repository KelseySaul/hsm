import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, User, ArrowLeft, RefreshCw, AlertCircle, Printer, Receipt, FileText, Pill, Calendar } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const CONSULTATION_FEE = 1500; // KES

export default function Billing() {
    const navigate = useNavigate();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedBill, setSelectedBill] = useState(null);

    const fetchBills = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: appts, error } = await supabase
                .from('appointments')
                .select('id, patient_id, status, reason, created_at, doctor_id')
                .eq('status', 'completed')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch patient names separately
            const patientIds = [...new Set((appts || []).map(a => a.patient_id).filter(Boolean))];
            let patientMap = {};
            if (patientIds.length > 0) {
                const { data: patients } = await supabase
                    .from('patients')
                    .select('id, first_name, last_name, gender, date_of_birth')
                    .in('id', patientIds);
                (patients || []).forEach(p => { patientMap[p.id] = p; });
            }

            const parsed = (appts || []).map((appt, index) => {
                let payload = {};
                try { payload = JSON.parse(appt.reason || '{}'); } catch { }
                return {
                    ...appt,
                    patients: patientMap[appt.patient_id] || null,
                    payload,
                    receiptNo: `PHC-${String(index + 1).padStart(4, '0')}`,
                };
            });

            setBills(parsed);
        } catch (err) {
            console.error('Failed to load billing data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBills(); }, []);

    const filtered = bills.filter(b => {
        const name = `${b.patients?.first_name} ${b.patients?.last_name}`.toLowerCase();
        return name.includes(search.toLowerCase()) || b.receiptNo.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="container animate-fade-in">
            <button
                onClick={() => navigate('/')}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Billing & Receipts</h1>
                    <p className="subtitle">Generate and print receipts for completed consultations</p>
                </div>
                <button onClick={fetchBills} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    placeholder="Search by patient name or receipt number..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ maxWidth: '420px' }}
                />
            </div>

            {/* Receipt modal / print view */}
            {selectedBill && (
                <ReceiptModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
            )}

            {loading ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={32} style={{ opacity: 0.4, marginBottom: '1rem' }} />
                    <p>Loading billing records...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Receipt size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p>{search ? 'No records match your search.' : 'No completed consultations yet.'}</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Bills appear here once a doctor signs and completes a consultation.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '0.9rem' }}>
                    {filtered.map(bill => (
                        <div key={bill.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem 1.5rem', transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ background: 'rgba(245,158,11,0.1)', padding: '10px', borderRadius: '10px', color: '#f59e0b' }}>
                                    <CreditCard size={22} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '2px' }}>
                                        {bill.patients?.first_name} {bill.patients?.last_name}
                                    </p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                        {bill.receiptNo} · {new Date(bill.created_at).toLocaleDateString([], { dateStyle: 'medium' })}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontWeight: '700', color: '#10b981', fontSize: '1.1rem', margin: 0 }}>KES {CONSULTATION_FEE.toLocaleString()}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Consultation Fee</p>
                                </div>
                                <button
                                    onClick={() => setSelectedBill(bill)}
                                    className="btn btn-primary"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.1rem', fontSize: '0.9rem' }}
                                >
                                    <Printer size={16} /> Print Receipt
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ReceiptModal({ bill, onClose }) {
    const patient = bill.patients || {};
    const date = new Date(bill.created_at).toLocaleDateString([], { dateStyle: 'long' });
    const time = new Date(bill.created_at).toLocaleTimeString([], { timeStyle: 'short' });

    const handlePrint = () => {
        const el = document.getElementById('receipt-printable');
        const original = document.body.innerHTML;
        document.body.innerHTML = el.innerHTML;
        window.print();
        document.body.innerHTML = original;
        window.location.reload();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', maxWidth: '560px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                {/* Modal toolbar */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Receipt Preview</h3>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                            <Printer size={15} /> Print
                        </button>
                        <button onClick={onClose} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                            Close
                        </button>
                    </div>
                </div>

                {/* Printable receipt body */}
                <div id="receipt-printable" style={{ padding: '2rem' }}>
                    {/* Hospital header */}
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '2px dashed var(--border)' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '8px', borderRadius: '10px', color: 'white' }}>
                                <Receipt size={24} />
                            </div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Protocol Health Care</h2>
                        </div>
                        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.85rem' }}>Official Medical Receipt</p>
                    </div>

                    {/* Receipt meta */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                        <div>
                            <p style={{ color: 'var(--text-muted)', margin: '2px 0' }}>Receipt No.</p>
                            <p style={{ fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>{bill.receiptNo}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ color: 'var(--text-muted)', margin: '2px 0' }}>Date & Time</p>
                            <p style={{ fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>{date} · {time}</p>
                        </div>
                    </div>

                    {/* Patient info */}
                    <div style={{ background: 'var(--bg-main)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <User size={20} color="var(--primary)" />
                        <div>
                            <p style={{ fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>{patient.first_name} {patient.last_name}</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '2px 0 0' }}>
                                {patient.gender} {patient.date_of_birth ? `· DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Clinical summary */}
                    {bill.payload.diagnosis && (
                        <div style={{ marginBottom: '1rem', padding: '0.85rem 1.1rem', background: 'rgba(79,70,229,0.06)', borderRadius: '8px', borderLeft: '3px solid var(--primary)', display: 'flex', gap: '0.75rem' }}>
                            <FileText size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <p style={{ fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Diagnosis</p>
                                <p style={{ color: 'var(--text-main)', margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>{bill.payload.diagnosis}</p>
                            </div>
                        </div>
                    )}

                    {bill.payload.prescription && (
                        <div style={{ marginBottom: '1.5rem', padding: '0.85rem 1.1rem', background: 'rgba(16,185,129,0.06)', borderRadius: '8px', borderLeft: '3px solid #10b981', display: 'flex', gap: '0.75rem' }}>
                            <Pill size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <p style={{ fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Prescription</p>
                                <p style={{ color: 'var(--text-main)', margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>{bill.payload.prescription}</p>
                            </div>
                        </div>
                    )}

                    {/* Charges */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Consultation Fee</span>
                            <span style={{ color: 'var(--text-main)' }}>KES {CONSULTATION_FEE.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Medication</span>
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Billed separately</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '1.1rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '2px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-main)' }}>TOTAL DUE</span>
                            <span style={{ color: '#10b981' }}>KES {CONSULTATION_FEE.toLocaleString()}</span>
                        </div>
                    </div>

                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
                        Thank you for choosing Protocol Health Care. Please retain this receipt for your records.
                    </p>
                </div>
            </div>
        </div>
    );
}
