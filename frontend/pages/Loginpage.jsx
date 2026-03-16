import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  ArrowRight,
  LogIn,
  UserPlus,
  CheckCircle,
} from "lucide-react";
import { apiFetch } from "../src/api.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createVerificationState = () => ({
  email: "",
  code: "",
  status: "",
  busy: { request: false, confirm: false },
  verified: false,
  verificationId: "",
});

const initialFormState = {
  name: "",
  email: "",
  password: "",
  groupId: "",
};

const Loginpage = ({ onAuthSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formValues, setFormValues] = useState(initialFormState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [verificationState, setVerificationState] = useState(
    createVerificationState,
  );

  const resetVerification = () => {
    setVerificationState(createVerificationState());
  };

  useEffect(() => {
    let mounted = true;
    const loadGroups = async () => {
      try {
        const response = await apiFetch("/groups");
        const data = await response.json();
        if (mounted) {
          setGroups(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Unable to load groups", err);
      }
    };

    loadGroups();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setError("");
    setFieldErrors({});
  }, [isRegistering]);

  useEffect(() => {
    if (!isRegistering) {
      setVerificationState(createVerificationState());
    }
  }, [isRegistering]);

  const handleInputChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (field === "email" && isRegistering) {
      setVerificationState({
        ...createVerificationState(),
        email: value,
      });
    }
    setFieldErrors((prev) => {
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
    setError("");
  };

  const validateForm = () => {
    const errors = {};
    const trimmedName = formValues.name.trim();
    const trimmedEmail = formValues.email.trim().toLowerCase();

    if (isRegistering) {
      if (!trimmedName) {
        errors.name = "Full name is required.";
      } else if (trimmedName.length < 3) {
        errors.name = "Full name must be at least 3 characters.";
      }
    }

    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!emailPattern.test(trimmedEmail)) {
      errors.email = "Enter a valid email address.";
    }

    if (!formValues.password) {
      errors.password = "Password is required.";
    } else if (formValues.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (isRegistering && !formValues.groupId) {
      errors.groupId = "Choose an academic group.";
    }

    return errors;
  };

  const extractErrorMessage = async (response) => {
    try {
      const payload = await response.json();
      const message =
        (payload && payload.message) ||
        (typeof payload === "string" ? payload : null);
      return {
        message: message || JSON.stringify(payload),
        code: payload?.code,
        needsLogin: payload?.needsLogin,
      };
    } catch {
      const fallback = await response.text();
      return {
        message: fallback || response.statusText || "Something went wrong",
        code: null,
        needsLogin: response.status === 401,
      };
    }
  };

  const handleErrorResponse = async (response, fallback = "Something went wrong") => {
    if (!response.ok) {
      const errInfo = await extractErrorMessage(response);
      const err = new Error(errInfo.message || fallback);
      err.code = errInfo.code;
      throw err;
    }
    return response;
  };

  const handleVerificationRequest = async (event) => {
    event?.preventDefault?.();
    setVerificationState((prev) => ({ ...prev, status: "" }));

    const trimmedEmail = formValues.email.trim().toLowerCase();
    if (!trimmedEmail) {
      setVerificationState((prev) => ({
        ...prev,
        status: "Enter the email you want to verify before registering.",
      }));
      return;
    }
    if (!emailPattern.test(trimmedEmail)) {
      setVerificationState((prev) => ({
        ...prev,
        status: "Provide a valid email address before requesting an OTP.",
      }));
      return;
    }

    setVerificationState((prev) => ({
      ...prev,
      busy: { ...prev.busy, request: true },
      email: trimmedEmail,
      verified: false,
      verificationId: "",
    }));

    try {
      const response = await apiFetch("/auth/verify-email/request", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail }),
      });
      await handleErrorResponse(response);
      const data = await response.json();
      setVerificationState((prev) => ({
        ...prev,
        status: data.message || "OTP sent for verification.",
        code: "",
        verificationId: data.verificationId || "",
      }));
    } catch (err) {
      setVerificationState((prev) => ({
        ...prev,
        status: err.message || "Unable to send verification OTP.",
      }));
    } finally {
      setVerificationState((prev) => ({
        ...prev,
        busy: { ...prev.busy, request: false },
      }));
    }
  };

  const handleVerificationConfirm = async (event) => {
    event?.preventDefault?.();
    setVerificationState((prev) => ({ ...prev, status: "" }));

    if (!verificationState.email.trim() || !verificationState.code.trim()) {
      setVerificationState((prev) => ({
        ...prev,
        status: "Provide the OTP code that was sent to your email.",
      }));
      return;
    }

    if (!verificationState.verificationId) {
      setVerificationState((prev) => ({
        ...prev,
        status: "Request a fresh OTP before confirming.",
      }));
      return;
    }

    setVerificationState((prev) => ({
      ...prev,
      busy: { ...prev.busy, confirm: true },
    }));

    try {
      const response = await apiFetch("/auth/verify-email/confirm", {
        method: "POST",
        body: JSON.stringify({
          email: verificationState.email,
          code: verificationState.code.trim(),
          verificationId: verificationState.verificationId,
        }),
      });
      await handleErrorResponse(response);
      const data = await response.json();
      setVerificationState((prev) => ({
        ...prev,
        status: data.message || "Email verified successfully.",
        verified: true,
        code: "",
      }));
      setError("");
    } catch (err) {
      setVerificationState((prev) => ({
        ...prev,
        status: err.message || "Unable to verify email.",
        verified: false,
      }));
    } finally {
      setVerificationState((prev) => ({
        ...prev,
        busy: { ...prev.busy, confirm: false },
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    const errors = validateForm();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const trimmedEmail = formValues.email.trim().toLowerCase();
    const trimmedName = formValues.name.trim();
    const trimmedPassword = formValues.password;
    const payload = isRegistering
      ? {
          name: trimmedName,
          email: trimmedEmail,
          password: trimmedPassword,
          role: "student",
          groupId: formValues.groupId || null,
        }
      : { email: trimmedEmail, password: trimmedPassword };

    if (isRegistering && !verificationState.verified) {
      setError("Please verify your email before creating an account.");
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch(isRegistering ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await handleErrorResponse(response);
      const data = await response.json();
      onAuthSuccess?.(data.user);
    } catch (err) {
      if (err.code === "email_not_verified") {
        setVerificationState((prev) => ({
          ...prev,
          email: trimmedEmail,
          status: err.message,
          verified: false,
        }));
      }
      setError(err.message || "Authentication Error");
    } finally {
      setLoading(false);
    }
  };

  const formTitle = isRegistering ? "Create Account" : "Welcome Back";
  const formSubtitle = isRegistering
    ? "Verify your email first, then complete the registration form."
    : "Login to access your dashboard.";
  const formButtonLabel = isRegistering ? "Create Account" : "Sign In";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6">
        <div className="text-center">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {formTitle}
          </h1>
          <p className="mt-2 text-gray-500">{formSubtitle}</p>
        </div>

        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(false);
              resetVerification();
            }}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              !isRegistering
                ? "bg-indigo-600 text-white shadow"
                : "border border-gray-200 text-gray-600 bg-white"
            }`}
          >
            <LogIn className="inline w-4 h-4 mr-1 align-middle" />
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(true);
              resetVerification();
            }}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              isRegistering
                ? "bg-indigo-600 text-white shadow"
                : "border border-gray-200 text-gray-600 bg-white"
            }`}
          >
            <UserPlus className="inline w-4 h-4 mr-1 align-middle" />
            Register
          </button>
        </div>

        {error && (
          <div
            className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 animate-shake"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                Full Name
              </label>
              <input
                name="name"
                value={formValues.name}
                onChange={(event) => handleInputChange("name", event.target.value)}
                aria-invalid={fieldErrors.name ? "true" : undefined}
                className={`w-full px-4 py-3 rounded-xl outline-none transition-all bg-gray-50 ${
                  fieldErrors.name ? "border border-red-400" : "border border-gray-200"
                }`}
                placeholder="ex: John Doe"
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
              Email
            </label>
            <div className="flex gap-2">
              <input
                name="email"
                value={formValues.email}
                onChange={(event) => handleInputChange("email", event.target.value)}
                aria-invalid={fieldErrors.email ? "true" : undefined}
                autoComplete="email"
                className={`flex-1 px-4 py-3 rounded-xl outline-none transition-all bg-gray-50 ${
                  fieldErrors.email ? "border border-red-400" : "border border-gray-200"
                }`}
                placeholder="you@example.com"
              />
              {isRegistering && (
                <button
                  type="button"
                  onClick={handleVerificationRequest}
                  disabled={verificationState.busy.request}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide border transition ${
                    verificationState.busy.request
                      ? "bg-gray-200 text-gray-500 border-gray-200"
                      : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {verificationState.busy.request ? "Sending..." : "Verify"}
                </button>
              )}
            </div>
            {fieldErrors.email && (
              <p className="text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          {isRegistering && (
            <div className="space-y-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-indigo-600 font-semibold">
                <span>Verification status</span>
                {verificationState.verified ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Verified
                  </span>
                ) : (
                  <span className="text-indigo-500">Pending</span>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={verificationState.code}
                  onChange={(event) =>
                    setVerificationState((prev) => ({
                      ...prev,
                      code: event.target.value,
                    }))
                  }
                  placeholder="Enter OTP"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={handleVerificationConfirm}
                  disabled={verificationState.busy.confirm}
                  className={`w-full px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg transition ${
                    verificationState.busy.confirm
                      ? "bg-gray-200 text-gray-500 border border-gray-200"
                      : "bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50"
                  }`}
                >
                  {verificationState.busy.confirm ? "Confirming..." : "Confirm OTP"}
                </button>
                {verificationState.status && (
                  <p
                    className={`text-xs ${
                      verificationState.verified ? "text-green-700" : "text-indigo-600"
                    }`}
                  >
                    {verificationState.status}
                  </p>
                )}
              </div>
            </div>
          )}

          {isRegistering && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                Academic Group
              </label>
              <select
                name="groupId"
                value={formValues.groupId}
                onChange={(event) => handleInputChange("groupId", event.target.value)}
                aria-invalid={fieldErrors.groupId ? "true" : undefined}
                className={`w-full px-4 py-3 rounded-xl bg-gray-50 outline-none transition ${
                  fieldErrors.groupId ? "border border-red-400" : "border border-gray-200"
                }`}
              >
                <option value="">Select your batch</option>
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name} ({group.branch} year {group.year})
                  </option>
                ))}
              </select>
              {fieldErrors.groupId && (
                <p className="text-xs text-red-600">{fieldErrors.groupId}</p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              value={formValues.password}
              onChange={(event) => handleInputChange("password", event.target.value)}
              aria-invalid={fieldErrors.password ? "true" : undefined}
              className={`w-full px-4 py-3 rounded-xl outline-none transition-all bg-gray-50 ${
                fieldErrors.password ? "border border-red-400" : "border border-gray-200"
              }`}
              placeholder="********"
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          {isRegistering && (
            <div className="text-xs text-indigo-500 uppercase tracking-wide font-semibold">
              Student accounts are the only self-service role. Teachers must be created by an admin.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-60"
          >
            <ArrowRight className="w-4 h-4" />
            {loading ? "Processing..." : formButtonLabel}
          </button>
        </form>
        {!isRegistering && (
          <p className="text-xs text-center text-gray-500">
            Forgot your password?{" "}
            <Link to="/forgot-password" className="text-indigo-600 font-semibold">
              Reset it here
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Loginpage;
