import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import CandidateDetail from './pages/CandidateDetail';
import RecruiterIQ from './pages/RecruiterIQ';
import Analytics from './pages/Analytics';
import DataCenter from './pages/DataCenter';
import Companies from './pages/Companies';
import CRM from './pages/CRM';
import Teams from './pages/Teams';
import Targets from './pages/Targets';
import Revenue from './pages/Revenue';
import Notifications from './pages/Notifications';
import Help from './pages/Help';
import Attendance from './pages/Attendance';
import OrgSettings from './pages/OrgSettings';
import UserManagement from './pages/UserManagement';
import SecurityAudit from './pages/SecurityAudit';
import EventCenter from './pages/EventCenter';
import TeamChat from './pages/TeamChat';
import PendingApproval from './pages/PendingApproval';
import UserProfile from './pages/UserProfile';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/pending" element={<PendingApproval />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/candidates" element={<Candidates />} />
          <Route path="/candidates/:candidateId" element={<CandidateDetail />} />
          <Route path="/recruiter-iq" element={<RecruiterIQ />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/data-center" element={<DataCenter />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/targets" element={<Targets />} />
          <Route path="/revenue" element={<Revenue />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/org-settings" element={<OrgSettings />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/security" element={<SecurityAudit />} />
          <Route path="/events" element={<EventCenter />} />
          <Route path="/chat" element={<TeamChat />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/help" element={<Help />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App