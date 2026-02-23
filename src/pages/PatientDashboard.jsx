import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PatientDashboard() {
    const navigate = useNavigate();
    useEffect(() => {
        navigate('/patient-portal', { replace: true });
    }, [navigate]);
    return null;
}
