import {
  NoopUserActivityEventPublisher,
  UserActivityEvent,
} from '../../src/modules/user/userActivity.events.js';

describe('NoopUserActivityEventPublisher', () => {
  it('implements activityRecorded without throwing errors for WATCHED and WATCHLIST_ADDED events', async () => {
    const publisher = new NoopUserActivityEventPublisher();

    const watchedEvent: UserActivityEvent = {
      userId: '11111111-1111-1111-1111-111111111111',
      movieId: '22222222-2222-2222-2222-222222222222',
      type: 'WATCHED',
      occurredAt: new Date('2026-10-27T12:00:00.000Z'),
    };

    const watchlistEvent: UserActivityEvent = {
      userId: '11111111-1111-1111-1111-111111111111',
      movieId: '22222222-2222-2222-2222-222222222222',
      type: 'WATCHLIST_ADDED',
      occurredAt: new Date('2026-10-27T12:05:00.000Z'),
    };

    await expect(publisher.activityRecorded(watchedEvent)).resolves.toBeUndefined();
    await expect(publisher.activityRecorded(watchlistEvent)).resolves.toBeUndefined();
  });
});
