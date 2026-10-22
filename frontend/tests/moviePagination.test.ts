import { clampPage, getPaginationState } from '../src/lib/moviePagination';

describe('moviePagination', () => {
  describe('clampPage', () => {
    it('keeps valid pages within range', () => {
      expect(clampPage(1, 10)).toBe(1);
      expect(clampPage(5, 10)).toBe(5);
      expect(clampPage(10, 10)).toBe(10);
    });

    it('clamps page below 1 to 1', () => {
      expect(clampPage(0, 10)).toBe(1);
      expect(clampPage(-5, 10)).toBe(1);
    });

    it('clamps page exceeding totalPages to totalPages', () => {
      expect(clampPage(15, 10)).toBe(10);
    });

    it('clamps totalPages exceeding 500 to 500', () => {
      expect(clampPage(600, 1000)).toBe(500);
      expect(clampPage(500, 1000)).toBe(500);
    });

    it('handles non-finite or empty values gracefully', () => {
      expect(clampPage(NaN, 10)).toBe(1);
      expect(clampPage(1, 0)).toBe(1);
      expect(clampPage(3.7, 10)).toBe(3);
    });
  });

  describe('getPaginationState', () => {
    it('returns first page state with disabled prev and enabled next', () => {
      const state = getPaginationState(1, 20);
      expect(state).toEqual({
        page: 1,
        totalPages: 20,
        canPrev: false,
        canNext: true,
        pageLabel: 'Trang 1 / 20',
      });
    });

    it('returns middle page state with both prev and next enabled', () => {
      const state = getPaginationState(5, 20);
      expect(state).toEqual({
        page: 5,
        totalPages: 20,
        canPrev: true,
        canNext: true,
        pageLabel: 'Trang 5 / 20',
      });
    });

    it('returns last page state with enabled prev and disabled next', () => {
      const state = getPaginationState(20, 20);
      expect(state).toEqual({
        page: 20,
        totalPages: 20,
        canPrev: true,
        canNext: false,
        pageLabel: 'Trang 20 / 20',
      });
    });

    it('clamps totalPages to 500 maximum per TMDB constraint', () => {
      const state = getPaginationState(1, 1000);
      expect(state.totalPages).toBe(500);
      expect(state.pageLabel).toBe('Trang 1 / 500');
    });

    it('handles single page results properly', () => {
      const state = getPaginationState(1, 1);
      expect(state).toEqual({
        page: 1,
        totalPages: 1,
        canPrev: false,
        canNext: false,
        pageLabel: 'Trang 1 / 1',
      });
    });
  });
});
