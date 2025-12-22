import { create } from 'zustand';

const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  messages: [],
  isLoading: false,
  pluginStatus: { connected: false, message: 'Plugin not connected' },

  setProjects: (projects) => set({ projects }),
  
  addProject: (project) => set((state) => ({
    projects: [project, ...state.projects]
  })),

  removeProject: (projectId) => set((state) => ({
    projects: state.projects.filter(p => p.id !== projectId),
    currentProject: state.currentProject?.id === projectId ? null : state.currentProject
  })),

  setCurrentProject: (project) => set({ currentProject: project, messages: [] }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  addMessages: (newMessages) => set((state) => ({
    messages: [...state.messages, ...newMessages]
  })),

  setLoading: (isLoading) => set({ isLoading }),

  setPluginStatus: (status) => set({ pluginStatus: status }),

  clearCurrentProject: () => set({ currentProject: null, messages: [] }),
}));

export default useProjectStore;
