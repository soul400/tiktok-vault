export interface BattleState {
  battleId: string;
  streamSessionId: string;
  battleType: '1v1' | '2v2' | 'MULTI';
  status: 'IN_PROGRESS' | 'FINISHED' | 'ABORTED';
  startedAt: Date;
  endedAt?: Date;
  teamAScore: number;
  teamBScore: number;
  currentMvpUserId?: string;
  winningTeamId?: string;
}

export interface BattleArmiesUpdate {
  battleId: string;
  teams: Array<{
    teamId: string;
    score: number;
    contributors: Array<{
      userId: string;
      uniqueId: string;
      nickname: string;
      score: number;
      rank: number;
      avatarUrl?: string;
    }>;
  }>;
}
