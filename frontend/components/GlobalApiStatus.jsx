import { useNavigate } from "react-router-dom";

const statusCopy = {
  unauthorized: {
    short: "Authentication required",
    detail: "Your session has expired or you need to log in again.",
    action: "Go to login",
  },
  forbidden: {
    short: "Access denied",
    detail: "You do not have permission to view this content.",
  },
  not_found: {
    short: "Not found",
    detail: "The requested resource was not available.",
  },
  error: {
    short: "Something went wrong",
    detail: "The server returned an error. Try again later.",
  },
};

const GlobalApiStatus = ({ alert, onDismiss }) => {
  const navigate = useNavigate();

  if (!alert) {
    return null;
  }

  const statusMeta = statusCopy[alert.type] ?? statusCopy.error;
  const needsAction = alert.type === "unauthorized";

  const handleAction = () => {
    onDismiss?.();
    navigate("/login");
  };

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-6 z-50 w-[min(98vw,640px)]">
      <div className="bg-white border border-gray-200 shadow-xl rounded-2xl px-5 py-4 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{alert.message}</p>
            <p className="text-xs text-gray-500 mt-1">{statusMeta.detail}</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {alert.status}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {needsAction && (
            <button
              type="button"
              onClick={handleAction}
              className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
            >
              {statusMeta.action}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss?.()}
            className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalApiStatus;
