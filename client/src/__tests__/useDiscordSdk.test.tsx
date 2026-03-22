import { renderHook, waitFor } from '@testing-library/react';
import { useDiscordSdk } from '../hooks/useDiscordSdk';

// Mock the Discord SDK
vi.mock('@discord/embedded-app-sdk', () => ({
  DiscordSDK: vi.fn().mockImplementation(function () {
    return {
      ready: vi.fn().mockResolvedValue(undefined),
      commands: {
        authorize: vi.fn().mockResolvedValue({ code: 'mock-code' }),
        authenticate: vi.fn().mockResolvedValue({ user: { id: 'user-123', username: 'TestUser' } }),
      },
      instanceId: 'instance-123',
    };
  }),
}));

// Mock the fetch call for token exchange
global.fetch = vi.fn().mockResolvedValue({
  json: vi.fn().mockResolvedValue({ access_token: 'mock-token' }),
  ok: true,
});

describe('useDiscordSdk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ access_token: 'mock-token' }),
      ok: true,
    });
  });

  it('starts in loading state (not ready)', () => {
    const { result } = renderHook(() => useDiscordSdk());
    expect(result.current.ready).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('transitions to ready after successful auth', async () => {
    const { result } = renderHook(() => useDiscordSdk());
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.auth).not.toBe(null);
    expect(result.current.auth?.userId).toBe('user-123');
  });

  it('sets error on SDK failure', async () => {
    const { DiscordSDK } = await import('@discord/embedded-app-sdk');
    (DiscordSDK as ReturnType<typeof vi.fn>).mockImplementationOnce(function () {
      return {
        ready: vi.fn().mockRejectedValue(new Error('SDK init failed')),
        commands: { authorize: vi.fn(), authenticate: vi.fn() },
        instanceId: 'instance-123',
      };
    });

    const { result } = renderHook(() => useDiscordSdk());
    await waitFor(() => {
      expect(result.current.error).toBe('SDK init failed');
    });
    expect(result.current.ready).toBe(false);
  });
});
