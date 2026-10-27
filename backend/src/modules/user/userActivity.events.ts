/**
 * User Activity Event Seam (Phase 3 -> Phase 4 seam)
 * Implements architectural decision D29.
 *
 * Provides the contract for notifying background workers (BullMQ in Phase 4)
 * when a user watches a movie or adds a movie to their watchlist.
 * During Phase 3, NoopUserActivityEventPublisher is used by default.
 */

export type UserActivityType = 'WATCHED' | 'WATCHLIST_ADDED';

export interface UserActivityEvent {
  userId: string;
  movieId: string;
  type: UserActivityType;
  occurredAt: Date;
}

export interface UserActivityEventPublisher {
  activityRecorded(event: UserActivityEvent): Promise<void>;
}

export class NoopUserActivityEventPublisher implements UserActivityEventPublisher {
  async activityRecorded(_event: UserActivityEvent): Promise<void> {}
}
