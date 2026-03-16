import { useState } from "react";
import Opportunitycard from "./Opportunitycard.jsx";
import { Search, Filter, Bookmark, Briefcase, CheckCircle } from "lucide-react";

export const StudentDashboard = ({
  user,
  opportunities,
  onSave,
  onApply,
  onViewDetails,
}) => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredOpps = opportunities.filter((o) => {
    const matchesSearch =
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.company.toLowerCase().includes(search.toLowerCase()) ||
      o.description.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = o.targetGroups.includes(user.groupId);

    if (filter === "saved")
      return matchesSearch && matchesGroup && o.savedBy.includes(user._id);
    if (filter === "applied")
      return matchesSearch && matchesGroup && o.appliedBy.includes(user._id);
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search roles or companies..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {[
            { id: "all", label: "All Opportunities", icon: Briefcase },
            { id: "saved", label: "Saved", icon: Bookmark },
            { id: "applied", label: "Applied", icon: CheckCircle },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === btn.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <btn.icon className="w-4 h-4" />
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {filteredOpps.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No opportunities found
          </h3>
          <p className="text-gray-500 mt-1">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpps.map((o) => (
              <Opportunitycard
                key={o._id}
                opportunity={o}
                user={user}
                isSaved={o.savedBy.includes(user._id)}
                isApplied={o.appliedBy.includes(user._id)}
                onSave={onSave}
                onApply={onApply}
                onViewDetails={onViewDetails}
              />
          ))}
        </div>
      )}
    </div>
  );
};
