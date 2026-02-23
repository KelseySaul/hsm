import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Unauthorized() {
    return (
        <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
            <div style={{ color: 'var(--error)', marginBottom: '1.5rem' }}>
                <ShieldAlert size={64} style={{ margin: '0 auto' }} />
            </div>
            <h1>Access Denied</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                You do not have permission to view this page. Please contact your administrator if you believe this is an error.
            </p>
            <Link to="/" className="btn btn-primary">Return to Home</Link>
        </div>
    );
}
