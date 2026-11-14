import { activityQueryKeys } from '../src/hooks/activityQueryKeys';

describe('activityQueryKeys', () => {
  it('keeps history and watchlist namespaces separate and stable', () => {
    expect(activityQueryKeys.history.list(2)).toEqual(['activity', 'history', 'list', 2]);
    expect(activityQueryKeys.watchlist.list(2)).toEqual(['activity', 'watchlist', 'list', 2]);
    expect(activityQueryKeys.watchlist.status(603)).toEqual(['activity', 'watchlist', 'status', 603]);
    expect(activityQueryKeys.history.list(2)).toEqual(activityQueryKeys.history.list(2));
  });
});
