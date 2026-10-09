/**
 * AEP Battle Intelligence — Deterministic Canonical Team Assignment Engine
 * 
 * Provides a single, authoritative, backend-owned function to establish 1v1 and 2v2
 * battle team membership, roles, and scores.
 * 
 * Guarantees:
 * 1. Invariance under participant-array permutations (shuffling input array cannot change team membership).
 * 2. Tracked streamer is ALWAYS anchored to Team A (hosts[0] = primary host).
 * 3. Verified partner in 2v2 is ALWAYS Team A (hosts[1] = partner).
 * 4. Opponents are ALWAYS Team B (hosts[0] = primary rival, hosts[1] = rival partner).
 * 5. Scores remain attached to their source team identity, never swapped or compounded.
 */

export interface RawBattleParticipantInput {
  userId: string;
  uniqueId?: string;
  nickname?: string;
  avatarUrl?: string;
  roomId?: string;
  score?: number;
  sourceTeamId?: string | number;
  sourceIndex?: number;
  isCurrentHost?: boolean;
}

export interface CanonicalBattleParticipant {
  userId: string;
  uniqueId: string;
  nickname: string;
  avatarUrl?: string;
  score: number;
  isHost: boolean;     // Primary host for this team
  isPartner: boolean;  // 2v2 partner/teammate for this team
  sourceTeamIdentifier?: string;
}

export interface CanonicalBattleTeam {
  teamId: 'TEAM_A' | 'TEAM_B';
  sourceTeamIdentifier: string;
  hosts: CanonicalBattleParticipant[];
  score: number;
  contributors?: Array<{
    userId: string;
    uniqueId: string;
    nickname: string;
    score: number;
    rank: number;
    avatarUrl?: string;
    isEnigma?: boolean;
  }>;
}

export interface CanonicalBattleAssignmentInput {
  battleId: string;
  sessionId?: string;
  battleType?: '1v1' | '2v2' | 'MULTI';
  timestampUtc?: string;

  // Tracked Streamer Identity (authoritative anchor for Team A)
  trackedStreamer: {
    userId?: string;          // Stable TikTok numerical user ID (e.g. '7175470052052632577')
    username?: string;        // Handle without @ (e.g. 'mohra.2000')
    roomId?: string;          // Room ID
  };

  // Raw participant list from the event
  participants: RawBattleParticipantInput[];

  // Source groupings from Protobuf payloads
  sourceTeamUsers?: Array<{
    teamId: string | number;
    userIds: string[];
  }>;

  sourceTeamArmies?: Array<{
    teamId: string | number;
    teamUsers: Array<{ userIdStr?: string; userId?: string | number; score?: number }>;
    totalScore?: number;
  }>;

  bestTeammateRelation?:
    | Array<{
        userId: string;
        bestTeammateId: string;
      }>
    | {
        userId: string;
        bestTeammateId: string;
      };

  // Previous assignment state for continuity across incremental events
  previousAssignment?: CanonicalBattleAssignmentOutput;

  // Direct team scores from source
  sourceTeamScores?: {
    team1Score?: number;
    team2Score?: number;
  };
}

export interface CanonicalBattleAssignmentOutput {
  battleId: string;
  sessionId?: string;
  battleType: '1v1' | '2v2' | 'MULTI';
  teamA: CanonicalBattleTeam; // ALWAYS the tracked streamer's team
  teamB: CanonicalBattleTeam; // ALWAYS the opponent's team
  sourceEvidence: {
    ruleApplied:
      | 'PREVIOUS_CANONICAL_STATE'
      | 'BEST_TEAMMATE_RELATION'
      | 'EXPLICIT_SOURCE_TEAM_USERS'
      | 'EXPLICIT_SOURCE_TEAM_ARMIES'
      | 'PARTICIPANT_SOURCE_TEAM_ID'
      | 'TOPOLOGY_QUADRANT'
      | 'FALLBACK_UNAMBIGUOUS';
    trackedStreamerMatchedBy: 'USER_ID' | 'USERNAME' | 'ROOM_ID' | 'FIRST_PARTICIPANT_FALLBACK';
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    notes?: string;
  };
  timestampUtc: string;
}

