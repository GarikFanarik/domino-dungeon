import { useState, useEffect } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';

export interface DiscordAuth {
  userId: string;
  username: string;
  accessToken: string;
}

export function useDiscordSdk() {
  const [ready, setReady] = useState(false);
  const [auth, setAuth] = useState<DiscordAuth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Dev bypass: skip Discord SDK when VITE_DEV_BYPASS=true (not in test mode)
      if (import.meta.env.VITE_DEV_BYPASS === 'true' && import.meta.env.MODE !== 'test') {
        if (!cancelled) {
          setAuth({ userId: 'devuser', username: 'Dev Player', accessToken: 'dev-token' });
          setReady(true);
        }
        return;
      }

      try {
        const clientId = import.meta.env.VITE_CLIENT_ID || '';
        const sdk = new DiscordSDK(clientId);
        await sdk.ready();

        const { code } = await sdk.commands.authorize({
          client_id: clientId,
          response_type: 'code',
          scope: ['identify', 'guilds'],
        } as any);

        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const { access_token } = await response.json();

        const authResult = await sdk.commands.authenticate({ access_token });

        if (!cancelled) {
          setAuth({
            userId: (authResult as any).user?.id || sdk.instanceId,
            username: (authResult as any).user?.username || 'Unknown',
            accessToken: access_token,
          });
          setReady(true);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Unknown error');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return { ready, auth, error };
}
