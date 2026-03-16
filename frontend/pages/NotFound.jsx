import { useNavigate } from "react-router-dom";

const NotFound = ({ user }) => {
  const navigate = useNavigate();
  const targetPath = user ? "/dashboard" : "/login";
  const helpText = user
    ? "Return to the dashboard"
    : "Go back to the login screen";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full bg-white border border-gray-200 rounded-3xl shadow-lg p-10 text-center space-y-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          404 · Not Found
        </p>
        <h1 className="text-4xl font-extrabold text-gray-900">
          Oops! This page does not exist.
        </h1>
        <p className="text-sm text-gray-500">
          The URL you entered either no longer exists or you don’t have access
          to view it. Use the button below to continue.
        </p>
        <button
          onClick={() => navigate(targetPath)}
          className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
          type="button"
        >
          {helpText}
        </button>
      </div>
    </div>
  );
};

export default NotFound;
