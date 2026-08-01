// Lazy route loader that survives redeploys. When a deploy replaces the hashed
// chunks while a tab still holds the old index.html, dynamic imports 404 —
// reloading once fetches the fresh index. sessionStorage guards against loops.

import { lazy, type ComponentType } from 'react';

export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem('chunk-reload');
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem('chunk-reload')) {
        sessionStorage.setItem('chunk-reload', '1');
        window.location.reload();
        // Keep suspense pending while the reload happens.
        return new Promise<never>(() => {});
      }
      throw err;
    }
  });
}
