import { activityPageHref, pageAfterEntryDeletion, parseActivityPage } from '../src/lib/activityPagination';

describe('activity pagination', () => {
  it('parses a safe page from the URL', () => {
    expect(parseActivityPage(new URLSearchParams('page=2'))).toBe(2);
    expect(parseActivityPage(new URLSearchParams('page=0'))).toBe(1);
    expect(parseActivityPage(new URLSearchParams('page=-2'))).toBe(1);
    expect(parseActivityPage(new URLSearchParams('page=2.5'))).toBe(1);
    expect(parseActivityPage(new URLSearchParams('page=abc'))).toBe(1);
    expect(parseActivityPage(new URLSearchParams('page=999'))).toBe(500);
  });

  it('uses a shareable URL and returns to the previous page after deleting its final item', () => {
    expect(activityPageHref('/history', 1)).toBe('/history');
    expect(activityPageHref('/history', 3)).toBe('/history?page=3');
    expect(pageAfterEntryDeletion(3, 1)).toBe(2);
    expect(pageAfterEntryDeletion(3, 2)).toBe(3);
    expect(pageAfterEntryDeletion(1, 1)).toBe(1);
  });
});
