import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiFetch } from "../src/api.js";
import { useAuth } from "../src/contexts/AuthContext.jsx";

const UserProfile = ({ user }) => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [groups, setGroups] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [formValues, setFormValues] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    groupId: user?.groupId ?? "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setFormValues((prev) => ({
      ...prev,
      name: user?.name ?? "",
      email: user?.email ?? "",
      groupId: user?.groupId ?? "",
    }));
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const loadGroups = async () => {
      try {
        const payload = await apiFetch("/groups/public", {
          suppressGlobalErrorToast: true,
        });
        const list = Array.isArray(payload?.data)
          ? payload?.data
          : Array.isArray(payload)
            ? payload
            : [];
        if (mounted) {
          setGroups(list);
        }
      } catch (err) {
        if (mounted) {
          setGroups([]);
        }
        toast.error(err.message || "Unable to load group list.");
      }
    };

    loadGroups();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = {};

    if (!formValues.name.trim()) {
      validationErrors.name = "Name is required.";
    }
    if (!formValues.email.trim()) {
      validationErrors.email = "Email is required.";
    }
    if (formValues.password && formValues.password.length < 6) {
      validationErrors.password = "Password must be at least 6 characters.";
    }
    if (
      formValues.password &&
      formValues.password !== formValues.confirmPassword
    ) {
      validationErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      groupId: formValues.groupId || null,
    };

    if (formValues.password) {
      payload.password = formValues.password;
    }

    setIsSaving(true);
    try {
      await toast.promise(
        apiFetch("/auth/me", {
          method: "PUT",
          body: payload,
          suppressGlobalErrorToast: true,
        }),
        {
          loading: "Saving profile...",
          success: (res) => res?.message ?? "Profile updated successfully.",
          error: (err) => err.message || "Unable to update profile.",
        },
      );

      setFormValues((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
      await refreshUser({ suppressGlobalLoading: true });
    } catch {
      // handled
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-white border border-indigo-100 rounded-full shadow-sm hover:bg-indigo-50 transition"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-gray-500 uppercase tracking-wide">
              {user?.role}
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              {user?.name}
            </h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.name ? "border-red-400" : "border-gray-200"
                } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                value={formValues.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
              {errors.name && (
                <p className="text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.email ? "border-red-400" : "border-gray-200"
                } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                value={formValues.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Group</label>
              <select
                value={formValues.groupId ?? ""}
                onChange={(e) => handleChange("groupId", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">No group assigned</option>
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name} ({group.branch})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.password ? "border-red-400" : "border-gray-200"
                  } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                  placeholder="Leave blank to keep current password"
                  value={formValues.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                />
                {errors.password && (
                  <p className="text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.confirmPassword
                      ? "border-red-400"
                      : "border-gray-200"
                  } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                  value={formValues.confirmPassword}
                  onChange={(e) =>
                    handleChange("confirmPassword", e.target.value)
                  }
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              {isSaving ? "Saving..." : "Save profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
