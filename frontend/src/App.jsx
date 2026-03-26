import { useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Loginpage from "../pages/Loginpage";
import { Maindashboard } from "../pages/Maindashboard";
import OpportunityDetail from "../pages/OpportunityDetail";
import UserProfile from "../pages/UserProfile";
import AdminGroups from "../pages/AdminGroups";
import AdminTeacherCreation from "../pages/AdminTeacherCreation";
import NotFound from "../pages/NotFound";
import ForgotPasswordPage from "../pages/ForgotPassword";
import VerifyEmail from "../pages/VerifyEmail";
import { useNotifications } from "./contexts/NotificationContext.jsx";
import {
  AuthProvider,
  useAuth,
} from "./contexts/AuthContext.jsx";

const LoadingScreen = ({ message = "Checking session..." }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      <p className="text-indigo-600 font-bold animate-pulse">{message}</p>
    </div>
  </div>
);

const InvalidRolePanel = ({ user, onLogout }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
    <div className="bg-white shadow-sm rounded-2xl p-8 border border-red-100 w-full max-w-md">
      <p className="text-sm text-red-500 uppercase tracking-wide">Access denied</p>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">
        We do not recognize the role{" "}
        <span className="text-indigo-600">{user?.role ?? "undefined"}</span>.
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Please contact an admin or logout and use a supported account.
      </p>
      <button
        onClick={onLogout}
        className="mt-6 w-full px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition"
      >
        Logout
      </button>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <LoadingScreen />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AppRoutes = () => {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const lastGroupToast = useRef(null);
  const { user, isLoading, handleAuthSuccess, handleLogout } = useAuth();

  useEffect(() => {
    const needsGroup = user?.role === "student" && !user?.groupId;
    if (needsGroup && user?._id) {
      if (lastGroupToast.current !== user._id) {
        lastGroupToast.current = user._id;
        notifications.action(
          "You are not assigned to any group.",
          "Go to profile",
          () => navigate("/profile"),
        );
      }
    } else if (!needsGroup && lastGroupToast.current) {
      lastGroupToast.current = null;
    }
  }, [notifications, navigate, user]);

  if (isLoading) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/opportunity/:id"
          element={
            <PrivateRoute>
              <OpportunityDetail user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <UserProfile user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Loginpage onAuthSuccess={handleAuthSuccess} />
            )
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  {["student", "admin", "teacher"].includes(user?.role) ? (
                    <Maindashboard user={user} onLogout={handleLogout} />
                  ) : (
                    <InvalidRolePanel user={user} onLogout={handleLogout} />
                  )}
                </PrivateRoute>
              }
            />
        <Route
          path="/admin/groups"
          element={
            <PrivateRoute>
              {user?.role === "admin" ? (
                <AdminGroups />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/teachers"
          element={
            <PrivateRoute>
              {user?.role === "admin" ? (
                <AdminTeacherCreation />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
        <Route path="*" element={<NotFound user={user} />} />
      </Routes>
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
