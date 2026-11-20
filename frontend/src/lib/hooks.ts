'use client';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from './api-client';

/**
 * Mutation wrapper used by every write action: shows a success/error toast and refreshes the
 * affected queries so the UI always reflects the server's state (never optimistic for money).
 */
export function useApiMutation<TVars, TResult>(
  fn: (v: TVars) => Promise<TResult>,
  opts: {
    success?: string | ((r: TResult, v: TVars) => string);
    successDescription?: string;
    invalidate?: QueryKey[];
    onSuccess?: (r: TResult, v: TVars) => void;
    silentError?: boolean;
  } = {},
) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r, v) => {
      await Promise.all((opts.invalidate ?? []).map((k) => qc.invalidateQueries({ queryKey: k })));
      if (opts.success) toast({ tone: 'success', title: typeof opts.success === 'function' ? opts.success(r, v) : opts.success, description: opts.successDescription });
      opts.onSuccess?.(r, v);
    },
    onError: (e) => {
      if (!opts.silentError) toast({ tone: 'error', title: 'That didn’t work', description: errorMessage(e) });
    },
  });
}

/** Local record of applications to approval-based campaigns (backend has no affiliate list endpoint yet). */
const APPS_KEY = 'flyover.myApplications';
export type LocalApplication = { status: 'PENDING' | 'APPROVED' | 'REJECTED'; at: string; campaignName: string };
export const localApplications = {
  all(): Record<string, LocalApplication> {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(APPS_KEY) || '{}');
    } catch {
      return {};
    }
  },
  set(campaignId: string, a: LocalApplication) {
    try {
      localStorage.setItem(APPS_KEY, JSON.stringify({ ...this.all(), [campaignId]: a }));
    } catch {
      /* ignore */
    }
  },
};
