import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../services/supabaseClient';
import { ShieldCheck, UserPlus, Users, Trash2, Search } from 'lucide-react';

export default function ManageUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'patient' });
    const [creating, setCreating] = useState(false);
    const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'patients'
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
            alert("Failed to load users: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            if (!supabaseAdmin) {
                alert("Error: Supabase Service Role Key is missing. This action requires admin privileges.");
                return;
            }

            // 1. Create the user in auth.users directly without logging the admin out
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: newUser.email,
                password: newUser.password,
                email_confirm: true,
                user_metadata: { full_name: newUser.full_name }
            });

            if (authError) throw authError;

            // Note: Our on_auth_user_created trigger will automatically create the profile row!
            // We just need to wait a tiny bit for the trigger to fire, then update the role.
            await new Promise(resolve => setTimeout(resolve, 500));

            const { error: roleError } = await supabaseAdmin
                .from('profiles')
                .update({ role: newUser.role })
                .eq('id', authData.user.id);

            if (roleError) {
                console.warn("User created, but failed to assign role instantly:", roleError);
            }

            alert(`Successfully registered ${newUser.full_name} as a ${newUser.role}!`);
            setNewUser({ email: '', password: '', full_name: '', role: 'nurse' });
            fetchUsers();

        } catch (error) {
            console.error(error);
            alert("Failed to create user: " + error.message);
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            alert('Role updated successfully!');
            fetchUsers();
        } catch (error) {
            alert('Failed to update role: ' + error.message);
        }
    };

    const staffUsers = users.filter(u => u.role !== 'patient' && (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())));
    const patientUsers = users.filter(u => u.role === 'patient' && (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())));

    const currentUsers = activeTab === 'staff' ? staffUsers : patientUsers;

    return (
        <div className="container animate-fade-in">
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', padding: '14px', borderRadius: '14px', color: 'white', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}>
                        <Users size={32} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0 }}>System Users Directory</h1>
                        <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>Manage roles and access across the hospital</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <UserPlus size={20} color="var(--primary)" />
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Register New Staff Account</h2>
                </div>
                <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Full Name</label>
                        <input type="text" required placeholder="Dr. Sarah Connor" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Institutional Email</label>
                        <input type="email" required placeholder="sarah@hospital.org" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Login Password</label>
                        <input type="password" required placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Initial Role</label>
                        <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                            <option value="nurse">Nurse</option>
                            <option value="doctor">Doctor</option>
                            <option value="receptionist">Receptionist</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={creating} style={{ height: '42px' }}>
                        {creating ? 'Registering...' : 'Create Account'}
                    </button>
                </form>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`btn ${activeTab === 'staff' ? 'btn-primary' : ''}`}
                        style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', background: activeTab === 'staff' ? 'var(--primary)' : 'transparent', color: activeTab === 'staff' ? 'white' : 'var(--text-muted)', border: 'none' }}
                    >
                        Staff Accounts ({staffUsers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('patients')}
                        className={`btn ${activeTab === 'patients' ? 'btn-primary' : ''}`}
                        style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', background: activeTab === 'patients' ? 'var(--primary)' : 'transparent', color: activeTab === 'patients' ? 'white' : 'var(--text-muted)', border: 'none' }}
                    >
                        Patient Accounts ({patientUsers.length})
                    </button>
                </div>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '40px', width: '100%' }}
                    />
                </div>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Name</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>System Role</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Registered</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading network users...</td>
                                </tr>
                            ) : currentUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No {activeTab} users matching your search.</td>
                                </tr>
                            ) : (
                                currentUsers.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>{user.full_name || 'Unnamed User'}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <select
                                                value={user.role || 'patient'}
                                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                                                disabled={user.role === 'admin'} // Prevent demoting other admins easily
                                            >
                                                <option value="patient">Patient</option>
                                                <option value="nurse">Nurse</option>
                                                <option value="receptionist">Receptionist</option>
                                                <option value="doctor">Doctor</option>
                                                <option value="admin">Administrator</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {new Date(user.updated_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.2)' }} disabled>
                                                <Trash2 size={14} style={{ marginRight: '6px' }} /> Suspend
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
