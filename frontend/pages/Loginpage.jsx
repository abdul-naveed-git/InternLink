import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  GraduationCap,
  Globe,
  LogIn,
  UserPlus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { apiFetch } from "../src/api.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { firebaseAuth } from "../src/firebase/client.js";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const initialFormState = { name: "", email: "", password: "", groupId: "" };
const googleProvider = new GoogleAuthProvider();
const FIREBASE_ERROR_MAP = {
  "auth/user-not-found": "No account found for that email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/email-already-in-use": "An account already exists with that email.",
  "auth/invalid-email": "Invalid email.",
  "auth/weak-password": "Password must be at least 8 characters.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
};
const describeFirebaseError = (error) => {
  if (!error) return "Authentication failed.";
  if (error.code && FIREBASE_ERROR_MAP[error.code]) {
    return FIREBASE_ERROR_MAP[error.code];
  }
  if (error.code && error.code.startsWith("auth/")) {
    return "Invalid email or password.";
  }
  return error?.message || "Authentication failed.";
};
const Loginpage = ({ onAuthSuccess, onAuthError }) => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formValues, setFormValues] = useState(initialFormState);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const reportError = (message) => {
    if (!message) return;
    toast.error(message);
    onAuthError?.(message);
  };
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const payload = await apiFetch("/groups/public");
        const data = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        setGroups(data);
      } catch (err) {
        toast.error(err.message || "Unable to load groups.");
      }
    };
    loadGroups();
  }, []);
  const handleInputChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };
  const validate = () => {
    const email = formValues.email.trim().toLowerCase();
    if (!email) return "Email required";
    if (!emailPattern.test(email)) return "Invalid email";
    if (!formValues.password) return "Password required";
    if (formValues.password.length < 8) return "Min 8 characters";
    if (isRegistering) {
      if (!formValues.name.trim()) return "Name required";
      if (!formValues.groupId) return "Select group";
    }
    return null;
  };
  const handleSignIn = async (e) => {
    e.preventDefault();
    const errMsg = validate();
    if (errMsg) {
      reportError(errMsg);
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(
        firebaseAuth,
        formValues.email,
        formValues.password,
      );
      await cred.user.reload();
      if (!cred.user.emailVerified) {
        await sendEmailVerification(cred.user);
        navigate("/verify-email", {
          state: { email: formValues.email },
        });

        toast.error("Please verify your email before logging in.");
        //reportError("Please verify your email before logging in.");
        return;
      }
      const token = await cred.user.getIdToken();
      const payload = await apiFetch("/auth/firebase/session", {
        method: "POST",
        body: {
          idToken: token,
          name: formValues.name,
          groupId: formValues.groupId,
        },
      });
      navigate("/dashboard");
      onAuthSuccess?.(payload);
    } catch (err) {
      reportError(describeFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };
  const handleSignUp = async (e) => {
    e.preventDefault();
    const errMsg = validate();
    if (errMsg) {
      reportError(errMsg);
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth,
        formValues.email,
        formValues.password,
      );
      await updateProfile(cred.user, { displayName: formValues.name });
      await sendEmailVerification(cred.user);
      navigate("/verify-email", { state: { email: formValues.email } });
    } catch (err) {
      reportError(describeFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const cred = await signInWithPopup(firebaseAuth, googleProvider);
      const token = await cred.user.getIdToken();
      const payload = await apiFetch("/auth/firebase/session", {
        method: "POST",
        body: {
          idToken: token,
          name: formValues.name,
          groupId: formValues.groupId,
        },
      });
      navigate("/dashboard");
      onAuthSuccess?.(payload);
    } catch (err) {
      reportError(describeFirebaseError(err));
    } finally {
      setGoogleLoading(false);
    }
  };
  const formTitle = isRegistering ? "Create Account" : "Welcome Back";
  const formDescription = isRegistering
    ? "Fill out the registration form. Next verify your email."
    : "Login to access your dashboard.";
  const submitLabel = isRegistering ? "Create Account" : "Sign In";
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      {" "}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6">
        {" "}
        <div className="text-center">
          {" "}
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            {" "}
            <GraduationCap className="w-10 h-10 text-white" />{" "}
          </div>{" "}
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {" "}
            {formTitle}{" "}
          </h1>{" "}
          <p className="mt-2 text-gray-500">{formDescription}</p>{" "}
        </div>{" "}
        <div className="flex gap-2 justify-center">
          {" "}
          <button
            type="button"
            onClick={() => setIsRegistering(false)}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${!isRegistering ? "bg-indigo-600 text-white shadow" : "border border-gray-200 text-gray-600 bg-white"}`}
          >
            {" "}
            <LogIn className="inline w-4 h-4 mr-1" /> Sign in{" "}
          </button>{" "}
          <button
            type="button"
            onClick={() => setIsRegistering(true)}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${isRegistering ? "bg-indigo-600 text-white shadow" : "border border-gray-200 text-gray-600 bg-white"}`}
          >
            {" "}
            <UserPlus className="inline w-4 h-4 mr-1" /> Register{" "}
          </button>{" "}
        </div>{" "}
        <form
          onSubmit={isRegistering ? handleSignUp : handleSignIn}
          className="space-y-4"
        >
          {" "}
          {isRegistering && (
            <div className="space-y-1">
              {" "}
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                {" "}
                Full Name{" "}
              </label>{" "}
              <input
                name="name"
                value={formValues.name}
                onChange={(event) =>
                  handleInputChange("name", event.target.value)
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="ex: John Doe"
              />{" "}
            </div>
          )}{" "}
          <div className="space-y-1">
            {" "}
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
              {" "}
              Email{" "}
            </label>{" "}
            <input
              name="email"
              value={formValues.email}
              onChange={(event) =>
                handleInputChange("email", event.target.value)
              }
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="you@example.com"
            />{" "}
          </div>{" "}
          {isRegistering && (
            <div className="space-y-1">
              {" "}
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                {" "}
                Academic Group{" "}
              </label>{" "}
              <select
                name="groupId"
                value={formValues.groupId}
                onChange={(event) =>
                  handleInputChange("groupId", event.target.value)
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-indigo-500"
              >
                {" "}
                <option value="">Select your batch</option>{" "}
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {" "}
                    {group.name} ({group.branch} year {group.year}){" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </div>
          )}{" "}
          <div className="space-y-1">
            {" "}
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
              {" "}
              Password{" "}
            </label>{" "}
            <input
              name="password"
              type="password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              value={formValues.password}
              onChange={(event) =>
                handleInputChange("password", event.target.value)
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="********"
            />{" "}
          </div>{" "}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {" "}
            <ArrowRight className="w-4 h-4" />{" "}
            {loading ? "Processing..." : submitLabel}{" "}
          </button>{" "}
        </form>{" "}
        <div className="mt-1 flex justify-center">
          {" "}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
          >
            {" "}
            <Globe className="w-4 h-4" />{" "}
            {googleLoading ? "Signing in..." : "Continue with Google"}{" "}
          </button>{" "}
        </div>{" "}
        {!isRegistering && (
          <p className="text-xs text-center text-gray-500">
            {" "}
            Forgot your password?{" "}
            <Link
              to="/forgot-password"
              className="text-indigo-600 font-semibold"
            >
              {" "}
              Reset it here{" "}
            </Link>{" "}
          </p>
        )}{" "}
      </div>{" "}
    </div>
  );
};
export default Loginpage;
