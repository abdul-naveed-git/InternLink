import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "../src/api.js";

const initialState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const AdminTeacherCreation = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const { [field]: removed, ...rest } = prev;
      return rest;
    });
    setStatus(null);
  };

  const validate = () => {
    const nextErrors = {};
    if (!formValues.name.trim()) {
      nextErrors.name = "Name is required.";
    }
    if (!formValues.email.trim()) {
      nextErrors.email = "Email is required.";
    }
    if (!formValues.password) {
      nextErrors.password = "Password is required.";
    } else if (formValues.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }
    if (formValues.password !== formValues.confirmPassword) {
      nextErrors.confirmPassword = "Passwords must match.";
    }
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch("/users/teachers", {
        method: "POST",
        body: JSON.stringify({
          name: formValues.name.trim(),
          email: formValues.email.trim().toLowerCase(),
          password: formValues.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to create teacher.");
      }
      setStatus({ type: "success", message: data.message || "Teacher created." });
      setFormValues(initialState);
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Creation failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl bg-white border border-gray-100 rounded-3xl shadow-xl p-8 space-y-6">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create teacher account</h1>
          <p className="text-sm text-gray-500 mt-1">
            Admins can create teacher profiles that bypass student registration.
          </p>
        </div>

        {status && (
          <div
            className={`px-4 py-3 rounded-xl text-sm ${
              status.type === "error"
                ? "bg-red-50 text-red-700 border border-red-100"
                : "bg-green-50 text-green-700 border border-green-100"
            }`}
            role="status"
          >
            {status.message}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full name</label>
            <input
              value={formValues.name}
              onChange={(event) => handleChange("name", event.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="e.g. Prof. Anjali Rao"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={formValues.email}
              onChange={(event) => handleChange("email", event.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="teacher@example.com"
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={formValues.password}
                onChange={(event) => handleChange("password", event.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="At least 8 characters"
              />
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Confirm password
              </label>
              <input
                type="password"
                value={formValues.confirmPassword}
                onChange={(event) => handleChange("confirmPassword", event.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {isSubmitting ? "Creating..." : "Create teacher"}
          </button>
        </form>

        <p className="text-xs text-gray-500">
          Created teacher accounts can log in immediately—no email verification is required because the admin handled it.
        </p>
      </div>
    </div>
  );
};

export default AdminTeacherCreation;
