import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle,
  ExternalLink,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "../components/Badge.jsx";
import { apiFetch } from "../src/api.js";
import { formatFullDate, formatRelativeTime } from "../src/utils/time.js";
import { toast } from "react-hot-toast";

const normalizeTargetIds = (values = []) =>
  values.map((value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && value._id) return value._id;
    return value.toString();
  });

const defaultFormState = {
  title: "",
  company: "",
  category: "internship",
  deadline: "",
  applyLink: "",
  description: "",
  targetGroups: [],
};

const OpportunityDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formState, setFormState] = useState(defaultFormState);
  const [formErrors, setFormErrors] = useState({});
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSavingForLater, setIsSavingForLater] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const needsGroup = user?.role === "student" && !user?.groupId;

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [opportunityPayload, groupsPayload] = await Promise.all([
          apiFetch(`/opportunities/${id}`, {
            suppressGlobalErrorToast: true,
          }),
          apiFetch("/groups", {
            suppressGlobalErrorToast: true,
          }),
        ]);

        const opportunityData =
          opportunityPayload?.data ?? opportunityPayload ?? null;
        const groupsData = Array.isArray(groupsPayload?.data)
          ? groupsPayload.data
          : Array.isArray(groupsPayload)
            ? groupsPayload
            : [];

        if (!opportunityData) {
          throw new Error("Opportunity not found.");
        }

        setOpportunity(opportunityData);
        setGroups(groupsData);
        setFormState({
          title: opportunityData.title || "",
          company: opportunityData.company || "",
          category: opportunityData.category || "internship",
          deadline: opportunityData.deadline
            ? new Date(opportunityData.deadline).toISOString().split("T")[0]
            : "",
          applyLink: opportunityData.applyLink || "",
          description: opportunityData.description || "",
          targetGroups: normalizeTargetIds(opportunityData.targetGroups),
        });
      } catch (err) {
        toast.error(err.message || "Unable to load opportunity detail.");
        setOpportunity(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const targetGroupLabels = useMemo(() => {
    if (!opportunity) return [];
    const ids = new Set(normalizeTargetIds(opportunity.targetGroups));
    return groups
      .filter((group) => ids.has(String(group._id)))
      .map((group) => `${group.name} (${group.branch})`);
  }, [opportunity, groups]);

  const deadlineMessage = useMemo(() => {
    if (!opportunity?.deadline) return "Deadline not set";
    const deadlineDate = new Date(opportunity.deadline);
    if (Number.isNaN(deadlineDate.getTime())) return "Deadline not available";

    const now = new Date();
    const diffDays = Math.ceil(
      (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) return "Expired";
    if (diffDays <= 3)
      return `Closing in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
    return `Deadline: ${deadlineDate.toLocaleDateString()}`;
  }, [opportunity]);

  const isSaved = opportunity?.isSaved;
  const isApplied = opportunity?.hasApplied;
  const appliedCount =
    opportunity?.appliedByCount ??
    (Array.isArray(opportunity?.appliedBy) ? opportunity.appliedBy.length : 0);
  const isExpired = opportunity
    ? new Date(opportunity.deadline).getTime() < Date.now()
    : false;

  const handleFieldChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleTargetGroupToggle = (groupId) => {
    setFormState((prev) => {
      const exists = prev.targetGroups.includes(groupId);
      const nextList = exists
        ? prev.targetGroups.filter((id) => id !== groupId)
        : [...prev.targetGroups, groupId];
      setFormErrors((prevErrors) => {
        const { targetGroups: _ignored, ...rest } = prevErrors;
        return rest;
      });
      return { ...prev, targetGroups: nextList };
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!formState.title.trim()) {
      errors.title = "Position title is required.";
    }
    if (!formState.company.trim()) {
      errors.company = "Company name is required.";
    }
    if (!formState.description.trim()) {
      errors.description = "Description is required.";
    }
    if (!formState.deadline) {
      errors.deadline = "Deadline is required.";
    }
    if (!formState.applyLink.trim()) {
      errors.applyLink = "Application link is required.";
    } else if (!formState.applyLink.trim().startsWith("http")) {
      errors.applyLink = "Enter a valid URL (start with http/https).";
    }
    if (!formState.targetGroups.length) {
      errors.targetGroups = "Select at least one target group.";
    }
    return errors;
  };

  const handleSaveChanges = async (event) => {
    event?.preventDefault();
    if (!isTeacher) return;

    const fieldErrors = validateForm();
    if (Object.keys(fieldErrors).length) {
      setFormErrors(fieldErrors);
      toast.error("Fix the highlighted form errors before saving.");
      return;
    }

    setIsSavingChanges(true);
    try {
      const payload = await toast.promise(
        apiFetch(`/opportunities/${id}`, {
          method: "PUT",
          body: {
            title: formState.title.trim(),
            company: formState.company.trim(),
            category: formState.category,
            description: formState.description.trim(),
            deadline: formState.deadline,
            applyLink: formState.applyLink.trim(),
            targetGroups: formState.targetGroups,
          },
          suppressGlobalErrorToast: true,
        }),
        {
          loading: "Saving changes...",
          success: (result) => result?.message ?? "Opportunity updated.",
          error: (err) => err.message || "Unable to save changes.",
        },
      );

      setOpportunity(payload?.data ?? payload);
    } catch {
      // handled
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleApply = async () => {
    if (!opportunity) return;
    if (needsGroup) {
      toast.error("Please join a group before applying.");
      return;
    }
    setIsApplying(true);
    try {
      const payload = await toast.promise(
        apiFetch(`/opportunities/${id}/apply`, {
          method: "POST",
          suppressGlobalErrorToast: true,
        }),
        {
          loading: "Submitting application...",
          success: (result) => result?.message ?? "Application submitted.",
          error: (err) => err.message || "Unable to complete application.",
        },
      );

      const updated =
        payload?.data?.opportunity ?? payload?.data ?? payload ?? opportunity;
      setOpportunity(updated);
      const link = updated?.applyLink || opportunity?.applyLink;
      if (link) {
        window.open(link, "_blank");
      }
      toast.success("Application submitted.");
    } catch {
      // error handled
    } finally {
      setIsApplying(false);
    }
  };

  const handleToggleSave = async () => {
    if (!opportunity) return;
    if (needsGroup) {
      toast.error("Please join a group before saving opportunities.");
      return;
    }
    setIsSavingForLater(true);
    try {
      const payload = await toast.promise(
        apiFetch(`/opportunities/${id}/save`, {
          method: "POST",
          suppressGlobalErrorToast: true,
        }),
        {
          loading: "Updating saved list...",
          success: (result) => {
            const saved = result?.data?.saved;
            if (result?.message) return result.message;
            return saved ? "Added to saved list." : "Removed from saved list.";
          },
          error: (err) => err.message || "Save action failed.",
        },
      );

      const updated =
        payload?.data?.opportunity ?? payload?.data ?? payload ?? opportunity;
      setOpportunity(updated);
    } catch {
      // handled
    } finally {
      setIsSavingForLater(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm("Delete this opportunity? This action cannot be undone.")
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      await toast.promise(
        apiFetch(`/opportunities/${id}`, {
          method: "DELETE",
          suppressGlobalErrorToast: true,
        }),
        {
          loading: "Deleting opportunity...",
          success: (result) => result?.message ?? "Opportunity deleted.",
          error: (err) => err.message || "Delete failed.",
        },
      );
      navigate("/dashboard");
    } catch {
      // handled
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Opportunity not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-white border border-indigo-100 rounded-full shadow-sm hover:bg-indigo-50 transition"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
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
              <h1 className="text-2xl font-bold text-gray-900 mt-3">
                {opportunity.title}
              </h1>
              <p className="text-gray-500 mt-1">{opportunity.company}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-2">
                <span>Posted by {opportunity.createdBy?.name ?? "You"}</span>
                <span className="text-gray-300">·</span>
                <span>{formatRelativeTime(opportunity.createdAt)}</span>
              </div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Posted on {formatFullDate(opportunity.createdAt)}
              </p>
            </div>
            <div className="text-right space-y-1 text-sm text-gray-500">
              <div className="font-semibold text-gray-800">
                {deadlineMessage}
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>
                  {opportunity.targetGroups.length} target group
                  {opportunity.targetGroups.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {targetGroupLabels.length ? (
              targetGroupLabels.map((label) => (
                <span
                  key={label}
                  className="text-xs uppercase tracking-wide bg-gray-100 px-3 py-1 rounded-full text-gray-600 border border-gray-200"
                >
                  {label}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500 border border-dashed border-gray-200 px-3 py-1 rounded-full">
                No groups assigned yet
              </span>
            )}
          </div>

          {isTeacher ? (
            <form className="space-y-5" onSubmit={handleSaveChanges}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Position Title
                  </label>
                  <input
                    value={formState.title}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      formErrors.title ? "border-red-400" : "border-gray-200"
                    } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                  />
                  {formErrors.title && (
                    <p className="text-xs text-red-600">{formErrors.title}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Company Name
                  </label>
                  <input
                    value={formState.company}
                    onChange={(e) =>
                      handleFieldChange("company", e.target.value)
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      formErrors.company ? "border-red-400" : "border-gray-200"
                    } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                  />
                  {formErrors.company && (
                    <p className="text-xs text-red-600">{formErrors.company}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      handleFieldChange("category", e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="internship">Internship</option>
                    <option value="job">Full-time Job</option>
                    <option value="hackathon">Hackathon</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={formState.deadline}
                    onChange={(e) =>
                      handleFieldChange("deadline", e.target.value)
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      formErrors.deadline ? "border-red-400" : "border-gray-200"
                    } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                  />
                  {formErrors.deadline && (
                    <p className="text-xs text-red-600">
                      {formErrors.deadline}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Application Link
                </label>
                <input
                  value={formState.applyLink}
                  onChange={(e) =>
                    handleFieldChange("applyLink", e.target.value)
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    formErrors.applyLink ? "border-red-400" : "border-gray-200"
                  } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                  placeholder="https://company.com/apply"
                />
                {formErrors.applyLink && (
                  <p className="text-xs text-red-600">{formErrors.applyLink}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Target Groups
                </label>
                <div
                  className={`flex flex-wrap gap-2 p-3 rounded-lg border ${
                    formErrors.targetGroups
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  {groups.map((group) => (
                    <label
                      key={group._id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-indigo-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formState.targetGroups.includes(
                          String(group._id),
                        )}
                        onChange={() =>
                          handleTargetGroupToggle(String(group._id))
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        {group.name} ({group.branch})
                      </span>
                    </label>
                  ))}
                </div>
                {formErrors.targetGroups && (
                  <p className="text-xs text-red-600">
                    {formErrors.targetGroups}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={formState.description}
                  onChange={(e) =>
                    handleFieldChange("description", e.target.value)
                  }
                  rows={5}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    formErrors.description
                      ? "border-red-400"
                      : "border-gray-200"
                  } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                />
                {formErrors.description && (
                  <p className="text-xs text-red-600">
                    {formErrors.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <button
                  type="submit"
                  disabled={isSavingChanges}
                  className="flex-1 md:flex-none inline-flex items-center gap-2 justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                >
                  {isSavingChanges ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? "Removing..." : "Delete Opportunity"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <p className="text-gray-700 leading-relaxed">
                {opportunity.description}
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={handleApply}
                  disabled={isApplying || isApplied || isExpired || needsGroup}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isApplied
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  } ${needsGroup ? "opacity-60 cursor-not-allowed" : ""}`}
                  title={
                    needsGroup
                      ? "Join a group to apply"
                      : isApplied
                        ? "Already applied"
                        : "Apply Now"
                  }
                  type="button"
                >
                  {isApplied ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  {isApplied
                    ? "Already Applied"
                    : isExpired
                      ? "Expired"
                      : isApplying
                        ? "Applying..."
                        : "Apply Now"}
                </button>
                <button
                  onClick={handleToggleSave}
                  disabled={isSavingForLater || needsGroup}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition ${
                    isSaved
                      ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                      : "text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                  } ${needsGroup ? "opacity-60 cursor-not-allowed" : ""}`}
                  title={
                    needsGroup
                      ? "Please join a group to save opportunities"
                      : isSaved
                        ? "Saved"
                        : "Save for later"
                  }
                  type="button"
                >
                  <Bookmark className="w-4 h-4" />
                  {isSavingForLater
                    ? "Updating..."
                    : isSaved
                      ? "Saved"
                      : "Save for later"}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {appliedCount} student{appliedCount === 1 ? "" : "s"} applied
              </p>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                <a
                  href={opportunity.applyLink}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-indigo-600"
                >
                  Open application page
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpportunityDetail;
