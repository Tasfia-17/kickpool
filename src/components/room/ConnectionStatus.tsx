'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface ConnectionStatusProps {
  socket: Socket | null;
  roomId: string;
  isDarkMode: boolean;
}

type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';

export function ConnectionStatus({ socket, roomId, isDarkMode }: ConnectionStatusProps) {
  const [state, setState] = useState<ConnectionState>('connecting');
  const [latency, setLatency] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) {
      setState('disconnected');
      return;
    }

    const handleConnect = () => {
      setState('connected');
      setReconnectAttempt(0);
      setLastError(null);
    };

    const handleDisconnect = (reason: string) => {
      setState('disconnected');
      setLastError(reason);
    };

    const handleConnectError = (err: Error) => {
      setState('error');
      setLastError(err.message);
    };

    const handleReconnectAttempt = (attempt: number) => {
      setState('reconnecting');
      setReconnectAttempt(attempt);
    };

    const handleReconnect = () => {
      setState('connected');
      setReconnectAttempt(0);
      // Rejoin room after reconnect
      socket.emit('player:request_sync', { roomId });
    };

    // Ping/pong for latency measurement
    const measureLatency = () => {
      if (socket.connected) {
        const start = Date.now();
        socket.emit('ping', () => {
          setLatency(Date.now() - start);
        });
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect', handleReconnect);

    // Check initial state
    if (socket.connected) {
      setState('connected');
    }

    // Measure latency every 10 seconds
    const latencyInterval = setInterval(measureLatency, 10000);
    measureLatency(); // Initial measurement

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect', handleReconnect);
      clearInterval(latencyInterval);
    };
  }, [socket, roomId]);

  const getStateConfig = () => {
    switch (state) {
      case 'connected':
        return {
          icon: <Wifi size={14} />,
          color: 'text-green-500',
          bgColor: isDarkMode ? 'bg-green-500/20' : 'bg-green-100',
          label: 'Connected',
          showPulse: false
        };
      case 'connecting':
        return {
          icon: <RefreshCw size={14} className="animate-spin" />,
          color: 'text-yellow-500',
          bgColor: isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100',
          label: 'Connecting...',
          showPulse: true
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw size={14} className="animate-spin" />,
          color: 'text-orange-500',
          bgColor: isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100',
          label: `Reconnecting... (${reconnectAttempt})`,
          showPulse: true
        };
      case 'disconnected':
        return {
          icon: <WifiOff size={14} />,
          color: 'text-red-500',
          bgColor: isDarkMode ? 'bg-red-500/20' : 'bg-red-100',
          label: 'Disconnected',
          showPulse: false
        };
      case 'error':
        return {
          icon: <AlertTriangle size={14} />,
          color: 'text-red-500',
          bgColor: isDarkMode ? 'bg-red-500/20' : 'bg-red-100',
          label: 'Connection Error',
          showPulse: false
        };
    }
  };

  const config = getStateConfig();

  // Only show the full indicator when not connected
  const showFullIndicator = state !== 'connected';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-bold transition-all ${config.bgColor} ${config.color}`}
      >
        {config.showPulse && (
          <span className="absolute -top-1 -right-1 w-2 h-2">
            <span className={`absolute inline-flex h-full w-full rounded-full ${config.color.replace('text-', 'bg-')} opacity-75 animate-ping`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color.replace('text-', 'bg-')}`}></span>
          </span>
        )}
        {config.icon}
        {showFullIndicator && <span className="hidden sm:inline">{config.label}</span>}
        {state === 'connected' && latency !== null && (
          <span className="hidden sm:inline text-[10px] opacity-70">{latency}ms</span>
        )}
      </button>

      {/* Details Dropdown */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute top-full right-0 mt-2 w-64 rounded-lg border-2 shadow-lg z-50 ${
              isDarkMode ? 'bg-gray-900 border-white/20' : 'bg-white border-black'
            }`}
          >
            <div className="p-3">
              <div className="flex items-center gap-2 mb-3">
                {config.icon}
                <span className={`font-bold ${config.color}`}>{config.label}</span>
              </div>

              {/* Connection Info */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Status</span>
                  <span className={`font-mono ${config.color}`}>{state.toUpperCase()}</span>
                </div>
                {latency !== null && (
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Latency</span>
                    <span className={`font-mono ${latency < 100 ? 'text-green-500' : latency < 300 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {latency}ms
                    </span>
                  </div>
                )}
                {socket?.id && (
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Socket ID</span>
                    <span className="font-mono text-[10px] opacity-70">{socket.id.slice(0, 8)}...</span>
                  </div>
                )}
                {lastError && (
                  <div className={`p-2 rounded text-[10px] ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                    {lastError}
                  </div>
                )}
              </div>

              {/* Reconnect Button */}
              {(state === 'disconnected' || state === 'error') && socket && (
                <button
                  onClick={() => socket.connect()}
                  className={`w-full mt-3 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 ${
                    isDarkMode 
                      ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30' 
                      : 'bg-pink-500 text-white hover:bg-pink-600'
                  }`}
                >
                  <RefreshCw size={12} />
                  Reconnect
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
