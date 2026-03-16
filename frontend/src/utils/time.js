const DAY_MS = 1000 * 60 * 60 * 24;
const HOUR_MS = 1000 * 60 * 60;
const MINUTE_MS = 1000 * 60;

const getValidDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatRelativeTime = (timestamp) => {
  const date = getValidDate(timestamp);
  if (!date) return "Unknown time";

  const diff = Date.now() - date.getTime();
  if (diff < 0) return "In the future";

  const days = Math.floor(diff / DAY_MS);
  if (days >= 1) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(diff / HOUR_MS);
  if (hours >= 1) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const minutes = Math.max(1, Math.floor(diff / MINUTE_MS));
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
};

export const formatFullDate = (timestamp) => {
  const date = getValidDate(timestamp);
  if (!date) return "Unknown date";
  return date.toLocaleString();
};

export const getDeadlineStatus = (deadline) => {
  const date = getValidDate(deadline);
  if (!date) {
    return { label: "Deadline not set", variant: "gray" };
  }

  const diffMs = date.getTime() - Date.now();
  if (diffMs < 0) {
    return { label: "Expired", variant: "red" };
  }

  const days = Math.floor(diffMs / DAY_MS);
  if (days >= 1) {
    if (days <= 3) {
      return {
        label: `Closing in ${days}d`,
        variant: "red",
      };
    }
    return {
      label: `Deadline: ${date.toLocaleDateString()}`,
      variant: "gray",
    };
  }

  const hours = Math.ceil(diffMs / HOUR_MS);
  const variant = hours <= 6 ? "red" : "gray";
  return {
    label: `Closing in ${hours}h`,
    variant,
  };
};
