/**
 * Activity domain configuration (History and Watchlist)
 * Implements architectural decisions D27, D31, D34.
 */

/**
 * Time window in milliseconds for history deduplication (30 minutes).
 * If the user re-views the same movie within this window, the existing record
 * is returned and no new watch event is recorded (Decision D27).
 */
export const HISTORY_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

/** Default and maximum page size for activity lists (Decision D31). */
export const ACTIVITY_PAGE_SIZE = 20;

/** Maximum allowed page number for offset pagination (Decision D31). */
export const ACTIVITY_MAX_PAGE = 500;
