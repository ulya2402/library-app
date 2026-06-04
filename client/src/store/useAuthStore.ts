import { create } from 'zustand';

interface Member {
  id: string;
  full_name: string;
  identity_number: string;
}

interface AuthState {
  user: Member | null;
  login: (userData: Member) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: (userData) => set({ user: userData }),
  logout: () => set({ user: null }),
}));