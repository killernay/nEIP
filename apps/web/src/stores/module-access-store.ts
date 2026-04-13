'use client';

import { create } from 'zustand';

export interface ModuleNavItem {
  label: string;
  labelTh?: string;
  href: string;
}

export interface ModuleNavGroup {
  group: string;
  groupTh?: string;
  items: ModuleNavItem[];
}

interface ModuleAccessState {
  activeModules: string[];
  allowedPages: string[];
  roleTemplate: string | null;
  navigation: ModuleNavGroup[];
  loaded: boolean;
  loading: boolean;
  setConfig: (config: {
    activeModules: string[];
    allowedPages: string[];
    roleTemplate: string;
    navigation: ModuleNavGroup[];
  }) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useModuleAccessStore = create<ModuleAccessState>()((set) => ({
  activeModules: [],
  allowedPages: [],
  roleTemplate: null,
  navigation: [],
  loaded: false,
  loading: false,
  setConfig: (config) =>
    set({
      activeModules: config.activeModules,
      allowedPages: config.allowedPages,
      roleTemplate: config.roleTemplate,
      navigation: config.navigation,
      loaded: true,
      loading: false,
    }),
  setLoading: (loading) => set({ loading }),
  reset: () =>
    set({
      activeModules: [],
      allowedPages: [],
      roleTemplate: null,
      navigation: [],
      loaded: false,
      loading: false,
    }),
}));
