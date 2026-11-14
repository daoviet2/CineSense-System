import { QueryClient } from '@tanstack/react-query';
import { activityQueryKeys } from '../src/hooks/activityQueryKeys';
import { clearActivityQueries } from '../src/lib/activityCache';

describe('clearActivityQueries', () => {
  it('removes private history/watchlist data and keeps unrelated movie queries', async () => {
    const client = new QueryClient();
    client.setQueryData(activityQueryKeys.history.list(1), { items: ['private-history'] });
    client.setQueryData(activityQueryKeys.watchlist.list(1), { items: ['private-list'] });
    client.setQueryData(activityQueryKeys.watchlist.status(603), { inWatchlist: true });
    client.setQueryData(['movies', 'list'], { items: ['public-movie'] });

    await clearActivityQueries(client);

    expect(client.getQueryData(activityQueryKeys.history.list(1))).toBeUndefined();
    expect(client.getQueryData(activityQueryKeys.watchlist.list(1))).toBeUndefined();
    expect(client.getQueryData(activityQueryKeys.watchlist.status(603))).toBeUndefined();
    expect(client.getQueryData(['movies', 'list'])).toEqual({ items: ['public-movie'] });
    client.clear();
  });
});
