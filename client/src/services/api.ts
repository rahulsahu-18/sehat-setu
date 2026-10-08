import axios from "axios";

const configuredBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();
if (import.meta.env.PROD && !configuredBaseURL) {
  throw new Error("VITE_API_BASE_URL must be set for production builds.");
}

const baseURL = configuredBaseURL || "http://localhost:5000/api/v1";
const parsedBaseURL = new URL(baseURL);
if (!["http:", "https:"].includes(parsedBaseURL.protocol)) {
  throw new Error(
    "VITE_API_BASE_URL must use HTTP or HTTPS. Ensure that the API URL is valid.",
  );
}
if (import.meta.env.PROD && parsedBaseURL.protocol !== "https:") {
  throw new Error("VITE_API_BASE_URL must use HTTPS in production.");
}

const api = axios.create({
  baseURL: parsedBaseURL.toString().replace(/\/$/, ""),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
