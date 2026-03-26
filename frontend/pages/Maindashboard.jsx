import { useState, useEffect, useMemo } from "react";
import DashboardHeader from "../components/DashboardHeader.jsx";
import { StudentDashboard } from "../components/StudentDashboard.jsx";
import { AdminDashboard } from "../components/AdminDashboard.jsx";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { apiFetch } from "../src/api.js";
import { useNotifications } from "../src/contexts/NotificationContext.jsx";

const sortOpportunitiesWithExpiredLast = (items) => {
  const now = new Date();
  const active = [];
  const expired = [];

  items.forEach((opportunity) => {
    const deadline = new Date(opportunity.deadline);
    if (Number.isNaN(deadline.getTime())) {
      active.push(opportunity);
    } else if (deadline >= now) {
      active.push(opportunity);
    } else {
      expired.push(opportunity);
    }
  });

  const toMs = (entry) => {
    const time = new Date(entry.deadline).getTime();
    return Number.isNaN(time) ? Infinity : time;
  };

  const sortByDeadline = (list) => [...list].sort((a, b) => toMs(a) - toMs(b));

  return [...sortByDeadline(active), ...sortByDeadline(expired)];
};

export const Maindashboard = ({ user, onLogout }) => {
  const [opportunities, setOpportunities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const navigate = useNavigate();
  const notifications = useNotifications();
  const studentMissingGroup = user?.role === "student" && !user?.groupId;
  const handleProfileClick = () => {
    if (user?.role === "student" && !user?.groupId) {
      notifications.action(
        "Please join or create a group.",
        "Go to profile",
        () => navigate("/profile"),
      );
      return;
    }

    navigate("/profile");
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      setIsLoading(false);
      return;
    }

    const loadPromise = (async () => {
      const query = new URLSearchParams();
      if (user?.groupId) query.append("groupId", user.groupId);
      if (user?._id) query.append("userId", user._id);

      const queryString = query.toString();
      const [groupsPayload, oppPayload] = await Promise.all([
        apiFetch("/groups", { suppressGlobalErrorToast: true }),
        apiFetch(`/opportunities${queryString ? `?${queryString}` : ""}`, {
          suppressGlobalErrorToast: true,
        }),
      ]);

      const normalizedGroups = Array.isArray(groupsPayload?.data)
        ? groupsPayload.data
        : [];
      const normalizedOpp = Array.isArray(oppPayload?.data)
        ? oppPayload.data
        : [];

      return {
        groups: normalizedGroups,
        opportunities: normalizedOpp,
      };
    })();

    toast
      .promise(loadPromise, {
        loading: "Loading dashboard...",
        success: "Dashboard ready",
        error: (err) => err.message || "Unable to load dashboard.",
      })
      .then(({ groups: fetchedGroups, opportunities: fetchedOpp }) => {
        setGroups(fetchedGroups);
        setOpportunities(fetchedOpp);
      })
      .catch(() => {
        setGroups([]);
        setOpportunities([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user, navigate]);

  const refreshData = async () => {
    if (!user) return;
    setIsDataRefreshing(true);

    const query = new URLSearchParams();
    if (user?.groupId) query.append("groupId", user.groupId);
    if (user?._id) query.append("userId", user._id);

    const queryString = query.toString();
    const refreshPromise = apiFetch(
      `/opportunities${queryString ? `?${queryString}` : ""}`,
      { suppressGlobalErrorToast: true },
    );

    try {
      const payload = await toast.promise(refreshPromise, {
        loading: "Refreshing opportunities...",
        success: "Opportunities refreshed",
        error: (err) => err.message || "Unable to refresh opportunities.",
      });
      const list = payload?.data ?? [];
      setOpportunities(Array.isArray(list) ? list : []);
    } catch {
      // error already shown via toast
    } finally {
      setIsDataRefreshing(false);
    }
  };

  const sortedOpportunities = useMemo(
    () => sortOpportunitiesWithExpiredLast(opportunities),
    [opportunities],
  );

  const handleSaveOpportunity = async (id) => {
    try {
      await toast.promise(
        apiFetch(`/opportunities/${id}/save`, {
          method: "POST",
          suppressGlobalErrorToast: true,
        }),
        {
          loading: "Updating saved list...",
          success: (result) =>
            result?.message ?? "Opportunity saved preference updated.",
          error: (err) => err.message || "Unable to save opportunity.",
        },
      );
      refreshData();
    } catch {
      // toast already shown
    }
  };

  const handleApplyOpportunity = async (id) => {
    const opp = opportunities.find((o) => o._id === id);

    if (!opp) return;

    try {
      await toast.promise(
        apiFetch(`/opportunities/${id}/apply`, {
          method: "POST",
          suppressGlobalErrorToast: true,
        }),
        {
          loading: "Submitting application...",
          success: (result) =>
            result?.message ?? "Applied successfully. Opening link...",
          error: (err) =>
            err.message || "Unable to apply for this opportunity.",
        },
      );

      if (opp.applyLink) {
        window.open(opp.applyLink, "_blank");
      }

      refreshData();
    } catch {
      // toast handled
    }
  };

  const handleAddOpportunity = async (partial) => {
    try {
      await toast.promise(
        apiFetch("/opportunities", {
          method: "POST",
          body: partial,
          suppressGlobalErrorToast: true,
        }),
        {
          loading: "Creating opportunity...",
          success: (result) => result?.message ?? "Opportunity created.",
          error: (err) => err.message || "Unable to create opportunity.",
        },
      );
      await refreshData();
    } catch {
      // already handled
    }
  };

  const handleDeleteOpportunity = async (id) => {
    try {
      await toast.promise(
        apiFetch(`/opportunities/${id}`, {
          method: "DELETE",
          suppressGlobalErrorToast: true,
        }),
        {
          loading: "Deleting opportunity...",
          success: (result) => result?.message ?? "Opportunity deleted.",
          error: (err) => err.message || "Unable to delete opportunity.",
        },
      );
      await refreshData();
    } catch {
      // toast shown
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-indigo-600 font-bold animate-pulse">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardHeader
        user={user}
        onLogout={onLogout}
        onProfileClick={handleProfileClick}
      />

      {isDataRefreshing && (
        <div className="fixed top-0 left-0 w-full h-1 bg-indigo-600 animate-pulse z-50"></div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome back, {user?.name} 👋
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              {user?.role === "student" ? (
                <>
                  Viewing opportunities for{" "}
                  <span className="font-semibold text-indigo-600">
                    {groups.find((g) => g._id === user.groupId)?.name}
                  </span>
                </>
              ) : (
                "Manage opportunities and track student activity."
              )}
            </p>

            <p className="text-xs text-gray-400 mt-1">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>

          {isDataRefreshing && (
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 animate-pulse">
              Syncing data...
            </span>
          )}
        </header>

        {user?.role === "student" ? (
          <StudentDashboard
            user={user}
            opportunities={sortedOpportunities}
            onSave={handleSaveOpportunity}
            onApply={handleApplyOpportunity}
            onViewDetails={(id) => navigate(`/opportunity/${id}`)}
            disableActions={studentMissingGroup}
          />
        ) : (
          <AdminDashboard
            user={user}
            opportunities={sortedOpportunities}
            groups={groups}
            onAddOpportunity={handleAddOpportunity}
            onDeleteOpportunity={handleDeleteOpportunity}
            onViewDetails={(id) => navigate(`/opportunity/${id}`)}
          />
        )}
      </main>
    </div>
  );
};
