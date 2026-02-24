import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './services/supabaseClient';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import AddPatient from './pages/AddPatient';
import PatientList from './pages/PatientList';
import Triage from './pages/Triage';
import Consultation from './pages/Consultation';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import NurseDashboard from './pages/NurseDashboard';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import PatientDashboard from './pages/PatientDashboard';
import Unauthorized from './pages/Unauthorized';
import ManageUsers from './pages/ManageUsers';
import Billing from './pages/Billing';
import Appointments from './pages/Appointments';
import MedicationLog from './pages/MedicationLog';
import WardStatus from './pages/WardStatus';
import PatientPortal from './pages/PatientPortal';

function App() {
  const { profile, loading, user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const role = profile?.role;

  // Root redirect based on role
  const getHomeElement = () => {
    if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading Profile...</div>;
    if (!user) return <Login />;
    if (!role) {
      return (
        <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
          <h3>Profile not found</h3>
          <p>Your account is pending role assignment. Please contact an admin.</p>
          <button className="btn" onClick={() => supabase.auth.signOut()}>Logout</button>
        </div>
      );
    }
    switch (role) {
      case 'admin': return <AdminDashboard />;
      case 'doctor': return <DoctorDashboard />;
      case 'nurse': return <NurseDashboard />;
      case 'receptionist': return <ReceptionistDashboard />;
      default: return <PatientDashboard />;
    }
  };

  const showNavigation = user && role;

  return (
    <Router>
      <div className={showNavigation ? "app-layout" : ""}>
        {showNavigation && (
          <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
        )}

        <main className={showNavigation ? "main-content" : ""}>
          {showNavigation && <Navbar />}

          <div className={showNavigation ? "page-container" : ""}>
            <Routes>
              <Route path="/" element={getHomeElement()} />
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/manage-users" element={
                <ProtectedRoute allowedRoles={['admin']}><ManageUsers /></ProtectedRoute>
              } />

              {/* Shared Staff Routes */}
              <Route path="/patients" element={
                <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']}><PatientList /></ProtectedRoute>
              } />
              <Route path="/billing" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist']}><Billing /></ProtectedRoute>
              } />

              {/* Receptionist/Admin Routes */}
              <Route path="/add-patient" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist']}><AddPatient /></ProtectedRoute>
              } />
              <Route path="/appointments" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist']}><Appointments /></ProtectedRoute>
              } />

              {/* Nurse/Admin Routes */}
              <Route path="/triage" element={
                <ProtectedRoute allowedRoles={['admin', 'nurse']}><Triage /></ProtectedRoute>
              } />
              <Route path="/medication" element={
                <ProtectedRoute allowedRoles={['admin', 'nurse']}><MedicationLog /></ProtectedRoute>
              } />
              <Route path="/ward-status" element={
                <ProtectedRoute allowedRoles={['admin', 'nurse']}><WardStatus /></ProtectedRoute>
              } />

              {/* Doctor/Admin Routes */}
              <Route path="/consultation" element={
                <ProtectedRoute allowedRoles={['admin', 'doctor']}><Consultation /></ProtectedRoute>
              } />

              {/* Patient Routes */}
              <Route path="/patient-portal" element={
                <ProtectedRoute allowedRoles={['patient', 'admin']}><PatientPortal /></ProtectedRoute>
              } />

              {/* Catch All */}
              <Route path="*" element={<h1>404 - Not Found</h1>} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;