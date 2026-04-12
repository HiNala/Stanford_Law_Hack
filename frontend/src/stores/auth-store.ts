/**
 * Zustand store for authentication state.
 */

import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("clauseguard_token", token);
      localStorage.setItem("clauseguard_user", JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("clauseguard_token");
      localStorage.removeItem("clauseguard_user");
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("clauseguard_token");
    const userStr = localStorage.getItem("clauseguard_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true });
      } catch {
        set({ user: null, token: null, isAuthenticated: false });
      }
    }
  },
}));
