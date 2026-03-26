import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";
import { firebaseAuth } from "../src/firebase/client";
import toast from "react-hot-toast";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownDuration = 60;

  const cleanupUnverifiedUser = useCallback(async () => {
    const user = firebaseAuth.currentUser;
    if (!user || user.emailVerified) return;

    try {
      await user.delete();
    } catch (err) {
      console.error("Failed to delete unverified user:", err);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timeout = setTimeout(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [cooldown]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const user = firebaseAuth.currentUser;

      if (user) {
        await user.reload();

        if (user.emailVerified) {
          navigate("/");
        }
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleResend = async () => {
    const user = firebaseAuth.currentUser;

    if (!user) {
      toast.error("Please login again to resend the email.");
      return;
    }

    try {
      setLoading(true);
      await sendEmailVerification(user);
      toast.success("Verification email sent again!");
      setCooldown(cooldownDuration);
    } catch {
      toast.error("Failed to resend email.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await cleanupUnverifiedUser();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center space-y-4">
        <h1 className="text-2xl font-bold">Verify your email</h1>

        <p className="text-gray-500 text-sm">We sent a verification link to:</p>

        <p className="font-semibold text-indigo-600">{email}</p>

        <p className="text-sm text-gray-500">
          Please check your inbox and{" "}
          <span className="font-semibold">Spam</span> folder and verify your
          account.
        </p>

        <div
          className="w-full"
          title={
            cooldown > 0
              ? `Please wait ${cooldown} second${cooldown === 1 ? "" : "s"} before retrying.`
              : "Send the verification link again."
          }
        >
          <button
            onClick={handleResend}
            disabled={loading || cooldown > 0}
            className="w-full py-2 bg-indigo-600 text-white rounded-xl disabled:opacity-60"
          >
            {loading ? "Sending..." : "Resend Email"}
          </button>
          {cooldown > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              You can request a new link in {cooldown} second
              {cooldown === 1 ? "" : "s"}.
            </p>
          )}
        </div>

        <button
          onClick={handleBackToLogin}
          className="text-sm text-gray-500 underline"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
