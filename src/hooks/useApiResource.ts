"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ApiResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: (opts?: { silent?: boolean }) => void;
};

/**
 * Fetches `url` on mount and whenever `url` changes. Pass `null` to skip
 * fetching (e.g. while a required id/query param isn't ready yet).
 *
 * `refetch({ silent: true })` re-runs the fetch without toggling `loading`
 * — use it after a mutation when the page should update in place instead
 * of re-showing a loading state.
 */
export function useApiResource<T = unknown>(
  url: string | null,
): ApiResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(url !== null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);
  // Set by `refetch({ silent: true })` immediately before bumping `token`,
  // and consumed (then cleared) the next time the effect below runs. A ref
  // is used instead of state so the flag can't outlive the single run it
  // was meant for — a later effect run triggered by `url` changing on its
  // own always sees it reset to false.
  const silentRef = useRef(false);

  useEffect(() => {
    if (url === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: clears the loading flag when `url` transitions from non-null to null (e.g. a page's required id/query param disappears); the initial-mount case with url already null is covered by useState's initializer above
      setLoading(false);
      return;
    }

    let cancelled = false;
    const silent = silentRef.current;
    silentRef.current = false;
    if (!silent) setLoading(true);
    setError(null);

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `Request to ${url} failed`);
        }
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Request failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, token]);

  const refetch = useCallback((opts?: { silent?: boolean }) => {
    silentRef.current = !!opts?.silent;
    setToken((t) => t + 1);
  }, []);

  return { data, loading, error, refetch };
}

export type ApiMutationState<TInput, TOutput> = {
  mutate: (url: string, body?: TInput) => Promise<TOutput>;
  mutating: boolean;
  error: string | null;
};

/**
 * Wraps a single fetch call with normalized loading/error state. `mutate`
 * resolves with the parsed JSON response on a 2xx status, or throws an
 * Error (message taken from the server's `.error` field when present) on
 * a non-2xx response. Does not parse/require a request body — pass one
 * only when the endpoint expects one.
 */
export function useApiMutation<TInput = unknown, TOutput = unknown>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
): ApiMutationState<TInput, TOutput> {
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Reference count of in-flight `mutate()` calls from this hook instance.
  // Needed because a single instance can have multiple calls in flight at
  // once (e.g. two PATCH calls fired via Promise.all) — `mutating` must
  // stay true until every one of them has settled, not just the first.
  const inFlightRef = useRef(0);

  const mutate = useCallback(
    async (url: string, body?: TInput): Promise<TOutput> => {
      inFlightRef.current += 1;
      setMutating(true);
      try {
        const res = await fetch(url, {
          method,
          headers:
            body !== undefined
              ? { "Content-Type": "application/json" }
              : undefined,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const message =
            (json && json.error) || `Request to ${url} failed`;
          throw new Error(message);
        }
        // Reflect this call's outcome at the moment it settles, so that
        // with concurrent calls on one instance, whichever call settles
        // last determines `error` — a later success clears an earlier
        // failure's message just as a later failure overwrites it.
        setError(null);
        return json as TOutput;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        inFlightRef.current -= 1;
        if (inFlightRef.current === 0) setMutating(false);
      }
    },
    [method],
  );

  return { mutate, mutating, error };
}
