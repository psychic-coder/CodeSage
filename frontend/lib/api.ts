import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("codesage_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      sessionStorage.removeItem("codesage_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (email: string, password: string, name?: string) =>
    api.post("/auth/register", { email, password, name }),
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  github: (access_token: string) =>
    api.post("/auth/github", { access_token }),
  me: () => api.get("/auth/me"),
};

export const projectsAPI = {
  list: () => api.get("/projects"),
  create: (data: { name: string; description?: string; source_type: string; source_url?: string }) =>
    api.post("/projects", data),
  get: (id: string) => api.get(`/projects/${id}`),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  reanalyze: (id: string) => api.post(`/projects/${id}/reanalyze`),
};

export const ingestAPI = {
  github: (project_id: string, url: string, github_token?: string) =>
    api.post("/ingest/github", { project_id, url, github_token }),
  zip: (project_id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("project_id", project_id);
    return api.post("/ingest/zip", form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  local: (project_id: string, local_path: string) =>
    api.post("/ingest/local", { project_id, local_path }),
};

export const analysisAPI = {
  impact: (project_id: string, feature_description: string, session_id?: string, conversation_history?: any[]) =>
    api.post("/analysis/impact", { project_id, feature_description, session_id, conversation_history }),
  propagation: (project_id: string, file_path: string, change_type = "modify") =>
    api.post("/analysis/propagation", { project_id, file_path, change_type }),
  architecture: (project_id: string) =>
    api.get(`/analysis/architecture/${project_id}`),
  improvements: (project_id: string, categories?: string) =>
    api.get(`/analysis/improvements/${project_id}`, { params: { categories } }),
  recommendations: (project_id: string) =>
    api.get(`/analysis/recommendations/${project_id}`),
  onboarding: (project_id: string, topic: string) =>
    api.post("/analysis/onboarding", { project_id, topic }),
};

export const graphAPI = {
  nodes: (project_id: string, skip = 0, limit = 200) =>
    api.get(`/graph/${project_id}/nodes`, { params: { skip, limit } }),
  edges: (project_id: string, skip = 0, limit = 500) =>
    api.get(`/graph/${project_id}/edges`, { params: { skip, limit } }),
  subgraph: (project_id: string, file_path: string, hops = 2) =>
    api.get(`/graph/${project_id}/subgraph`, { params: { file_path, hops } }),
  stats: (project_id: string) =>
    api.get(`/graph/${project_id}/stats`),
  cycles: (project_id: string) =>
    api.get(`/graph/${project_id}/cycles`),
};

export const queryAPI = {
  ask: (project_id: string, query: string) =>
    api.post("/query", { project_id, query }),
};
