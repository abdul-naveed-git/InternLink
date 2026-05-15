import { createContext, useContext, useMemo } from "react";
import { toast } from "react-hot-toast";

const NotificationContext = createContext({
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
  action: () => {},
});

export const NotificationProvider = ({ children }) => {
  const emitter = useMemo(
    () => ({
      success: (message, options) => toast.success(message, options),
      error: (message, options) => toast.error(message, options),
      warning: (message, options) => toast(message, { icon: "⚠️", ...options }),
      info: (message, options) => toast(message, { icon: "ℹ️", ...options }),
      action: (message, label, onClick, options) =>
        toast.custom(
          (t) => (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
              <p className="text-sm text-gray-900">{message}</p>
              <div className="mt-2 flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onClick?.();
                    toast.dismiss(t.id);
                  }}
                  className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold uppercase tracking-wide"
                >
                  {label}
                </button>
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="px-3 py-1 rounded-full border border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-600"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ),
          { duration: options?.duration ?? 6000, ...options },
        ),
    }),
    [],
  );

  return (
    <NotificationContext.Provider value={emitter}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }
  return context;
};
