import { useState, useEffect, useMemo } from "react";
import DashboardHeader from "../components/DashboardHeader.jsx";
import { StudentDashboard } from "../components/StudentDashboard.jsx";
import { AdminDashboard } from "../components/AdminDashboard.jsx";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../src/api.js";

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

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      try {
        const query = new URLSearchParams();
        if (user?.groupId) query.append("groupId", user.groupId);
        if (user?._id) query.append("userId", user._id);

        const queryString = query.toString();
        const [groupsRes, oppRes] = await Promise.all([
          apiFetch("/groups"),
          apiFetch(`/opportunities${queryString ? `?${queryString}` : ""}`),
        ]);
        const groupsData = await groupsRes.json();
        const oppData = await oppRes.json();

        setGroups(groupsData);
        if (Array.isArray(oppData)) {
          setOpportunities(oppData);
        } else {
          setOpportunities([]);
        }
      } catch (err) {
        console.error("Data loading error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, navigate]);

  const refreshData = async () => {
    setIsDataRefreshing(true);

    try {
      const query = new URLSearchParams();
      if (user?.groupId) query.append("groupId", user.groupId);
      if (user?._id) query.append("userId", user._id);

      const queryString = query.toString();
      const res = await apiFetch(
        `/opportunities${queryString ? `?${queryString}` : ""}`,
      );

      const data = await res.json();

      setOpportunities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Refresh failed:", err);
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
      await apiFetch(`/opportunities/${id}/save`, {
        method: "POST",
        body: JSON.stringify({
          userId: user._id,
        }),
      });

      refreshData();
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const handleApplyOpportunity = async (id) => {
    const opp = opportunities.find((o) => o._id === id);

    if (!opp) return;

    try {
      await apiFetch(`/opportunities/${id}/apply`, {
        method: "POST",
        body: JSON.stringify({
          userId: user._id,
        }),
      });

      window.open(opp.applyLink, "_blank");

      refreshData();
    } catch (err) {
      console.error("Apply failed:", err);
    }
  };

  const handleAddOpportunity = async (partial) => {
    //await (partial, user.id);
    try {
      await apiFetch("/opportunities", {
        method: "POST",
        body: JSON.stringify({
          ...partial,
        }),
      });
    } catch (err) {
      console.error("Data loading error:", err);
    }
    await refreshData();
  };

  const handleDeleteOpportunity = async (id) => {
    try {
      await apiFetch(`/opportunities/${id}`, { method: "DELETE" });

      refreshData();
    } catch (err) {
      console.error("Delete failed:", err);
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
        onProfileClick={() => navigate("/profile")}
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
