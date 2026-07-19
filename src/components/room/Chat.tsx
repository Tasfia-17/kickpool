'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Sprout, MonitorPlay, Film, Clapperboard, Zap, Trophy, Crown, LucideProps } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { subscribeCachedRoomUsers } from '@/hooks/useSocket';
import { UserProfilePopup } from './UserProfilePopup';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useSounds } from '@/hooks/useSounds';
import { useBadges } from '@/components/Badges/BadgeProvider';
import { getCineRank, CINE_RANKS } from '@/lib/cineRank';
import type { FC } from 'react';

const RANK_ICON_MAP: Record<string, FC<LucideProps>> = {
  Sprout, MonitorPlay, Film, Clapperboard, Zap, Trophy, Crown,
};

interface ChatProps {
  roomId: string;
  socket: Socket | null;
  username: string;
}

// Countdown Popup Component
const CountdownPopup: React.FC<{ onComplete: () => void; starterName: string }> = ({ onComplete, starterName }) => {
  const [count, setCount] = useState(5);
  const showPlay = count <= 0;

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }
    const closeTimer = setTimeout(onComplete, 3000);
    return () => clearTimeout(closeTimer);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] animate-pulse">
      <div className="text-center">
        <p className="text-white text-lg mb-4">🎬 {starterName} started a countdown!</p>
        {!showPlay ? (
          <>
            <div className="text-[150px] font-bold text-white animate-bounce drop-shadow-[0_0_30px_rgba(255,105,180,0.8)]">
              {count}
            </div>
            <p className="text-pink-400 text-2xl font-bold mt-4">Get ready to press PLAY!</p>
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-[80px] animate-pulse">▶️</div>
            <div className="text-6xl font-bold text-green-400 animate-bounce drop-shadow-[0_0_30px_rgba(74,222,128,0.8)]">
              PLAY NOW!
            </div>
            <p className="text-white text-xl">Press play on your video!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Chat commands configuration (moved outside component to prevent recreation on every render)
const CHAT_COMMANDS: Record<string, { description: string; handler: (args: string, username: string) => string }> = {
  '/shrug': { description: 'Adds a shrug', handler: (args) => `${args} ¯\\_(ツ)_/¯` },
  '/tableflip': { description: 'Flips a table', handler: () => '(╯°□°)╯︵ ┻━┻' },
  '/unflip': { description: 'Puts table back', handler: () => '┬─┬ノ( º _ ºノ)' },
  '/lenny': { description: 'Lenny face', handler: () => '( ͡° ͜ʖ ͡°)' },
  '/disapprove': { description: 'Disapproval look', handler: () => 'ಠ_ಠ' },
  '/sparkles': { description: 'Add sparkles', handler: (args) => `✨ ${args} ✨` },
  '/cat': { description: 'Cat face', handler: () => '(=^･ω･^=)' },
  '/love': { description: 'Love message', handler: (args) => `💕 ${args} 💕` },
  '/me': { description: 'Action message', handler: (args, username) => `*${username} ${args}*` },
  '/hug': { description: 'Send a hug', handler: (args) => args ? `(づ｡◕‿‿◕｡)づ ${args}` : '(づ｡◕‿‿◕｡)づ' },
  '/dance': { description: 'Dance!', handler: () => '♪┏(・o･)┛♪┗( ･o･)┓♪' },
  '/party': { description: 'Party time!', handler: () => '🎉🎊🥳 PARTY TIME! 🥳🎊🎉' },
  '/pikachu': { description: 'Pikachu face', handler: () => '⚡ (◕ᴗ◕✿) ピカチュウ! ⚡' },
  '/fire': { description: 'Fire emoji spam', handler: (args) => `🔥🔥🔥 ${args} 🔥🔥🔥` },
  '/cool': { description: 'Cool face', handler: () => '😎✨ *puts on sunglasses* ✨' },
  '/cry': { description: 'Crying', handler: () => '(╥﹏╥)' },
  '/angry': { description: 'Angry face', handler: () => '(ノಠ益ಠ)ノ彡┻━┻' },
  '/happy': { description: 'Happy face', handler: () => '(◠‿◠)' },
  '/bear': { description: 'Bear hug', handler: (args) => args ? `ʕっ•ᴥ•ʔっ ${args}` : 'ʕっ•ᴥ•ʔっ' },
  '/run': { description: 'Running away', handler: () => '𝄞 ε=ε=ε=┌(;*´Д`)ﾉ' },
  '/wave': { description: 'Wave hello', handler: () => '(^-^)/' },
  '/poke': { description: 'Poke someone', handler: (args) => args ? `(☞ﾟヮﾟ)☞ *pokes ${args}*` : '(☞ﾟヮﾟ)☞' },
  '/countdown': { description: 'Start a countdown', handler: () => '🎬 COUNTDOWN: Get ready to press play! 5... 4... 3... 2... 1... ▶️ PLAY!' },
  '/sync': { description: 'Sync reminder', handler: () => '🔄 SYNC CHECK: Everyone pause your video! Host will count down with /countdown' },
  '/ready': { description: 'Ready check', handler: () => '✅ I\'m READY to watch!' },
  '/notready': { description: 'Not ready', handler: () => '⏳ Wait for me! Not ready yet...' },
  '/help': { description: 'Show commands', handler: () => 'Commands: /shrug /tableflip /unflip /lenny /cat /love /me /hug /dance /party /countdown /sync /ready /notready /help' },
};

const ChatComponent: React.FC<ChatProps> = ({ roomId, socket, username }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ username: string; x: number; y: number } | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [countdownPopup, setCountdownPopup] = useState<{ show: boolean; starterName: string }>({ show: false, starterName: '' });
  const [roomUserWatchTime, setRoomUserWatchTime] = useState<Map<string, number>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { playMessageSound, playJoinSound, playLeaveSound } = useSounds();
  const { awardBadge, hasBadge, isReady: badgesReady } = useBadges();

  // Theme from provider
  const { isDarkMode } = usePokemonTheme();

  // Subscribe to user cache for watch time data (used for CineRank display).
  // This replaces the removed direct socket.on('room:users_update') listener.
  useEffect(() => {
    return subscribeCachedRoomUsers(roomId, (users: Array<{ name: string; watchTime?: number }>) => {
      setRoomUserWatchTime(new Map(users.map(u => [u.name, u.watchTime ?? 0])));
    });
  }, [roomId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    // Use named handler references so socket.off only removes THIS instance's listener,
    // not all listeners (critical when multiple Chat instances are mounted e.g. mobile+desktop)
    const handleHistory = (history: ChatMessage[]) => {
      setMessages(history || []);
    };

    const handleCountdown = ({ starterName }: { starterName: string }) => {
      setCountdownPopup({ show: true, starterName });
    };

    const handleBroadcast = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      // Play sound for messages from others
      if (message.user !== username && !message.isSystem) {
        playMessageSound();
      }
      // Play sound for join/leave
      if (message.isSystem) {
        if (message.text.includes('joined')) {
          playJoinSound();
        } else if (message.text.includes('left')) {
          playLeaveSound();
        }
      }
    };

    const handleTypingUpdate = (users: string[]) => {
      setTypingUsers(users.filter(u => u !== username));
    };

    const handleChatError = ({ message }: { message: string }) => {
      setChatError(message);
      setTimeout(() => setChatError(null), 3000);
    };

    const handleReaction = ({ messageId, emoji, user }: { messageId: string; emoji: string; user: string }) => {
      setMessages(prev => Array.isArray(prev) ? prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions ? JSON.parse(msg.reactions as string) : {};
          if (!reactions[emoji]) reactions[emoji] = [];
          if (!reactions[emoji].includes(user)) {
            reactions[emoji].push(user);
          }
          return { ...msg, reactions: JSON.stringify(reactions) };
        }
        return msg;
      }) : prev);
    };

    socket.on('chat:history', handleHistory);
    socket.on('room:countdown', handleCountdown);
    socket.on('chat:broadcast', handleBroadcast);
    socket.on('chat:typing_update', handleTypingUpdate);
    socket.on('chat:error', handleChatError);
    socket.on('chat:reaction', handleReaction);

    // Request chat history after setting up listeners
    socket.emit('chat:request_history', { roomId });

    return () => {
      // Pass the exact handler reference so only THIS instance's listener is removed
      socket.off('chat:history', handleHistory);
      socket.off('chat:broadcast', handleBroadcast);
      socket.off('chat:typing_update', handleTypingUpdate);
      socket.off('chat:error', handleChatError);
      socket.off('chat:reaction', handleReaction);
      socket.off('room:countdown', handleCountdown);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [socket, username, roomId, playJoinSound, playLeaveSound, playMessageSound]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Scroll to bottom when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also scroll on window focus
    const handleFocus = () => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const processCommand = useCallback((message: string): string | null => {
    const trimmed = message.trim();
    for (const [cmd, { handler }] of Object.entries(CHAT_COMMANDS)) {
      if (trimmed.startsWith(cmd)) {
        const args = trimmed.slice(cmd.length).trim();
        return handler(args, username);
      }
    }
    return null;
  }, [username]);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket) return;

    // Check if it&apos;s a countdown command - trigger popup for everyone
    if (inputValue.trim().toLowerCase() === '/countdown') {
      socket.emit('room:start_countdown', { roomId, starterName: username });
    }

    // Process commands
    const processedMessage = processCommand(inputValue) || inputValue;

    socket.emit('chat:message', {
      roomId,
      message: processedMessage,
      user: username,
    });

    // Achievement: First message (only check if badges are ready)
    if (badgesReady && !hasBadge('first-message')) {
      awardBadge('first-message', 'First Words', 'Send your first message', '💬');
    }

    socket.emit('chat:typing_stop', { roomId, user: username });
    setInputValue('');
  }, [inputValue, socket, roomId, username, processCommand, badgesReady, hasBadge, awardBadge]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    if (!socket) return;

    // Send typing indicator
    socket.emit('chat:typing_start', { roomId, user: username });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing_stop', { roomId, user: username });
    }, 2000);
  };

  const handleUserClick = (e: React.MouseEvent, targetUsername: string) => {
    setSelectedUser({
      username: targetUsername,
      x: e.clientX,
      y: e.clientY
    });
  };

  return (
    <div
      className="chat-container relative transition-colors"
      style={{
        backgroundColor: isDarkMode ? '#1a1a2e' : 'white',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      {/* Countdown Popup */}
      {countdownPopup.show && (
        <CountdownPopup
          starterName={countdownPopup.starterName}
          onComplete={() => setCountdownPopup({ show: false, starterName: '' })}
        />
      )}

      {selectedUser && (
        <UserProfilePopup
          username={selectedUser.username}
          position={{ x: selectedUser.x, y: selectedUser.y }}
          roomId={roomId}
          onClose={() => setSelectedUser(null)}
        />
      )}
      {/* Messages Area - Fixed container that scrolls */}
      <div
        className="chat-messages p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-black scrollbar-track-transparent"
        style={{ flex: '1 1 0%', overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
      >
        {messages.length === 0 && (
          <div className={`text-center text-xs sm:text-sm mt-10 font-mono flex items-center justify-center gap-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            No messages yet.
          </div>
        )}

        {Array.isArray(messages) ? messages.map((msg) => {
          if (msg.isBroadcast) {
            return (
              <div key={msg.id} className="flex justify-center my-4 animate-fade-in-up">
                <div className="bg-red-500 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 text-white max-w-[90%] font-bold text-center space-y-1">
                  <div className="text-xs font-black uppercase tracking-widest text-red-100 flex items-center justify-center gap-2">
                    <span className="animate-pulse">⚠️</span> SYSTEM ALERT <span className="animate-pulse">⚠️</span>
                  </div>
                  <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          }

          if (msg.isSystem) {
            // Check for high-rank join announcement (Binge Lord+)
            const joinMatch = msg.text.match(/^(.+) joined the room$/);
            if (joinMatch) {
              const joiningUsername = joinMatch[1];
              const wt = roomUserWatchTime.get(joiningUsername) ?? 0;
              const rank = getCineRank(wt);
              const rankIndex = CINE_RANKS.findIndex(r => r.title === rank.title);
              const RIcon = RANK_ICON_MAP[rank.icon];
              if (rankIndex >= 4 && RIcon) {
                return (
                  <div key={msg.id} className="flex justify-center my-3">
                    <div
                      className="flex items-center gap-2 px-4 py-2 border-2 font-bold text-xs font-mono"
                      style={{ borderColor: rank.color, backgroundColor: `${rank.color}18`, color: rank.color }}
                    >
                      <RIcon size={14} />
                      <span style={{ color: rank.color }}>{rank.title}</span>
                      <span className={isDarkMode ? 'text-white' : 'text-black'}>{joiningUsername}</span>
                      <span className="opacity-70">joined the room!</span>
                      <RIcon size={14} />
                    </div>
                  </div>
                );
              }
            }
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span
                  className={`text-xs px-3 py-1 border border-black border-dashed font-mono ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-black'}`}
                >
                  {msg.text}
                </span>
              </div>
            );
          }

          const isMe = msg.user === username;
          const isFounder = msg.isFounder;
          const isVIP = msg.isVIP;

          // CineRank — only show for ranks above Newcomer (index > 0)
          const cineRank = msg.watchTime !== undefined ? getCineRank(msg.watchTime) : null;
          const showRank = cineRank && cineRank.title !== 'Newcomer';
          const RankIconComponent = cineRank ? RANK_ICON_MAP[cineRank.icon] : null;

          // VIP font mapping
          const getFontFamily = (font?: string) => {
            switch (font) {
              case 'mono': return 'monospace';
              case 'serif': return 'serif';
              case 'cursive': return 'cursive';
              case 'fantasy': return 'fantasy';
              case 'comic': return '"Comic Sans MS", cursive';
              default: return 'inherit';
            }
          };

          // Get name style based on VIP/Founder status
          const getNameStyle = () => {
            if (isFounder) {
              return {
                backgroundImage: 'linear-gradient(90deg, #a855f7, #ec4899, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 10px rgba(168,85,247,0.6)',
                fontFamily: 'inherit',
                animation: 'pulse 2s ease-in-out infinite',
              } as React.CSSProperties;
            }
            if (isVIP && msg.vipNameColor) {
              return {
                color: msg.vipNameColor,
                fontFamily: getFontFamily(msg.vipFont),
                textShadow: msg.vipGlow ? `0 0 8px ${msg.vipNameColor}, 0 0 16px ${msg.vipNameColor}` : 'none',
              };
            }
            return {
              color: isDarkMode ? '#9ca3af' : '#6b7280',
            };
          };

          // Get badge based on status
          const getBadge = () => {
            if (isFounder) return '👑';
            if (isVIP && msg.vipBadge) return msg.vipBadge;
            if (isVIP) return '⭐';
            return null;
          };

          return (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col max-w-full mb-1",
                isMe ? "items-end" : "items-start"
              )}
            >
              {/* Username and time */}
              {!isMe && (
                <div className="flex items-center gap-1 mb-0.5">
                  {getBadge() && (
                    <span className={cn("text-[10px]", isFounder && "animate-pulse")}>{getBadge()}</span>
                  )}
                  <span
                    className={cn(
                      "text-[15px] font-bold cursor-pointer hover:underline",
                      isFounder && "animate-pulse"
                    )}
                    style={getNameStyle()}
                    onClick={(e) => handleUserClick(e, msg.user)}
                  >
                    {msg.user}{isFounder && '✨'}{isVIP && !isFounder && '★'}
                  </span>
                  {showRank && RankIconComponent && (
                    <span
                      title={cineRank!.title}
                      className="flex items-center"
                      style={{ color: cineRank!.color }}
                    >
                      <RankIconComponent size={12} />
                    </span>
                  )}
                  <span className="text-[13px] text-gray-400 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              {/* Message bubble */}
              <div
                className={cn(
                  "px-4 py-2.5 text-[18px] leading-relaxed break-words rounded-lg max-w-[85%]",
                  isFounder ? "border border-purple-500" : "",
                  isMe
                    ? "bg-[#ff69b4] text-white rounded-br-none"
                    : (isDarkMode ? "bg-gray-700 text-white rounded-bl-none" : "bg-gray-100 text-black rounded-bl-none")
                )}
              >
                {msg.text}
              </div>

              {/* Time for own messages */}
              {isMe && (
                <span className="text-[13px] text-gray-400 mt-0.5 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          );
        }) : null}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {chatError && (
        <div className="px-4 py-2 bg-red-500 text-white text-xs font-bold text-center">
          {chatError}
        </div>
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className={`px-4 py-1 text-xs font-mono ${isDarkMode ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-gray-100'}`}>
          <span className="inline-flex items-center gap-1">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </span>
            <span className="ml-1">
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : typingUsers.length === 2
                  ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                  : `${typingUsers.length} people are typing...`}
            </span>
          </span>
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className={`chat-input-area p-2 border-t-2 transition-colors safe-area-bottom ${isDarkMode ? 'border-white/20' : 'border-black/20'}`}
        style={{ backgroundColor: isDarkMode ? '#111' : '#fff0f5' }}
      >
        <div className="relative flex items-center gap-1.5 sm:gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className={`flex-1 border-2 rounded-lg p-2.5 sm:p-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 min-h-[44px] ${isDarkMode ? 'bg-gray-800 text-white placeholder:text-gray-500 border-gray-600' : 'bg-white text-black placeholder:text-gray-400 border-gray-300'}`}
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="p-2.5 sm:p-2 bg-[#ff69b4] rounded-lg active:translate-y-[1px] disabled:opacity-50 transition-all text-white min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#ff5aa0]"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};
export const Chat = React.memo(ChatComponent);
