import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, Trash2, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiFetch } from "../src/api.js";

const defaultForm = {
  name: "",
  branch: "",
  year: "1",
};

const AdminGroups = () => {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const payload = await apiFetch("/groups", {
        suppressGlobalErrorToast: true,
      });
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
      setGroups(list);
    } catch (err) {
      toast.error(err.message || "Unable to load groups.");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const payload = {
        name: form.name,
        branch: form.branch,
        year: Number(form.year),
      };
      await toast.promise(
        apiFetch("/groups", {
          method: "POST",
          body: payload,
          suppressGlobalErrorToast: true,
        }),
        {
          loading: "Creating group...",
          success: (result) => result?.message ?? "Group created successfully.",
          error: (err) => err.message || "Unable to create group.",
        },
      );
      setForm(defaultForm);
      fetchGroups();
    } catch {
      // handled
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this group? This cannot be undone.")) {
      return;
    }
    try {
      await toast.promise(
        apiFetch(`/groups/${id}`, {
          method: "DELETE",
          suppressGlobalErrorToast: true,
        }),
        {
          loading: "Deleting group...",
          success: (result) => result?.message ?? "Group removed.",
          error: (err) => err.message || "Failed to remove group.",
        },
      );
      fetchGroups();
    } catch {
      // toast shown
    }
  };

  const grouped = useMemo(
    () =>
      [...groups].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [groups],
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Group Management
            </h1>
            <p className="text-sm text-gray-500">
              Admin-only controls for creating and deleting academic groups.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-3 py-1 rounded-full text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition"
          >
            Go to dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[2fr,1.2fr] gap-6">
          <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Existing groups
              </h2>
              <button
                onClick={fetchGroups}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                type="button"
              >
                <RefreshCw className="w-4 h-4" />
                refresh
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-gray-500">Loading groups…</p>
            ) : grouped.length === 0 ? (
              <p className="text-sm text-gray-500">No groups available yet.</p>
            ) : (
              <ul className="space-y-3">
                {grouped.map((group) => (
                  <li
                    key={group._id}
                    className="flex items-center justify-between border border-gray-100 rounded-2xl px-4 py-3 bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {group.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Branch {group.branch} · Year {group.year}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(group._id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-red-600 border border-red-100 hover:bg-red-50"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Create new group
            </h2>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Group name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. CSE-01"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Branch
                </label>
                <input
                  value={form.branch}
                  onChange={(e) => handleChange("branch", e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. AI"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Year
                </label>
                <select
                  value={form.year}
                  onChange={(e) => handleChange("year", e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {[1, 2, 3, 4].map((yr) => (
                    <option key={yr} value={yr}>
                      Year {yr}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                {creating ? "Creating…" : "Create group"}
                <PlusCircle className="w-4 h-4" />
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminGroups;