/**
 * Matches whether a participant represents the tracked streamer.
 * Prioritizes persistent numerical user ID > uniqueId/username > roomId.
 */
function matchesTrackedStreamer(
  p: RawBattleParticipantInput,
  streamer: CanonicalBattleAssignmentInput['trackedStreamer']
): { matched: boolean; by: 'USER_ID' | 'USERNAME' | 'ROOM_ID' | 'NONE' } {
  if (p.isCurrentHost) {
    return { matched: true, by: 'USERNAME' };
  }

  // 1. Numerical User ID match (Most authoritative)
  if (streamer.userId && p.userId && String(p.userId) === String(streamer.userId)) {
    return { matched: true, by: 'USER_ID' };
  }

  // 2. Username / UniqueId match (case-insensitive)
  if (streamer.username && p.uniqueId) {
    const cleanUser = streamer.username.replace(/^@/, '').trim().toLowerCase();
    const cleanP = p.uniqueId.replace(/^@/, '').trim().toLowerCase();
    if (cleanUser && cleanP && cleanUser === cleanP) {
      return { matched: true, by: 'USERNAME' };
    }
  }

  // 3. Room ID match
  if (streamer.roomId && p.roomId && String(p.roomId) === String(streamer.roomId)) {
    return { matched: true, by: 'ROOM_ID' };
  }

  return { matched: false, by: 'NONE' };
}

/**
 * Primary Canonical Function: Deterministically resolves Team A and Team B.
 */
