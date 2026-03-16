import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Opportunitycard from "./Opportunitycard.jsx";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { PlusCircle, FileText, PieChart, Users, Download } from "lucide-react";
import { apiFetch } from "../src/api.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatFullDate, formatRelativeTime } from "../src/utils/time.js";

const DEFAULT_FILTERS = {
  company: "",
  postedStart: "",
  postedEnd: "",
  deadlineStart: "",
  deadlineEnd: "",
  selectedGroups: [],
  applicationMin: "",
  applicationMax: "",
  opportunityType: "all",
  postedBy: "all",
};

export const AdminDashboard = ({
  user,
  opportunities,
  groups,
  onAddOpportunity,
  onDeleteOpportunity,
  onViewDetails,
}) => {
  const [activeTab, setActiveTab] = useState("listings");
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS }));
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [students, setStudents] = useState([]);
  const [studentsError, setStudentsError] = useState("");

  const currentUserId = user?._id;
  const normalizedUserId = currentUserId ? String(currentUserId) : "";
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.role) return;
    let isMounted = true;

    const loadStudents = async () => {
      setStudentsError("");
      try {
        const response = await apiFetch("/users");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || "Unable to load student data.");
        }
        if (isMounted) {
          setStudents(Array.isArray(data) ? data : []);
          setStudentsError("");
        }
      } catch (err) {
        if (isMounted) {
          setStudents([]);
          setStudentsError(err.message || "Unable to load student data.");
        }
      }
    };

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const studentLookup = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      if (student && student._id) {
        map.set(String(student._id), student.name);
      }
    });
    return map;
  }, [students]);

  const resolveUserNames = (entries) => {
    if (!Array.isArray(entries) || !entries.length) {
      return "None";
    }
    const names = entries
      .map((entry) => {
        if (!entry) return null;
        if (typeof entry === "string") return studentLookup.get(entry) || entry;
        if (entry.name) return entry.name;
        if (entry._id) return entry.name || String(entry._id);
        return String(entry);
      })
      .filter(Boolean);
    return names.length ? names.join(", ") : "None";
  };

  const toDate = (value, endOfDay = false) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  };

  const filteredOpportunities = useMemo(() => {
    const companyTerm = filters.company.trim().toLowerCase();
    const postedStart = toDate(filters.postedStart);
    const postedEnd = toDate(filters.postedEnd, true);
    const deadlineStart = toDate(filters.deadlineStart);
    const deadlineEnd = toDate(filters.deadlineEnd, true);
    const minApplications =
      filters.applicationMin === "" ? null : Number(filters.applicationMin);
    const maxApplications =
      filters.applicationMax === "" ? null : Number(filters.applicationMax);

    return opportunities.filter((opp) => {
      if (companyTerm && !opp.company?.toLowerCase().includes(companyTerm)) {
        return false;
      }

      if (
        filters.opportunityType !== "all" &&
        opp.category !== filters.opportunityType
      ) {
        return false;
      }

      if (filters.selectedGroups.length) {
        const targetIds = (opp.targetGroups || []).map((id) => String(id));
        const hasGroup = filters.selectedGroups.some((groupId) =>
          targetIds.includes(String(groupId)),
        );
        if (!hasGroup) {
          return false;
        }
      }

      const createdAt = toDate(opp.createdAt);
      if (postedStart && (!createdAt || createdAt < postedStart)) {
        return false;
      }
      if (postedEnd && (!createdAt || createdAt > postedEnd)) {
        return false;
      }

      const deadline = toDate(opp.deadline);
      if (deadlineStart && (!deadline || deadline < deadlineStart)) {
        return false;
      }
      if (deadlineEnd && (!deadline || deadline > deadlineEnd)) {
        return false;
      }

      const applicationCount = Array.isArray(opp.appliedBy)
        ? opp.appliedBy.length
        : 0;
      if (minApplications !== null && applicationCount < minApplications) {
        return false;
      }
      if (maxApplications !== null && applicationCount > maxApplications) {
        return false;
      }

      const creatorId = String(opp.createdBy?._id ?? opp.createdBy ?? "");
      if (filters.postedBy === "me" && creatorId !== normalizedUserId) {
        return false;
      }
      if (filters.postedBy === "others" && creatorId === normalizedUserId) {
        return false;
      }

      return true;
    });
  }, [filters, normalizedUserId, opportunities]);

  const filteredCount = filteredOpportunities.length;

  const categoryData = [
    {
      name: "Internship",
      value: filteredOpportunities.filter((o) => o.category === "internship")
        .length,
    },
    {
      name: "Job",
      value: filteredOpportunities.filter((o) => o.category === "job").length,
    },
    {
      name: "Hackathon",
      value: filteredOpportunities.filter((o) => o.category === "hackathon")
        .length,
    },
  ];

  const groupData = groups.map((g) => {
    const key = String(g._id);
    const applications = filteredOpportunities.reduce((acc, curr) => {
      const targetIds = (curr.targetGroups || []).map((id) => String(id));
      return targetIds.includes(key)
        ? acc + (curr.appliedBy?.length ?? 0)
        : acc;
    }, 0);
    return { name: g.name, applications };
  });

  const COLORS = ["#4f46e5", "#8b5cf6", "#10b981", "#f59e0b"];
  const baseFieldClasses =
    "w-full px-3 py-2 rounded-lg outline-none transition-all text-sm";
  const normalFieldBorder =
    "border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
  const errorFieldBorder =
    "border border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500";

  const handleDownloadFiltered = () => {
    if (!filteredCount) return;

    const rows = filteredOpportunities.map((opp) => {
      const appliedCount = opp.appliedBy?.length ?? 0;
      const savedCount = opp.savedBy?.length ?? 0;
      return {
        Title: opp.title,
        Company: opp.company,
        Category: opp.category,
        Deadline: opp.deadline
          ? new Date(opp.deadline).toLocaleDateString()
          : "Not set",
        "Applications Count": appliedCount,
        "Applied Users": resolveUserNames(opp.appliedBy),
        "Saved Users": resolveUserNames(opp.savedBy),
        "Saved Count": savedCount,
        "Created By": opp.createdBy?.name ?? "Unknown",
        "Posted On": formatFullDate(opp.createdAt),
        "Target Groups": opp.targetGroups?.length ?? 0,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Opportunities");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(
      fileData,
      `filtered-opportunities-${new Date().toISOString().slice(0, 19)}.xlsx`,
    );
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const toggleGroupFilter = (groupId) => {
    setFilters((prev) => {
      const exists = prev.selectedGroups.includes(groupId);
      return {
        ...prev,
        selectedGroups: exists
          ? prev.selectedGroups.filter((id) => id !== groupId)
          : [...prev.selectedGroups, groupId],
      };
    });
  };

  const resetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS, selectedGroups: [] });
  };

  const composeFieldClasses = (field) =>
    `${baseFieldClasses} ${
      formErrors[field] ? errorFieldBorder : normalFieldBorder
    }`;

  const clearFieldError = (field) => {
    if (!formErrors[field]) {
      return;
    }
    setFormErrors((prev) => {
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
    setSubmitError("");
  };

  const isValidUrl = (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const validateOpportunity = ({
    title,
    company,
    category,
    deadline,
    applyLink,
    targetGroups,
    description,
  }) => {
    const errors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!title?.trim()) {
      errors.title = "Position title is required.";
    } else if (title.trim().length < 3) {
      errors.title = "Position title must be at least 3 characters.";
    }

    if (!company?.trim()) {
      errors.company = "Company name is required.";
    }

    if (!category) {
      errors.category = "Select a category.";
    }

    if (!deadline) {
      errors.deadline = "Choose a deadline date.";
    } else if (new Date(deadline) < today) {
      errors.deadline = "Deadline cannot be in the past.";
    }

    if (!applyLink?.trim()) {
      errors.applyLink = "Application link is required.";
    } else if (!isValidUrl(applyLink.trim())) {
      errors.applyLink = "Provide a valid URL.";
    }

    if (!targetGroups?.length) {
      errors.targetGroups = "Select at least one target group.";
    }

    if (!description?.trim()) {
      errors.description = "Provide a short description.";
    } else if (description.trim().length < 25) {
      errors.description = "Description should be at least 25 characters.";
    }

    return errors;
  };

  const handlePostSubmit = (e) => {
    e.preventDefault();
    setSubmitError("");
    setFormErrors({});

    const formData = new FormData(e.currentTarget);
    const payload = {
      title: formData.get("title"),
      company: formData.get("company"),
      category: formData.get("category"),
      description: formData.get("description"),
      deadline: formData.get("deadline"),
      applyLink: formData.get("applyLink"),
      targetGroups: Array.from(formData.getAll("targetGroups")).filter(Boolean),
    };

    const errors = validateOpportunity(payload);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      setSubmitError("Please resolve highlighted fields before posting.");
      return;
    }

    onAddOpportunity(payload);
    e.currentTarget.reset();
    handleTabChange("listings");
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setFormErrors({});
    setSubmitError("");
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Postings",
            value: opportunities.length,
            icon: FileText,
            color: "text-indigo-600",
          },
          {
            label: "Total Applications",
            value: opportunities.reduce((s, o) => s + o.appliedBy.length, 0),
            icon: Users,
            color: "text-green-600",
          },
          {
            label: "Active Groups",
            value: groups.length,
            icon: PieChart,
            color: "text-purple-600",
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold ${stat.color} mt-1`}>
                  {stat.value}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {user.role === "admin" && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm font-semibold text-gray-700">
            Admin-only tools
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/admin/groups")}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition"
              type="button"
            >
              Manage groups
            </button>
            <button
              onClick={() => navigate("/admin/teachers")}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition"
              type="button"
            >
              Create teacher
            </button>
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-200 gap-8">
        {[
          { id: "listings", label: "Manage Opportunities", icon: FileText },
          { id: "analytics", label: "Detailed Analytics", icon: PieChart },
          { id: "post", label: "Post Opportunity", icon: PlusCircle },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 py-4 px-1 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "listings" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Live Postings
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opportunities.map((o) => (
                <Opportunitycard
                  key={o._id}
                  user={user}
                  opportunity={o}
                  onDelete={onDeleteOpportunity}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-md font-semibold text-gray-900">
                    Detailed filters
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Showing {filteredCount} of {opportunities.length} postings.
                  </p>
                  {studentsError && (
                    <p className="text-xs text-red-600 mt-1">
                      {studentsError} Exported sheets will fall back to IDs
                      until the student list loads.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full border border-gray-200 hover:bg-gray-200"
                  >
                    Reset filters
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadFiltered}
                    disabled={!filteredCount}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-full transition ${
                      filteredCount
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    Download filtered
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Company
                  </label>
                  <input
                    type="text"
                    placeholder="Search by company"
                    value={filters.company}
                    onChange={(e) =>
                      handleFilterChange("company", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Posted range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={filters.postedStart}
                      onChange={(e) =>
                        handleFilterChange("postedStart", e.target.value)
                      }
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <input
                      type="date"
                      value={filters.postedEnd}
                      onChange={(e) =>
                        handleFilterChange("postedEnd", e.target.value)
                      }
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Deadline range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={filters.deadlineStart}
                      onChange={(e) =>
                        handleFilterChange("deadlineStart", e.target.value)
                      }
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <input
                      type="date"
                      value={filters.deadlineEnd}
                      onChange={(e) =>
                        handleFilterChange("deadlineEnd", e.target.value)
                      }
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Applications
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={filters.applicationMin}
                      onChange={(e) =>
                        handleFilterChange("applicationMin", e.target.value)
                      }
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Max"
                      value={filters.applicationMax}
                      onChange={(e) =>
                        handleFilterChange("applicationMax", e.target.value)
                      }
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Opportunity type
                  </label>
                  <select
                    value={filters.opportunityType}
                    onChange={(e) =>
                      handleFilterChange("opportunityType", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="all">All types</option>
                    <option value="internship">Internship</option>
                    <option value="job">Full-time Job</option>
                    <option value="hackathon">Hackathon</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Posted by
                  </label>
                  <select
                    value={filters.postedBy}
                    onChange={(e) =>
                      handleFilterChange("postedBy", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="all">All teachers</option>
                    <option value="me">Me only</option>
                    <option value="others">Other teachers</option>
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Groups
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2 p-3 border border-gray-200 rounded-xl bg-gray-50">
                    {groups.map((group) => {
                      const id = String(group._id);
                      const isSelected = filters.selectedGroups.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleGroupFilter(id)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-400"
                              : "bg-white text-gray-600 border-gray-200 hover:border-indigo-200"
                          }`}
                        >
                          {group.name} ({group.branch || "General"})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-md font-semibold text-gray-900 mb-6">
                  Opportunities by Category
                </h3>
                <div className="h-64 w-full  h-[260px] min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-md font-semibold text-gray-900 mb-6">
                  Applications per Group
                </h3>
                <div className="h-64 w-full  h-[260px] min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groupData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="applications"
                        fill="#4f46e5"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-gray-900">
                  Filtered opportunity list
                </h3>
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  {filteredCount} matched
                </span>
              </div>

              {filteredCount ? (
                <div className="space-y-4">
                  {filteredOpportunities.map((opp) => (
                    <div
                      key={opp._id}
                      className="border border-gray-200 rounded-2xl p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {opp.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {opp.company} · {opp.category}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span>
                              Posted by {opp.createdBy?.name ?? "Admin"}
                            </span>
                            <span className="text-gray-300">·</span>
                            <span>{formatRelativeTime(opp.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>
                            {opp.appliedBy?.length ?? 0} application
                            {(opp.appliedBy?.length ?? 0) === 1 ? "" : "s"}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span>
                            Deadline{" "}
                            {opp.deadline
                              ? new Date(opp.deadline).toLocaleDateString()
                              : "Not set"}
                          </span>
                          <button
                            onClick={() => onViewDetails?.(opp._id)}
                            className="px-3 py-1 text-xs font-semibold text-indigo-600 rounded-full border border-indigo-100 hover:bg-indigo-50"
                            type="button"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No opportunities match the selected filters.
                </p>
              )}
            </section>
          </div>
        )}

        {activeTab === "post" && (
          <div className="max-w-3xl bg-white p-8 rounded-xl border border-gray-100 shadow-sm mx-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              Post New Opportunity
            </h3>
            <form onSubmit={handlePostSubmit} className="space-y-4">
              {submitError && (
                <div
                  className="px-3 py-2 rounded-lg text-sm text-red-700 bg-red-50 border border-red-100"
                  role="alert"
                  aria-live="assertive"
                >
                  {submitError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Position Title
                  </label>
                  <input
                    name="title"
                    aria-invalid={formErrors.title ? "true" : undefined}
                    className={composeFieldClasses("title")}
                    placeholder="e.g. SDE Intern"
                    onChange={() => clearFieldError("title")}
                  />
                  {formErrors.title && (
                    <p className="text-xs text-red-600 mt-1">
                      {formErrors.title}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Company Name
                  </label>
                  <input
                    name="company"
                    aria-invalid={formErrors.company ? "true" : undefined}
                    className={composeFieldClasses("company")}
                    placeholder="e.g. Google"
                    onChange={() => clearFieldError("company")}
                  />
                  {formErrors.company && (
                    <p className="text-xs text-red-600 mt-1">
                      {formErrors.company}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    name="category"
                    aria-invalid={formErrors.category ? "true" : undefined}
                    className={composeFieldClasses("category")}
                    onChange={() => clearFieldError("category")}
                  >
                    <option value={"internship"}>Internship</option>
                    <option value={"job"}>Full-time Job</option>
                    <option value={"hackathon"}>Hackathon</option>
                  </select>
                  {formErrors.category && (
                    <p className="text-xs text-red-600 mt-1">
                      {formErrors.category}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Deadline Date
                  </label>
                  <input
                    name="deadline"
                    type="date"
                    aria-invalid={formErrors.deadline ? "true" : undefined}
                    className={composeFieldClasses("deadline")}
                    onChange={() => clearFieldError("deadline")}
                  />
                  {formErrors.deadline && (
                    <p className="text-xs text-red-600 mt-1">
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
                  name="applyLink"
                  type="url"
                  aria-invalid={formErrors.applyLink ? "true" : undefined}
                  className={composeFieldClasses("applyLink")}
                  placeholder="https://company.com/careers/..."
                  onChange={() => clearFieldError("applyLink")}
                />
                {formErrors.applyLink && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.applyLink}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Target Groups
                </label>
                <div
                  className={`grid grid-cols-2 gap-2 mt-2 p-2 rounded-lg ${
                    formErrors.targetGroups
                      ? "border border-red-300"
                      : "border border-gray-200"
                  }`}
                >
                  {groups.map((g) => (
                    <label
                      key={g._id}
                      className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="targetGroups"
                        value={g._id}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        onChange={() => clearFieldError("targetGroups")}
                      />
                      <span className="text-sm text-gray-600">
                        {g.name} ({g.branch})
                      </span>
                    </label>
                  ))}
                </div>
                {formErrors.targetGroups && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.targetGroups}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={4}
                  className={`${composeFieldClasses("description")} resize-none`}
                  placeholder="Enter roles, responsibilities, and eligibility criteria..."
                  aria-invalid={formErrors.description ? "true" : undefined}
                  onChange={() => clearFieldError("description")}
                ></textarea>
                {formErrors.description && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.description}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Post Now
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
