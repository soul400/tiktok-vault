import { FastifyPluginAsync } from 'fastify';
import { getPrisma } from '@aep/database';

export const powerupsRoutes: FastifyPluginAsync = async (fastify) => {
  const prisma = getPrisma();

  // GET /api/powerups/catalog
  fastify.get('/powerups/catalog', async () => {
    const catalog = await prisma.powerUpCatalog.findMany({
      where: { isActive: true },
      orderBy: { multiplier: 'desc' },
    });
    return { success: true, data: catalog };
  });

  // GET /api/powerups/inventory/:userId
  fastify.get<{ Params: { userId: string } }>('/powerups/inventory/:userId', async (request) => {
    // userId can be internal UUID or TikTok userId
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: request.params.userId }, { userId: request.params.userId }, { uniqueId: request.params.userId }],
      },
    });

    if (!user) return { success: true, data: [] };

    const inventory = await prisma.userPowerUpInventory.findMany({
      where: { userId: user.id },
      include: { powerUp: true },
      orderBy: { quantity: 'desc' },
    });

    return { success: true, data: inventory, user };
  });

  // GET /api/powerups/transactions/:userId
  fastify.get<{ Params: { userId: string } }>('/powerups/transactions/:userId', async (request) => {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: request.params.userId }, { userId: request.params.userId }, { uniqueId: request.params.userId }],
      },
    });

    if (!user) return { success: true, data: [] };

    const transactions = await prisma.powerUpTransaction.findMany({
      where: { userId: user.id },
      orderBy: { occurredAt: 'desc' },
      take: 50,
      include: {
        powerUp: true,
        battleSession: true,
      },
    });

    return { success: true, data: transactions };
  });

  // GET /api/powerups/weekly
  fastify.get('/powerups/weekly', async (request) => {
    const { weekStart } = request.query as any;
    const snapshots = await prisma.weeklyPowerUpSnapshot.findMany({
      where: weekStart ? { weekStartUtc: new Date(weekStart) } : undefined,
      orderBy: { totalAcquired: 'desc' },
      take: 100,
      include: {
        user: true,
        powerUp: true,
      },
    });

    return { success: true, data: snapshots };
  });

  // GET /api/powerups/overview
  fastify.get('/powerups/overview', async () => {
    const totalTransactions = await prisma.powerUpTransaction.count();
    const topHolders = await prisma.userPowerUpInventory.findMany({
      where: { quantity: { gt: 0 } },
      take: 10,
      orderBy: { quantity: 'desc' },
      include: { user: true, powerUp: true },
    });

    const recentUsage = await prisma.powerUpTransaction.findMany({
      where: { transactionType: 'USED' },
      take: 10,
      orderBy: { occurredAt: 'desc' },
      include: { user: true, powerUp: true, battleSession: true },
    });

    return {
      success: true,
      data: {
        totalTransactions,
        topHolders,
        recentUsage,
      },
    };
  });

  // GET /api/powerups/vault - Authoritative Battle Tools Command Center endpoint
  fastify.get('/powerups/vault', async () => {
    // 5 Reference Battle Tools (GLOVES, BOOST_X3, BOOST_X2, MIST, EXTRA_TIME)
    const TOOL_SPECS = [
      {
        code: 'GLOVES',
        nameAr: 'قفازات المعركة',
        nameEn: 'Gloves (Knockout)',
        badgeText: 'مضاعف 5x',
        badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        borderColor: 'border-rose-500/30 hover:border-rose-400/60',
        glowColor: 'shadow-rose-500/10',
        iconBg: 'bg-rose-100',
        iconEmoji: '🥊',
        type: 'MULTIPLIER',
        multiplier: 5.0,
        durationSeconds: 30,
        description: 'قفاز الضربة القاضية لمضاعفة النقاط بمقدار 5 أضعاف (5x)',
      },
      {
        code: 'BOOST_X3',
        nameAr: 'مضاعف النقاط x3',
        nameEn: 'Point Boost x3',
        badgeText: 'مضاعف 3x',
        badgeColor: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
        borderColor: 'border-fuchsia-500/30 hover:border-fuchsia-400/60',
        glowColor: 'shadow-fuchsia-500/10',
        iconBg: 'bg-fuchsia-100',
        iconEmoji: '3️⃣',
        type: 'MULTIPLIER',
        multiplier: 3.0,
        durationSeconds: 30,
        description: 'مضاعفة نقاط جميع الدعم والهدايا بمقدار 3 أضعاف (3x)',
      },
      {
        code: 'BOOST_X2',
        nameAr: 'مضاعف النقاط x2',
        nameEn: 'Point Boost x2',
        badgeText: 'مضاعف 2x',
        badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        borderColor: 'border-blue-500/30 hover:border-blue-400/60',
        glowColor: 'shadow-blue-500/10',
        iconBg: 'bg-blue-100',
        iconEmoji: '2️⃣',
        type: 'MULTIPLIER',
        multiplier: 2.0,
        durationSeconds: 30,
        description: 'مضاعفة نقاط جميع الدعم والهدايا بمقدار ضعفين (2x)',
      },
      {
        code: 'MIST',
        nameAr: 'ضباب المعركة',
        nameEn: 'Mist / Fog of War',
        badgeText: '30 ثانية',
        badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        borderColor: 'border-purple-500/30 hover:border-purple-400/60',
        glowColor: 'shadow-purple-500/10',
        iconBg: 'bg-slate-100',
        iconEmoji: '☁️',
        type: 'OBFUSCATION',
        multiplier: 1.0,
        durationSeconds: 30,
        description: 'حجب سكور ونقاط الفريق عن الخصم لمدة 30 ثانية لإرباكه',
      },
      {
        code: 'EXTRA_TIME',
        nameAr: 'وقت إضافي',
        nameEn: 'Extra Time',
        badgeText: '15 ثانية',
        badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        borderColor: 'border-emerald-500/30 hover:border-emerald-400/60',
        glowColor: 'shadow-emerald-500/10',
        iconBg: 'bg-emerald-100',
        iconEmoji: '⏳',
        type: 'TIME_EXTENSION',
        multiplier: 1.0,
        durationSeconds: 15,
        description: 'تمديد مدة جولة المعركة بمقدار 15 ثانية إضافية للحسم',
      },
    ];

    // Fetch all user inventories
    const allInventories = await prisma.userPowerUpInventory.findMany({
      include: { user: true, powerUp: true },
    });

    // Fetch recent 50 transactions
    const recentTransactions = await prisma.powerUpTransaction.findMany({
      take: 50,
      orderBy: { occurredAt: 'desc' },
      include: { user: true, powerUp: true, battleSession: true },
    });

    // Compute active effects (tools used recently within their duration)
    const now = Date.now();
    const activeEffects = recentTransactions
      .filter((tx) => {
        if (tx.transactionType !== 'USED') return false;
        const dur = (tx.powerUp?.durationSeconds || 30) * 1000;
        if (dur === 0) return false;
        const diff = now - new Date(tx.occurredAt).getTime();
        return diff < dur;
      })
      .map((tx) => {
        const dur = (tx.powerUp?.durationSeconds || 30) * 1000;
        const elapsed = now - new Date(tx.occurredAt).getTime();
        const remainingSeconds = Math.max(0, Math.ceil((dur - elapsed) / 1000));
        return {
          id: tx.id,
          code: tx.powerUp?.code,
          nameAr: tx.powerUp?.nameAr,
          userName: tx.user?.nickname || tx.user?.uniqueId || 'داعم',
          userHandle: tx.user?.uniqueId,
          userAvatar: tx.user?.avatarUrl,
          multiplier: tx.powerUp?.multiplier || 1.0,
          remainingSeconds,
          occurredAt: tx.occurredAt,
        };
      });

    // Aggregate stats per tool
    const tools = TOOL_SPECS.map((spec) => {
      const toolInvs = allInventories.filter((i) => i.powerUp?.code === spec.code);
      const remainingCount = toolInvs.reduce((acc, i) => acc + Number(i.quantity || 0), 0);
      const totalAcquired = toolInvs.reduce((acc, i) => acc + Number(i.totalAcquired || 0), 0);
      const totalUsed = toolInvs.reduce((acc, i) => acc + Number(i.totalUsed || 0), 0);

      const activeInstance = activeEffects.find((a) => a.code === spec.code);

      const topHolders = toolInvs
        .filter((i) => i.quantity > 0)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3)
        .map((i) => ({
          userId: i.user.userId,
          uniqueId: i.user.uniqueId,
          displayName: i.user.nickname || i.user.uniqueId,
          avatarUrl: i.user.avatarUrl,
          quantity: i.quantity,
        }));

      return {
        ...spec,
        remainingCount,
        totalAcquired: Math.max(totalAcquired, remainingCount + totalUsed),
        totalUsed,
        isActive: Boolean(activeInstance),
        activeRemainingSeconds: activeInstance?.remainingSeconds || 0,
        activeUser: activeInstance?.userName,
        topHolders,
      };
    });

    const totalAvailable = tools.reduce((acc, t) => acc + t.remainingCount, 0);
    const totalUsed = tools.reduce((acc, t) => acc + t.totalUsed, 0);
    const totalAcquired = tools.reduce((acc, t) => acc + t.totalAcquired, 0);
    const activeToolsCount = activeEffects.length;

    // Supporter Balances matching the exact layout in the user's reference image (only approved tools with available balance > 0)
    const allowedCodes = new Set(TOOL_SPECS.map((s) => s.code));
    const supporterBalances = allInventories
      .filter((inv) => inv.quantity > 0 && allowedCodes.has(inv.powerUp?.code || ''))
      .map((inv) => {
        const d = new Date(inv.updatedAt);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formattedDate = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        const spec = TOOL_SPECS.find((s) => s.code === inv.powerUp?.code) || TOOL_SPECS[0];

        return {
          id: inv.id,
          user: {
            userId: inv.user.userId,
            uniqueId: inv.user.uniqueId,
            displayName: inv.user.nickname || inv.user.uniqueId,
            avatarUrl: inv.user.avatarUrl || '',
          },
          tool: {
            code: inv.powerUp?.code || 'GLOVES',
            nameAr: inv.powerUp?.nameAr || 'قفازات المعركة',
            iconEmoji: spec.iconEmoji,
          },
          availableBalance: inv.quantity,
          totalAcquired: inv.totalAcquired,
          totalUsed: inv.totalUsed,
          lastAcquiredAt: formattedDate,
          updatedAtRaw: inv.updatedAt.toISOString(),
        };
      })
      .sort((a, b) => {
        // Sort primarily by available balance descending, then total acquired descending
        if (b.availableBalance !== a.availableBalance) {
          return b.availableBalance - a.availableBalance;
        }
        return b.totalAcquired - a.totalAcquired;
      });

    return {
      success: true,
      data: {
        summary: {
          totalAvailable,
          totalUsed,
          totalAcquired,
          activeToolsCount,
          activeAccountsCount: supporterBalances.length,
        },
        tools,
        activeEffects,
        supporterBalances,
        recentTransactions: recentTransactions.map((tx) => ({
          id: tx.id,
          transactionType: tx.transactionType,
          quantity: tx.quantity,
          occurredAt: tx.occurredAt,
          tool: {
            code: tx.powerUp?.code,
            nameAr: tx.powerUp?.nameAr,
            multiplier: tx.powerUp?.multiplier,
            durationSeconds: tx.powerUp?.durationSeconds,
          },
          user: {
            userId: tx.user?.userId,
            uniqueId: tx.user?.uniqueId,
            displayName: tx.user?.nickname || tx.user?.uniqueId,
            avatarUrl: tx.user?.avatarUrl,
          },
          battleId: tx.battleSession?.battleId,
        })),
      },
    };
  });

  // POST /api/powerups/vault/reset - Reset all vault inventory and transactions with password confirmation
  fastify.post('/powerups/vault/reset', async (req, reply) => {
    const body = (req.body || {}) as { password?: string };
    const { password } = body;

    if (password !== '0000') {
      return reply.status(401).send({
        success: false,
        message: 'كلمة المرور غير صحيحة',
      });
    }

    try {
      await prisma.$transaction([
        prisma.powerUpTransaction.deleteMany(),
        prisma.userPowerUpInventory.deleteMany(),
      ]);

      return {
        success: true,
        message: 'تم تصفير جميع بيانات مخزون وحركات الأدوات بنجاح',
      };
    } catch (err: any) {
      req.log.error(`Vault reset error: ${err.message}`);
      return reply.status(500).send({
        success: false,
        message: 'حدث خطأ أثناء تصفير المخزون',
      });
    }
  });
};
