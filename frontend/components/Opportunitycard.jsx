import { Badge } from "./Badge.jsx";
import {
  Building2,
  ExternalLink,
  Bookmark,
  CheckCircle,
  Eye,
} from "lucide-react";
import { formatRelativeTime, getDeadlineStatus } from "../src/utils/time.js";

const Opportunitycard = ({
  user,
  opportunity,
  isSaved,
  isApplied,
  onSave,
  onApply,
  onViewDetails,
}) => {
  const status = getDeadlineStatus(opportunity.deadline);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <Badge
            variant={
              opportunity.category === "internship"
                ? "blue"
                : opportunity.category === "job"
                  ? "purple"
                  : "green"
            }
          >
            {opportunity.category.toUpperCase()}
          </Badge>

          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mt-2 line-clamp-2 break-words">
            {opportunity.title}
          </h3>

          <div className="flex items-start text-gray-500 mt-1 gap-1">
            <Building2 className="w-4 h-4 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {opportunity.company}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span className="text-gray-500">
                  Posted by {opportunity.createdBy?.name ?? "Admin"}
                </span>
                <span className="text-gray-300">·</span>
                <span>{formatRelativeTime(opportunity.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <Badge
          variant={status.variant}
          className="flex-shrink-0 whitespace-nowrap"
        >
          {status.label}
        </Badge>
      </div>

      <div className="text-gray-600 text-sm mb-4 line-clamp-3">
        {opportunity.description.length > 200
          ? opportunity.description.substring(0, 200) + "..."
          : opportunity.description}
      </div>

      <div className="flex flex-wrap gap-3 mt-auto border-t pt-4 justify-between items-center">
        <div className="flex flex-wrap gap-3 items-center">
          {user?.role === "student" && (
            <>
              <button
                onClick={() => onApply?.(opportunity._id)}
                disabled={isApplied}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isApplied
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                }`}
                type="button"
              >
                {isApplied ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                {isApplied ? "Applied" : "Apply Now"}
              </button>
              <button
                onClick={() => onSave?.(opportunity._id)}
                className={`p-2 rounded-lg border transition-colors ${
                  isSaved
                    ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                    : "text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300"
                }`}
                title={isSaved ? "Saved" : "Save for later"}
                type="button"
              >
                <Bookmark
                  className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`}
                />
              </button>
            </>
          )}

          {user?.role === "teacher" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {opportunity.appliedBy.length} applicants
              </span>
            </div>
          )}
        </div>

        {onViewDetails && (
          <button
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onViewDetails(opportunity._id);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-50 transition-colors"
            type="button"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>
        )}
      </div>
    </div>
  );
};
export default Opportunitycard;
