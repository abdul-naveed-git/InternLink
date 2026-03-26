import { toast } from "react-hot-toast";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

const isPlainObject = (value) =>
  value != null &&
  typeof value === "object" &&
  !(value instanceof FormData) &&
  !(value instanceof URLSearchParams);

const serializeBody = (value) =>
  isPlainObject(value) ? JSON.stringify(value) : value;

const parseResponsePayload = async (response) => {
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  return null;
};

let isRefreshing = false;
let refreshPromise = null;

export const apiFetch = async (path, options = {}) => {
  const {
    headers = {},
    body,
    suppressGlobalErrorToast = false,
    ...rest
  } = options;

  const requestBody = serializeBody(body);
  const inferredHeaders =
    isPlainObject(body) && !headers["Content-Type"]
      ? { "Content-Type": "application/json" }
      : {};
  const finalHeaders = { ...inferredHeaders, ...headers };

  const buildRequest = () => {
    const requestOptions = {
      credentials: "include",
      headers: finalHeaders,
      ...rest,
    };
    if (requestBody !== undefined) {
      requestOptions.body = requestBody;
    }
    return fetch(`${API_BASE_URL}${path}`, requestOptions);
  };

  const makeRequest = async () => {
    const response = await buildRequest();
    return {
      response,
      payload: await parseResponsePayload(response),
    };
  };

  let { response, payload } = await makeRequest();

  if (response.status === 401 && !path.includes("/auth/refresh")) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      })
        .then((refreshResponse) => {
          if (!refreshResponse.ok) {
            throw new Error("Refresh failed");
          }
          return refreshResponse.json().catch(() => null);
        })
        .finally(() => {
          isRefreshing = false;
        });
    }
    try {
      await refreshPromise;
      ({ response, payload } = await makeRequest());
    } catch (err) {
      if (!suppressGlobalErrorToast) {
        toast.error("Session refresh failed. Please log in again.");
      }
      throw err;
    }
  }

  const message =
    (payload && typeof payload === "object" && payload.message) ||
    response.statusText ||
    "Server error";

  const hasFailure =
    !response.ok ||
    (payload && typeof payload === "object" && payload.success === false);

  if (hasFailure) {
    const error = new Error(message);
    error.status = response.status;
    error.code = payload?.code;
    error.payload = payload;
    error.needsLogin = payload?.needsLogin ?? response.status === 401;
    if (error.needsLogin && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sessionExpired", {
          detail: { needsLogin: true },
        }),
      );
    }
    if (!suppressGlobalErrorToast) {
      toast.error(message);
    }
    throw error;
  }

  return payload;
};
