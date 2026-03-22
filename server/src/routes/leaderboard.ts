import { Router } from 'express';
import prisma from '../../../src/lib/prisma';

const router = Router();

// GET /api/leaderboard
router.get('/', async (req, res) => {
  const limit = parseInt(String(req.query['limit'] || '20'), 10);
  const period = req.query['period'] as string;

  try {
    const where: Record<string, unknown> = {};
    if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      where['createdAt'] = { gte: weekAgo };
    }

    const entries = await prisma.leaderboardEntry.findMany({
      where,
      orderBy: { score: 'desc' },
      take: limit,
    });

    return res.json({
      entries: entries.map((e: any, i: number) => ({
        rank: i + 1,
        discordUserId: e.userId,
        displayName: e.userId, // display name from Discord SDK in future
        score: e.score,
        actsCleared: e.actsCleared ?? 0,
        enemiesDefeated: e.enemiesDefeated ?? 0,
        runDate: e.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
    });
  } catch {
    // If DB not available, return empty
    return res.json({ entries: [] });
  }
});

export default router;
