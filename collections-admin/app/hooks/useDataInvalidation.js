import { useEffect, useRef } from "react";

const OPERATION_FLAG = "tm_admin_operation_success";
const CACHE_PREFIX = "tm_admin_cache_";

/**
 * useDataInvalidation Hook
 *
 * On mount: if a successful operation happened on this page since the last visit,
 * refetch. Otherwise restore the last-known data from sessionStorage instantly
 * (no API call, no blank flash) — only falling back to a fresh fetch if there's
 * no cache yet (first ever visit).
 *
 * Usage:
 *   const { markOperationSuccess, updateCache } = useDataInvalidation("collections", {
 *     fetchFn: fetchCollections,
 *     onRestoreCache: (cached) => setCollections(cached),
 *   });
 *
 *   // After a successful fetch, cache the result:
 *   updateCache(list);
 *
 *   // After a successful create/update/delete:
 *   markOperationSuccess();
 *
 * @param {string} page - Page identifier (e.g., 'collections', 'catalogue')
 * @param {{ fetchFn: function, onRestoreCache?: function }} opts
 */
export function useDataInvalidation(page, { fetchFn, onRestoreCache } = {}) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (ranRef.current) return; // guard against double-invoke (e.g. React strict mode)
    ranRef.current = true;

    const flagRaw = sessionStorage.getItem(OPERATION_FLAG);
    let flag = null;
    try {
      flag = flagRaw ? JSON.parse(flagRaw) : null;
    } catch {}

    if (flag && flag.page === page) {
      // A successful operation happened on this page — refetch fresh data.
      sessionStorage.removeItem(OPERATION_FLAG);
      fetchFn();
      return;
    }

    // No pending operation: restore cached data if we have it, so the page
    // never renders blank just because the component remounted.
    const cachedRaw = sessionStorage.getItem(CACHE_PREFIX + page);
    if (cachedRaw && onRestoreCache) {
      try {
        onRestoreCache(JSON.parse(cachedRaw));
        return;
      } catch {}
    }

    // First-ever visit this session — nothing to restore, fetch fresh.
    fetchFn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return {
    /** Call after a successful create/update/delete so the next visit refetches. */
    markOperationSuccess: () => markPageDirty(page),
    /** Call after any successful fetch to keep the cache fresh for next mount. */
    updateCache: (data) => {
      try {
        sessionStorage.setItem(CACHE_PREFIX + page, JSON.stringify(data));
      } catch {}
    },
  };
}

/**
 * Plain (non-hook) helper for pages that only need to flag a page as dirty —
 * e.g. a detail/edit screen that doesn't itself own or render the cached list,
 * but needs the list page to refetch next time it's visited.
 *
 * Usage: markPageDirty("collections") after a successful update.
 */
export function markPageDirty(page) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(OPERATION_FLAG, JSON.stringify({ page, timestamp: Date.now() }));
}
