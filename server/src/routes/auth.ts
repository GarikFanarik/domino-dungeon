import { Router } from 'express';

const router = Router();

router.post('/token', async (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== 'string' || code.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid code' });
  }

  try {
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || '',
        client_secret: process.env.DISCORD_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://discord.com/api/oauth2/authorize',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Token exchange failed' }));
      return res.status(400).json({ error: (error as any).error_description || 'Token exchange failed' });
    }

    const data = await response.json() as { access_token: string };
    return res.json({ access_token: data.access_token });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
