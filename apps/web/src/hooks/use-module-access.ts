'use client';

import { useEffect, useCallback } from 'react';
import { useModuleAccessStore } from '@/stores/module-access-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';

interface UiConfigResponse {
  activeModules: string[];
  allowedPages: string[];
  roleTemplate: string;
  navigation: {
    group: string;
    groupTh?: string;
    items: { label: string; labelTh?: string; href: string }[];
  }[];
}

/**
 * Hook that fetches and caches the user's UI visibility config.
 * Combines tenant's active modules with the user's role template
 * to determine which modules, pages, and navigation items are visible.
 */
export function useModuleAccess() {
  const token = useAuthStore((s) => s.token);
  const { activeModules, allowedPages, navigation, loaded, loading, setConfig, setLoading, reset } =
    useModuleAccessStore();

  useEffect(() => {
    if (!token || loaded || loading) return;

    setLoading(true);
    api
      .get<UiConfigResponse>('/ui/config')
      .then((data) => {
        setConfig(data);
      })
      .catch(() => {
        // On failure, fall back to showing everything (graceful degradation)
        setConfig({
          activeModules: [],
          allowedPages: ['*'],
          roleTemplate: 'system_admin',
          navigation: [],
        });
      });
  }, [token, loaded, loading, setConfig, setLoading]);

  // Reset when user logs out
  useEffect(() => {
    if (!token && loaded) {
      reset();
    }
  }, [token, loaded, reset]);

  const isModuleActive = useCallback(
    (moduleCode: string): boolean => {
      if (!loaded) return true; // Show everything until config loads
      if (activeModules.length === 0) return true; // Fallback: no restrictions
      return activeModules.includes(moduleCode);
    },
    [loaded, activeModules],
  );

  const isPageAllowed = useCallback(
    (path: string): boolean => {
      if (!loaded) return true;
      if (allowedPages.length === 0) return true;
      for (const pattern of allowedPages) {
        if (pattern === '*') return true;
        if (pattern === path) return true;
        if (pattern.endsWith('/*')) {
          const prefix = pattern.slice(0, -2);
          if (path === prefix || path.startsWith(`${prefix}/`)) return true;
        }
      }
      return false;
    },
    [loaded, allowedPages],
  );

  return {
    isModuleActive,
    isPageAllowed,
    activeModules,
    allowedPages,
    navigation,
    loaded,
    loading,
  };
}
