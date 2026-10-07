import { useAuthStore } from '../src/store/authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  const mockUser = {
    id: 'usr_abc',
    name: 'Bob',
    email: 'bob@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: '2026-10-07T00:00:00.000Z',
  };

  it('initializes with null user and unauthenticated after clearAuth', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.status).toBe('unauthenticated');
  });

  it('setAuthenticatedUser updates user and marks status as authenticated', () => {
    useAuthStore.getState().setAuthenticatedUser(mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.status).toBe('authenticated');
  });

  it('clearAuth resets state to unauthenticated and removes user', () => {
    useAuthStore.getState().setAuthenticatedUser(mockUser);
    expect(useAuthStore.getState().user).not.toBeNull();

    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('setUser with null sets unauthenticated', () => {
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('setUser with user object sets authenticated', () => {
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });
});
