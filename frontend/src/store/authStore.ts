import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; email: string } | null;
  login: (user: { id: string; email: string }) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  login: (user) => set({ isAuthenticated: true, user }),
  logout: () => set({ isAuthenticated: false, user: null }),
}));

export default useAuthStore;