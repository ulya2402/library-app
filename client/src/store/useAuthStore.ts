import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Member {
  id: string;
  full_name: string;
  identity_number: string;
  role: string;
}

interface AuthState {
  user: Member | null;
  login: (userData: Member) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (userData) => set({ user: userData }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'library-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);