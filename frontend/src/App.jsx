import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Loginpage from "../pages/Loginpage";
import { Maindashboard } from "../pages/Maindashboard";
import OpportunityDetail from "../pages/OpportunityDetail";
import UserProfile from "../pages/UserProfile";
import AdminGroups from "../pages/AdminGroups";
import AdminTeacherCreation from "../pages/AdminTeacherCreation";
import NotFound from "../pages/NotFound";
import ForgotPasswordPage from "../pages/ForgotPassword";
import GlobalApiStatus from "../components/GlobalApiStatus.jsx";
import { apiFetch } from "./api.js";

const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalAlert, setGlobalAlert] = useState(null);
  const alertTimer = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const response = await apiFetch("/auth/me");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const handleAuthSuccess = (user) => {
    setUser(user);
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setUser(null);
    }
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  useEffect(() => {
    const handleApiStatus = (event) => {
      const detail = event.detail;
      if (!detail || !detail.message) return;
      setGlobalAlert(detail);
      if (detail.needsLogin) {
        setUser(null);
      }
      if (alertTimer.current) {
        clearTimeout(alertTimer.current);
      }
      alertTimer.current = window.setTimeout(() => {
        setGlobalAlert(null);
        alertTimer.current = null;
      }, 6000);
    };

    window.addEventListener("apiStatus", handleApiStatus);
    return () => {
      window.removeEventListener("apiStatus", handleApiStatus);
      if (alertTimer.current) {
        clearTimeout(alertTimer.current);
        alertTimer.current = null;
      }
    };
  }, []);

  return (
    <BrowserRouter>
      <GlobalApiStatus
        alert={globalAlert}
        onDismiss={() => {
          setGlobalAlert(null);
          if (alertTimer.current) {
            clearTimeout(alertTimer.current);
            alertTimer.current = null;
          }
        }}
      />

      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : (
        <Routes>
          <Route
            path="/opportunity/:id"
            element={user ? <OpportunityDetail user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/profile"
            element={
              user ? (
                <UserProfile user={user} onUserUpdated={handleUserUpdate} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" /> : <Loginpage onAuthSuccess={handleAuthSuccess} />}
          />
          <Route
            path="/forgot-password"
            element={<ForgotPasswordPage />}
          />
          <Route
            path="/dashboard"
            element={user ? <Maindashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
        <Route
          path="/admin/groups"
          element={
            user?.role === "admin" ? (
              <AdminGroups />
            ) : (
              <Navigate to={user ? "/dashboard" : "/login"} />
            )
          }
        />
        <Route
          path="/admin/teachers"
          element={
            user?.role === "admin" ? (
              <AdminTeacherCreation />
            ) : (
              <Navigate to={user ? "/dashboard" : "/login"} />
            )
          }
        />
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          <Route path="*" element={<NotFound user={user} />} />
        </Routes>
      )}
    </BrowserRouter>
  );
};
export default App;
