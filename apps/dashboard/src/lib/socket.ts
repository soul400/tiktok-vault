import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.IO client that connects directly to the API server.
 * - Guarded against SSR (returns null-safe stub during server rendering)
 * - Uses WebSocket transport only (no long-polling fallback that causes reconnect loops)
 * - Singleton: only one instance is ever created per browser tab
 */
export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    // SSR guard — return a no-op proxy that won't crash during server render.
    // The real socket is created client-side only.
    return {
      on: () => {},
      off: () => {},
      emit: () => {},
      connect: () => {},
      disconnect: () => {},
      connected: false,
      id: '',
    } as unknown as Socket;
  }

  if (!socket) {
    const activeTunnel = 'https://attacks-debut-inquiries-startup.trycloudflare.com';
    const apiUrl = activeTunnel || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    socket = io(apiUrl, {
      transports: ['websocket'],      // WebSocket only — no polling fallback
      reconnection: true,             // Auto-reconnect on disconnect
      reconnectionAttempts: Infinity,  // Keep trying
      reconnectionDelay: 1000,         // Start at 1s
      reconnectionDelayMax: 10000,     // Max 10s between attempts
      randomizationFactor: 0.3,        // Jitter to avoid thundering herd
      timeout: 20000,                  // Connection timeout 20s
      autoConnect: true,
    });

    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
      socket.on('connect', () => {
        console.log('[Socket.IO] ✅ Connected:', socket?.id);
      });
      socket.on('disconnect', (reason) => {
        console.log('[Socket.IO] ❌ Disconnected:', reason);
      });
      socket.on('connect_error', (err) => {
        console.log('[Socket.IO] ⚠️ Connection error:', err.message);
      });
      socket.on('reconnect_attempt', (attempt) => {
        console.log('[Socket.IO] 🔄 Reconnect attempt:', attempt);
      });
      socket.on('reconnect', (attempt) => {
        console.log('[Socket.IO] ✅ Reconnected after', attempt, 'attempts');
      });
    }
  }

  return socket;
}
