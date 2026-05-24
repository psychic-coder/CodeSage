import { create } from "zustand";
import type { User, Project } from "@/types";

interface AppState {
  user: User | null;
  token: string | null;
  projects: Project[];
  currentProject: Project | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: null,
  projects: [],
  currentProject: null,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) sessionStorage.setItem("codesage_token", token);
    else sessionStorage.removeItem("codesage_token");
    set({ token });
  },
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  logout: () => {
    sessionStorage.removeItem("codesage_token");
    set({ user: null, token: null, projects: [], currentProject: null });
  },
}));
