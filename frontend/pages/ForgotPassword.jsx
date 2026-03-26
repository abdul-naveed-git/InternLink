import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "../src/firebase/client.js";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRequest = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter the email you registered with.");
      return;
    }

    setBusy(true);
    try {
      await toast.promise(
        sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase()),
        {
          loading: "Sending reset link...",
          success: "Check your inbox for instructions.",
          error: (err) => err.message || "Unable to send reset instructions.",
        },
      );
    } catch {
      // toast handled
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Reset password</h1>
          <p className="text-sm text-gray-500">
            We will email you a link to reset your InternLink password.Make sure
            to check your inbox and <span className="font-semibold">Spam </span>{" "}
            folder!
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleRequest}>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Registered email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center">
          Remembered your password?{" "}
          <Link
            to="/login"
            className="text-indigo-600 font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
