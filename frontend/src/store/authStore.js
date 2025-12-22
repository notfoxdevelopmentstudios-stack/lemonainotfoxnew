import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      theme: 'dark',

      setAuth: (user, token) => {
        set({ 
          user, 
          token, 
          isAuthenticated: true,
          theme: user?.theme || 'dark'
        });
      },

      logout: () => {
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          theme: 'dark'
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData }
        }));
      },

      setTheme: (theme) => {
        set({ theme });
        // Also update user if authenticated
        const state = get();
        if (state.user) {
          set((state) => ({
            user: { ...state.user, theme }
          }));
        }
      },

      getAuthHeader: () => {
        const { token } = get();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    {
      name: 'notfox-auth',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated,
        theme: state.theme
      }),
    }
  )
);

export default useAuthStore;
