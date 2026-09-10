'use client';
import { useCallback } from 'react';
import api from '@/lib/api';

/**
 * Lightweight hook — call logActivity('expense' | 'investment')
 * after any successful save. Fire-and-forget: never blocks UI.
 */
export function useActivity() {
  const logActivity = useCallback((type: 'expense' | 'investment' = 'expense') => {
    api.post('/score/activity', { type }).catch(() => {});
  }, []);

  return { logActivity };
}
