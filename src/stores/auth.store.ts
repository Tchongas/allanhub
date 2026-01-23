import { create } from 'zustand';
import { User, UserProduct } from '@/types';

interface AuthStoreState {
  user: User | null;
  products: UserProduct[];
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setProducts: (products: UserProduct[]) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  products: [],
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    isLoading: false,
  }),

  setProducts: (products) => set({ products }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () => set({
    user: null,
    products: [],
    isAuthenticated: false,
  }),
}));
