import axios from "axios";

/** Shared Axios instance. Vite proxies /api to the FastAPI server in development. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "/api",
  timeout: 10000,
});

/** GET /health. A 503 still carries a JSON body describing what is down, so return it. */
export async function getHealth() {
  const res = await api.get("/health", { validateStatus: (s) => s === 200 || s === 503 });
  return res.data;
}

export async function getModelHealth() {
  const res = await api.get("/health/models");
  return res.data;
}
