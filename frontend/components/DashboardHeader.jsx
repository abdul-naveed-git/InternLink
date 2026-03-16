import { LogOut, User as UserIcon } from "lucide-react";

const DashboardHeader = ({ user, onLogout, onProfileClick }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo + Project Name */}
          <div className="flex items-center gap-3 cursor-pointer">
            <img
              src="/Intern Link Logo.png"
              alt="InternLink Logo"
              className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-sm hover:scale-105 transition"
            />
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              InternLink
            </span>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-gray-200"></div>

            <div className="flex items-center gap-3">
              {/* User Info */}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-none">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 mt-1 capitalize">
                  {user?.role}
                </p>
              </div>

              {/* Profile Icon */}
              <div
                className={`bg-indigo-100 p-2 rounded-full text-indigo-700 transition ${
                  onProfileClick ? "cursor-pointer hover:bg-indigo-200" : ""
                }`}
                onClick={onProfileClick}
                role={onProfileClick ? "button" : undefined}
                tabIndex={onProfileClick ? 0 : undefined}
              >
                <UserIcon className="w-5 h-5" />
              </div>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
