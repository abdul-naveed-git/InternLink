import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../src/api.js";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState({ request: false, confirm: false });

  const handleRequest = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!email.trim()) {
      setStatus({ type: "error", message: "Please enter the email you registered with." });
      return;
    }

    setBusy((prev) => ({ ...prev, request: true }));
    try {
      const response = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to send OTP.");
      }
      setStatus({ type: "success", message: data.message || "OTP sent to your inbox." });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Failed to send OTP." });
    } finally {
      setBusy((prev) => ({ ...prev, request: false }));
    }
  };

  const handleConfirm = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!code.trim() || !newPassword.trim()) {
      setStatus({ type: "error", message: "OTP and new password are required." });
      return;
    }
    if (newPassword.trim().length < 8) {
      setStatus({ type: "error", message: "New password must be at least 8 characters." });
      return;
    }

    setBusy((prev) => ({ ...prev, confirm: true }));
    try {
      const response = await apiFetch("/auth/forgot-password/confirm", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to reset password.");
      }
      setStatus({ type: "success", message: data.message || "Password reset successfully." });
      setCode("");
      setNewPassword("");
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Password reset failed." });
    } finally {
      setBusy((prev) => ({ ...prev, confirm: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Forgot password?</h1>
          <p className="text-sm text-gray-500 mt-2">
            We will send a one-time code to verify your email before letting you reset the password.
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

        <form className="space-y-4" onSubmit={handleRequest}>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Registered email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={busy.request}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {busy.request ? "Sending OTP..." : "Send verification code"}
          </button>
        </form>

        <form className="space-y-4" onSubmit={handleConfirm}>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">OTP code</label>
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter the 6-digit OTP"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="At least 8 characters"
            />
          </div>
          <button
            type="submit"
            disabled={busy.confirm}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
          >
            {busy.confirm ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center">
          Remembered your password?{" "}
          <Link to="/login" className="text-indigo-600 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
