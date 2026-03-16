export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

const getStatusType = (status) => {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  return "error";
};

const readPayload = async (response) => {
  const clone = response.clone();
  const contentType = clone.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await clone.json();
    } catch {
      // fallback to text below
    }
  }

  try {
    return await clone.text();
  } catch {
    return null;
  }
};

const dispatchApiStatus = async (response) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload = await readPayload(response);
    const statusType = getStatusType(response.status);
    const message =
      (payload &&
        typeof payload === "object" &&
        payload.message &&
        payload.message.toString()) ||
      (typeof payload === "string" && payload) ||
      response.statusText ||
      "Server error";

    const detail = {
      status: response.status,
      type: statusType,
      code: payload?.code ?? statusType,
      needsLogin: payload?.needsLogin ?? response.status === 401,
      message,
      payload,
    };

    window.dispatchEvent(new CustomEvent("apiStatus", { detail }));
  } catch (err) {
    console.error("Unable to dispatch API status", err);
  }
};

export const apiFetch = async (path, options = {}) => {
  const { headers = {}, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...rest,
  });

  if (!response.ok) {
    await dispatchApiStatus(response);
  }

  return response;
};
