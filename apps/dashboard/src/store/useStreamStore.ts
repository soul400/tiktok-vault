import { create } from 'zustand';
import { LiveEventEnvelope } from '@aep/event-model';

export interface StreamerItem {
  id: string;
  username: string;
  uniqueId: string;
  displayName?: string;
  profileImage?: string;
  status: 'LIVE' | 'OFFLINE' | 'CONNECTING' | 'DEGRADED' | 'ERROR';
  monitoringEnabled: boolean;
  liveSession?: any;
  telemetry?: any;
}

export interface StreamMetrics {
  viewers: number;
  likes: number;
  comments: number;
  gifts: number;
  diamonds: number;
}

export interface PowerUpAlert {
  id: string;
  type: 'ACQUIRED' | 'USED';
  streamerUsername: string;
  user: any;
  payload: any;
  timestamp: string;
}

export interface WatchlistAlert {
  id: string;
  user: any;
  streamerUsername: string;
  eventType: string;
  payload: any;
  rule: any;
  timestamp: string;
}

interface StreamStore {
  selectedStreamer: StreamerItem | null;
  streamers: StreamerItem[];
  events: LiveEventEnvelope[];
  metrics: StreamMetrics;
  activeBattle: any | null;
  alerts: PowerUpAlert[];
  watchlistAlerts: WatchlistAlert[];
  health: {
    status: string;
    eventsPerSec: number;
    latencyMs: number;
    reconnectCount: number;
    lastEventAt: string;
  };

  setSelectedStreamer: (streamer: StreamerItem | null) => void;
  setStreamers: (streamers: StreamerItem[]) => void;
  addEvent: (event: LiveEventEnvelope) => void;
  updateMetrics: (partial: Partial<StreamMetrics>) => void;
  setActiveBattle: (battle: any | null | ((prev: any) => any)) => void;
  addAlert: (alert: PowerUpAlert) => void;
  dismissAlert: (id: string) => void;
  addWatchlistAlert: (alert: WatchlistAlert) => void;
  dismissWatchlistAlert: (id: string) => void;
  setHealth: (health: Partial<StreamStore['health']>) => void;
  resetStreamData: () => void;
}

export const useStreamStore = create<StreamStore>((set) => ({
  selectedStreamer: null,
  streamers: [],
  events: [],
  metrics: {
    viewers: 0,
    likes: 0,
    comments: 0,
    gifts: 0,
    diamonds: 0,
  },
  activeBattle: null,
  alerts: [],
  watchlistAlerts: [],
  health: {
    status: 'OFFLINE',
    eventsPerSec: 0,
    latencyMs: 0,
    reconnectCount: 0,
    lastEventAt: '',
  },

  setSelectedStreamer: (streamer) =>
    set({
      selectedStreamer: streamer,
      events: [],
      metrics: { viewers: 0, likes: 0, comments: 0, gifts: 0, diamonds: 0 },
      activeBattle: null,
    }),

  setStreamers: (streamers) => set({ streamers }),

  addEvent: (event) =>
    set((state) => {
      if (event.id && state.events.some((e) => e.id === event.id)) {
        return state;
      }
      return {
        events: [event, ...state.events].slice(0, 500),
      };
    }),

  updateMetrics: (partial) =>
    set((state) => ({
      metrics: { ...state.metrics, ...partial },
    })),

  setActiveBattle: (battle) =>
    set((state) => ({
      activeBattle: typeof battle === 'function' ? battle(state.activeBattle) : battle,
    })),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 10),
    })),

  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),

  addWatchlistAlert: (alert) =>
    set((state) => ({
      watchlistAlerts: [alert, ...state.watchlistAlerts].slice(0, 10),
    })),

  dismissWatchlistAlert: (id) =>
    set((state) => ({
      watchlistAlerts: state.watchlistAlerts.filter((a) => a.id !== id),
    })),

  setHealth: (partial) =>
    set((state) => ({
      health: { ...state.health, ...partial },
    })),

  resetStreamData: () =>
    set({
      events: [],
      metrics: { viewers: 0, likes: 0, comments: 0, gifts: 0, diamonds: 0 },
      activeBattle: null,
    }),
}));
