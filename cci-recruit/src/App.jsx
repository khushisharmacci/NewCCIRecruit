import { AuthProvider } from "@/lib/AuthContext";
import { Navigate } from "react-router-dom";
import DailyReport from "./pages/DailyReport";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Attendance from "./pages/Attendance";
import CRM from "./pages/CRM";
import DataCenter from "./pages/DataCenter";
import EventCenter from "./pages/EventCenter";
import Help from "./pages/Help";
import Notifications from "./pages/Notifications";
import OrgSettings from "./pages/OrgSettings";
import PendingApproval from "./pages/PendingApproval";
import RecruiterIQ from "./pages/RecruiterIQ";
import Register from "./pages/Register";
import Revenue from "./pages/Revenue";
import SecurityAudit from "./pages/SecurityAudit";
import Targets from "./pages/Targets";
import Teams from "./pages/Teams";
import TeamChat from "./pages/TeamChat";
import UserManagement from "./pages/UserManagement";
import UserProfile from "./pages/UserProfile";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Candidates from "./pages/Candidates";
import CandidateDetail from "./pages/CandidateDetail";
import Companies from "./pages/Companies";
import Analytics from "./pages/Analytics";
import PageNotFound from "./lib/PageNotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import UserNotRegisteredError from "./components/UserNotRegisteredError";
import { useAuth } from "@/lib/AuthContext";
import Interviews from "./pages/Interviews";
import Positions from "./pages/Positions";

const AuthenticatedApp = () => {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    navigateToLogin,
  } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }

    if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
  <Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  <Route path="/reset-password" element={<ResetPassword />} />
  <Route path="/pending" element={<PendingApproval />} />

  <Route
    element={
      <ProtectedRoute
        unauthenticatedElement={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    }
  >
    <Route element={<Layout />}>
      <Route
        path="/"
        element={<Dashboard />}
      />

      <Route
        path="/dashboard"
        element={<Navigate to="/" replace />}
      />

      <Route
        path="/candidates"
        element={<Candidates />}
      />

      <Route
        path="/candidates/:candidateId"
        element={<CandidateDetail />}
      />

      <Route
        path="/companies"
        element={<Companies />}
      />

      <Route
        path="/analytics"
        element={<Analytics />}
      />

      <Route
        path="/events"
        element={<EventCenter />}
      />

      <Route
        path="/chat"
        element={<TeamChat />}
      />

      <Route
        path="/recruiter-iq"
        element={<RecruiterIQ />}
      />

      <Route
        path="/data-center"
        element={<DataCenter />}
      />

      <Route
        path="/crm"
        element={<CRM />}
      />

      <Route
        path="/teams"
        element={<Teams />}
      />

      <Route
        path="/targets"
        element={<Targets />}
      />

      <Route
        path="/revenue"
        element={<Revenue />}
      />

      <Route
        path="/attendance"
        element={<Attendance />}
      />

      <Route
        path="/daily-report"
        element={<DailyReport />}
      />

      <Route
        path="/notifications"
        element={<Notifications />}
      />

      <Route
        path="/help"
        element={<Help />}
      />

      <Route
        path="/user-management"
        element={<UserManagement />}
      />

      <Route
        path="/security"
        element={<SecurityAudit />}
      />

      <Route
        path="/org-settings"
        element={<OrgSettings />}
      />

      <Route
        path="/profile"
        element={<UserProfile />}
      />

      <Route
        path="/interviews"
        element={<Interviews />}
      />

      <Route
        path="/positions"
        element={<Positions />}
      />
    </Route>
  </Route>

  <Route
    path="*"
    element={<PageNotFound />}
  />
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

        {/* Shadcn UI Toast Provider */}
        <Toaster />
        
        {/* Sonner Toast Provider (fixes spreadsheet sync confirmations) */}
        <SonnerToaster richColors />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;