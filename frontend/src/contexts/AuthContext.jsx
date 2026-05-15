import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";

const AuthContext = createContext({
  user: null,
  isLoading: true,
  handleAuthSuccess: () => {},
  handleLogout: () => {},
  refreshUser: async () => null,
});

const extractUserFromPayload = (payload) => {
  const candidate = payload?.data?.user ?? payload ?? null;
  if (!candidate) {
    return null;
  }
  if (!candidate.role) {
    console.error("[auth] payload missing role", candidate);
    return null;
  }
  return {
    _id: candidate._id,
    name: candidate.name,
    email: candidate.email,
    role: candidate.role,
    groupId: candidate.groupId ?? null,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(
    async ({ suppressGlobalLoading } = {}) => {
      if (!suppressGlobalLoading) {
        setIsLoading(true);
      }
      try {
        const payload = await apiFetch("/auth/me", {
          suppressGlobalErrorToast: true,
        });
        const normalized = extractUserFromPayload(payload);
        setUser(normalized);
        if (normalized) {
          console.info(
            `[auth] session refreshed: ${normalized.email} (${normalized.role})`,
          );
        }
        return normalized;
      } catch (err) {
        setUser(null);
        return null;
      } finally {
        if (!suppressGlobalLoading) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  const handleAuthSuccess = useCallback((payload) => {
    const data = payload?.data ?? payload ?? {};
    if (data?.needsEmailVerification) {
      window.location.href = "/verify-email";
      return null;
    }
    const normalized = extractUserFromPayload(data?.user ?? data);
    setUser(normalized);
    if (normalized) {
      console.info(
        `[auth] user logged in: ${normalized.email} (${normalized.role})`,
      );
    }
    return normalized;
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        suppressGlobalErrorToast: true,
      });
    } catch {
      // already handled
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
    };

    window.addEventListener("sessionExpired", handleSessionExpired);
    return () => {
      window.removeEventListener("sessionExpired", handleSessionExpired);
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      handleAuthSuccess,
      handleLogout,
      refreshUser,
    }),
    [user, isLoading, handleAuthSuccess, handleLogout, refreshUser],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