export function resolveCanonicalBattleTeams(
  input: CanonicalBattleAssignmentInput
): CanonicalBattleAssignmentOutput {
  const {
    battleId,
    sessionId,
    timestampUtc = new Date().toISOString(),
    trackedStreamer,
    participants = [],
    sourceTeamUsers,
    sourceTeamArmies,
    bestTeammateRelation,
    previousAssignment,
    sourceTeamScores,
  } = input;

  // Deduplicate incoming participants by userId
  const uniqueParticipantsMap = new Map<string, RawBattleParticipantInput>();
  for (const p of participants) {
    const key = String(p.userId || p.uniqueId || '');
    if (!key) continue;
    if (!uniqueParticipantsMap.has(key)) {
      uniqueParticipantsMap.set(key, p);
    } else {
      // Merge properties if duplicate exists
      const existing = uniqueParticipantsMap.get(key)!;
      uniqueParticipantsMap.set(key, {
        ...existing,
        ...p,
        score: Math.max(existing.score || 0, p.score || 0),
        uniqueId: p.uniqueId || existing.uniqueId,
        nickname: p.nickname || existing.nickname,
        avatarUrl: p.avatarUrl || existing.avatarUrl,
      });
    }
  }
  const cleanParticipants = Array.from(uniqueParticipantsMap.values());

  // Determine battle type
  const is2v2 =
    input.battleType === '2v2' ||
    cleanParticipants.length >= 4 ||
    (sourceTeamUsers && sourceTeamUsers.some((t) => t.userIds.length > 1)) ||
    (sourceTeamArmies && sourceTeamArmies.some((t) => t.teamUsers.length > 1));
  const battleType: '1v1' | '2v2' | 'MULTI' = is2v2 ? '2v2' : '1v1';

  // 1. Locate the Tracked Streamer among participants
  let streamerParticipant: RawBattleParticipantInput | undefined;
  let matchType: 'USER_ID' | 'USERNAME' | 'ROOM_ID' | 'FIRST_PARTICIPANT_FALLBACK' = 'FIRST_PARTICIPANT_FALLBACK';

  for (const p of cleanParticipants) {
    const res = matchesTrackedStreamer(p, trackedStreamer);
    if (res.matched) {
      streamerParticipant = p;
      matchType = res.by as any;
      break;
    }
  }

  // Fallback: If not matched by ID/username/room, fallback to participant marked as isCurrentHost or first participant
  if (!streamerParticipant && cleanParticipants.length > 0) {
    const currentHost = cleanParticipants.find((p) => p.isCurrentHost);
    streamerParticipant = currentHost || cleanParticipants[0];
    matchType = 'FIRST_PARTICIPANT_FALLBACK';
  }

  const streamerUserId = streamerParticipant ? String(streamerParticipant.userId) : '';
  const streamerUniqueId = streamerParticipant ? String(streamerParticipant.uniqueId || trackedStreamer.username || '') : '';

  // Containers for resolved participants
  let teamAParticipants: RawBattleParticipantInput[] = [];
  let teamBParticipants: RawBattleParticipantInput[] = [];
  let appliedRule: CanonicalBattleAssignmentOutput['sourceEvidence']['ruleApplied'] = 'FALLBACK_UNAMBIGUOUS';
  let confidence: CanonicalBattleAssignmentOutput['sourceEvidence']['confidence'] = 'LOW';
  let notes = '';

  // -------------------------------------------------------------------------
  // STRATEGY 1: Previous Canonical State (Guarantees stability across events)
  // -------------------------------------------------------------------------
  if (
    previousAssignment &&
    previousAssignment.battleId === battleId &&
    previousAssignment.teamA.hosts.length > 0
  ) {
    const prevAIds = new Set(previousAssignment.teamA.hosts.map((h) => String(h.userId)));
    const prevBIds = new Set(previousAssignment.teamB.hosts.map((h) => String(h.userId)));

    const matchedA = cleanParticipants.filter((p) => prevAIds.has(String(p.userId)));
    const matchedB = cleanParticipants.filter((p) => prevBIds.has(String(p.userId)));

    if (matchedA.length > 0 && matchedB.length > 0) {
      teamAParticipants = matchedA;
      teamBParticipants = matchedB;
      appliedRule = 'PREVIOUS_CANONICAL_STATE';
      confidence = 'HIGH';
      notes = 'Maintained canonical membership from previous state of current battle';
    }
  }

  // -------------------------------------------------------------------------
  // STRATEGY 2: Explicit Protobuf bestTeammateRelation
  // -------------------------------------------------------------------------
  const teammateRelations = Array.isArray(bestTeammateRelation)
    ? bestTeammateRelation
    : bestTeammateRelation
    ? [bestTeammateRelation]
    : [];

  if (teamAParticipants.length === 0 && teammateRelations.length > 0) {
    // Find relation involving the streamer
    const rel = teammateRelations.find(
      (r) => String(r.userId) === streamerUserId || String(r.bestTeammateId) === streamerUserId
    );

    if (rel) {
      const partnerId = String(rel.userId === streamerUserId ? rel.bestTeammateId : rel.userId);
      const partner = cleanParticipants.find((p) => String(p.userId) === partnerId);

      if (streamerParticipant && partner) {
        teamAParticipants = [streamerParticipant, partner];
        teamBParticipants = cleanParticipants.filter(
          (p) => String(p.userId) !== streamerUserId && String(p.userId) !== partnerId
        );
        appliedRule = 'BEST_TEAMMATE_RELATION';
        confidence = 'HIGH';
        notes = `Resolved partner ${partnerId} via authoritative bestTeammateRelation`;
      }
    }
  }

  // -------------------------------------------------------------------------
  // STRATEGY 3: Explicit Protobuf sourceTeamUsers (data.teamUsers)
  // -------------------------------------------------------------------------
  if (
    teamAParticipants.length === 0 &&
    Array.isArray(sourceTeamUsers) &&
    sourceTeamUsers.length >= 2
  ) {
    const group1Ids = new Set(sourceTeamUsers[0].userIds.map(String));
    const group2Ids = new Set(sourceTeamUsers[1].userIds.map(String));

    const streamerInGroup1 =
      group1Ids.has(streamerUserId) ||
      (streamerUniqueId && group1Ids.has(streamerUniqueId));
    const streamerInGroup2 =
      group2Ids.has(streamerUserId) ||
      (streamerUniqueId && group2Ids.has(streamerUniqueId));

    if (streamerInGroup1 || streamerInGroup2) {
      const streamerGroupIds = streamerInGroup1 ? group1Ids : group2Ids;
      const opponentGroupIds = streamerInGroup1 ? group2Ids : group1Ids;

      teamAParticipants = cleanParticipants.filter((p) => streamerGroupIds.has(String(p.userId)));
      teamBParticipants = cleanParticipants.filter((p) => opponentGroupIds.has(String(p.userId)));

      appliedRule = 'EXPLICIT_SOURCE_TEAM_USERS';
      confidence = 'HIGH';
      notes = `Streamer matched in source team ${streamerInGroup1 ? '1' : '2'} via sourceTeamUsers`;
    }
  }

  // -------------------------------------------------------------------------
  // STRATEGY 4: Explicit Protobuf sourceTeamArmies (data.teamArmies)
  // -------------------------------------------------------------------------
  if (
    teamAParticipants.length === 0 &&
    Array.isArray(sourceTeamArmies) &&
    sourceTeamArmies.length >= 2
  ) {
    const g1Users = sourceTeamArmies[0].teamUsers.map((u) => String(u.userIdStr || u.userId || ''));
    const g2Users = sourceTeamArmies[1].teamUsers.map((u) => String(u.userIdStr || u.userId || ''));

    const g1Set = new Set(g1Users);
    const g2Set = new Set(g2Users);

    const inG1 = g1Set.has(streamerUserId);
    const inG2 = g2Set.has(streamerUserId);

    if (inG1 || inG2) {
      const aSet = inG1 ? g1Set : g2Set;
      const bSet = inG1 ? g2Set : g1Set;

      teamAParticipants = cleanParticipants.filter((p) => aSet.has(String(p.userId)));
      teamBParticipants = cleanParticipants.filter((p) => bSet.has(String(p.userId)));

      appliedRule = 'EXPLICIT_SOURCE_TEAM_ARMIES';
      confidence = 'HIGH';
      notes = `Streamer matched in source team army ${inG1 ? '1' : '2'} via sourceTeamArmies`;
    }
  }

  // -------------------------------------------------------------------------
  // STRATEGY 5: Participant explicit sourceTeamId (e.g. teamId: 1 vs 2)
  // -------------------------------------------------------------------------
  if (teamAParticipants.length === 0) {
    const teamGroups = new Map<string, RawBattleParticipantInput[]>();
    for (const p of cleanParticipants) {
      if (p.sourceTeamId !== undefined && p.sourceTeamId !== null) {
        const tKey = String(p.sourceTeamId);
        if (!teamGroups.has(tKey)) teamGroups.set(tKey, []);
        teamGroups.get(tKey)!.push(p);
      }
    }

    if (teamGroups.size >= 2) {
      const groupKeys = Array.from(teamGroups.keys());
      let streamerGroupKey: string | undefined;

      for (const k of groupKeys) {
        if (teamGroups.get(k)!.some((p) => String(p.userId) === streamerUserId)) {
          streamerGroupKey = k;
          break;
        }
      }

      if (streamerGroupKey) {
        teamAParticipants = teamGroups.get(streamerGroupKey)!;
        const otherKeys = groupKeys.filter((k) => k !== streamerGroupKey);
        teamBParticipants = otherKeys.flatMap((k) => teamGroups.get(k)!);

        appliedRule = 'PARTICIPANT_SOURCE_TEAM_ID';
        confidence = 'HIGH';
        notes = `Resolved via participant.sourceTeamId group '${streamerGroupKey}'`;
      }
    }
  }

  // -------------------------------------------------------------------------
  // STRATEGY 6: Authoritative 2v2 Topology Layout Pairing
  // In TikTok LIVE 2v2 broadcast:
  // Position 0 = Top-Left (Host)
  // Position 1 = Top-Right (Rival 1)
  // Position 2 = Bottom-Left (Host Partner)
  // Position 3 = Bottom-Right (Rival Partner)
  // Column Left = [Pos 0, Pos 2]
  // Column Right = [Pos 1, Pos 3]
  // -------------------------------------------------------------------------
  if (teamAParticipants.length === 0 && cleanParticipants.length >= 4) {
    const colLeft = [cleanParticipants[0], cleanParticipants[2]];
    const colRight = [cleanParticipants[1], cleanParticipants[3]];

    const streamerInLeft = colLeft.some((p) => String(p.userId) === streamerUserId);
    const streamerInRight = colRight.some((p) => String(p.userId) === streamerUserId);

    if (streamerInLeft || streamerInRight) {
      teamAParticipants = streamerInLeft ? colLeft : colRight;
      teamBParticipants = streamerInLeft ? colRight : colLeft;
      appliedRule = 'TOPOLOGY_QUADRANT';
      confidence = 'MEDIUM';
      notes = `Resolved using 4-quadrant screen topology (${streamerInLeft ? 'Left' : 'Right'} column)`;
    }
  }

  // -------------------------------------------------------------------------
  // STRATEGY 7: Default 1v1 / Fallback
  // -------------------------------------------------------------------------
  if (teamAParticipants.length === 0) {
    if (streamerParticipant) {
      teamAParticipants = [streamerParticipant];
      teamBParticipants = cleanParticipants.filter((p) => String(p.userId) !== streamerUserId);
    } else if (cleanParticipants.length > 0) {
      teamAParticipants = [cleanParticipants[0]];
      teamBParticipants = cleanParticipants.slice(1);
    }
    appliedRule = 'FALLBACK_UNAMBIGUOUS';
    confidence = 'LOW';
    notes = 'Single host fallback';
  }

  // -------------------------------------------------------------------------
  // ENFORCE CANONICAL ROLE ASSIGNMENT:
  // In Team A: hosts[0] is ALWAYS the tracked streamer (isHost: true, isPartner: false)
  //            hosts[1] is ALWAYS their partner (isHost: false, isPartner: true)
  // In Team B: hosts[0] is primary rival (isHost: true)
  //            hosts[1] is rival partner (isPartner: true)
  // -------------------------------------------------------------------------
  const canonicalTeamAHosts: CanonicalBattleParticipant[] = [];
  const canonicalTeamBHosts: CanonicalBattleParticipant[] = [];

  // Team A Ordering: Ensure streamer is ALWAYS index 0
  const effectiveStreamerInA = teamAParticipants.find(
    (p) => String(p.userId) === streamerUserId || (p.uniqueId && p.uniqueId.toLowerCase() === trackedStreamer.username?.toLowerCase())
  ) || teamAParticipants[0];

  if (effectiveStreamerInA) {
    canonicalTeamAHosts.push({
      userId: String(effectiveStreamerInA.userId),
      uniqueId: effectiveStreamerInA.uniqueId || trackedStreamer.username || 'mohra.2000',
      nickname: effectiveStreamerInA.nickname || 'المهره 💛',
      avatarUrl: effectiveStreamerInA.avatarUrl,
      score: Number(effectiveStreamerInA.score || 0),
      isHost: true,
      isPartner: false,
    });
  }

  // Add Partner to Team A
  for (const p of teamAParticipants) {
    if (effectiveStreamerInA && String(p.userId) === String(effectiveStreamerInA.userId)) {
      continue;
    }
    canonicalTeamAHosts.push({
      userId: String(p.userId),
      uniqueId: p.uniqueId || 'partner',
      nickname: p.nickname || 'شريك المضيف',
      avatarUrl: p.avatarUrl,
      score: Number(p.score || 0),
      isHost: false,
      isPartner: true,
    });
  }

  // Team B Ordering: Guarantee deterministic and permutation-invariant ordering
  // Sort stably by userId to guarantee permutation invariance regardless of input order
  const sortedTeamB = [...teamBParticipants].sort((a, b) => {
    return String(a.userId).localeCompare(String(b.userId));
  });

  for (let i = 0; i < sortedTeamB.length; i++) {
    const p = sortedTeamB[i];
    canonicalTeamBHosts.push({
      userId: String(p.userId),
      uniqueId: p.uniqueId || (i === 0 ? 'rival' : 'rival_partner'),
      nickname: p.nickname || (i === 0 ? 'المنافس' : 'شريك المنافس'),
      avatarUrl: p.avatarUrl,
      score: Number(p.score || 0),
      isHost: i === 0,
      isPartner: i > 0,
    });
  }

  // -------------------------------------------------------------------------
  // SCORE ATTACHMENT: Non-compounding, attaches to source team identity
  // -------------------------------------------------------------------------
  // If sourceTeamArmies is provided, update participant scores
  if (Array.isArray(sourceTeamArmies)) {
    const userScoreMap = new Map<string, number>();
    for (const army of sourceTeamArmies) {
      if (Array.isArray(army.teamUsers)) {
        for (const u of army.teamUsers) {
          const uId = String(u.userIdStr || u.userId || '');
          if (uId) {
            userScoreMap.set(uId, Number(u.score || 0));
          }
        }
      }
    }

    for (const h of canonicalTeamAHosts) {
      if (userScoreMap.has(h.userId)) {
        h.score = userScoreMap.get(h.userId)!;
      }
    }
    for (const h of canonicalTeamBHosts) {
      if (userScoreMap.has(h.userId)) {
        h.score = userScoreMap.get(h.userId)!;
      }
    }
  }

  const sumScores = (hosts: CanonicalBattleParticipant[]) =>
    hosts.reduce((acc, h) => acc + (h.score || 0), 0);

  let scoreA = sumScores(canonicalTeamAHosts);
  let scoreB = sumScores(canonicalTeamBHosts);

  if (Array.isArray(sourceTeamArmies)) {
    const teamAUserIds = new Set(canonicalTeamAHosts.map((h) => h.userId));
    const teamBUserIds = new Set(canonicalTeamBHosts.map((h) => h.userId));

    for (const army of sourceTeamArmies) {
      const armyUserIds = (army.teamUsers || []).map((u) => String(u.userIdStr || u.userId || ''));
      const inA = armyUserIds.some((id) => teamAUserIds.has(id));
      const inB = armyUserIds.some((id) => teamBUserIds.has(id));

      if (inA && !inB && army.totalScore !== undefined) {
        scoreA = Math.max(scoreA, Number(army.totalScore));
      } else if (inB && !inA && army.totalScore !== undefined) {
        scoreB = Math.max(scoreB, Number(army.totalScore));
      }
    }
  }

  if (sourceTeamScores) {
    if (sourceTeamScores.team1Score !== undefined) scoreA = Math.max(scoreA, sourceTeamScores.team1Score);
    if (sourceTeamScores.team2Score !== undefined) scoreB = Math.max(scoreB, sourceTeamScores.team2Score);
  }

  if (previousAssignment && previousAssignment.battleId === battleId) {
    scoreA = Math.max(scoreA, previousAssignment.teamA.score);
    scoreB = Math.max(scoreB, previousAssignment.teamB.score);
  }

  const teamA: CanonicalBattleTeam = {
    teamId: 'TEAM_A',
    sourceTeamIdentifier: 'SOURCE_TEAM_A',
    hosts: canonicalTeamAHosts,
    score: scoreA,
    contributors: previousAssignment?.teamA.contributors || [],
  };

  const teamB: CanonicalBattleTeam = {
    teamId: 'TEAM_B',
    sourceTeamIdentifier: 'SOURCE_TEAM_B',
    hosts: canonicalTeamBHosts,
    score: scoreB,
    contributors: previousAssignment?.teamB.contributors || [],
  };

  return {
    battleId,
    sessionId,
    battleType,
    teamA,
    teamB,
    sourceEvidence: {
      ruleApplied: appliedRule,
      trackedStreamerMatchedBy: matchType,
      confidence,
      notes,
    },
    timestampUtc,
  };
}
