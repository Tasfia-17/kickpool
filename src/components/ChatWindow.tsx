"use client";

import * as React from 'react';
const { useState, useRef, useEffect } = React;
import { useSession } from 'next-auth/react';
import { createPortal } from 'react-dom';
import { useSocket } from '../hooks/useSocket';
import { useSounds } from '../hooks/useSounds';
import { useToast } from './ui/Toast';
import DebugErrorBoundary from './DebugErrorBoundary';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
}

interface ChatWindowProps {
  friend: { id: string; username: string; image?: string };
  onClose: () => void;
  style?: React.CSSProperties;
  index?: number; // 0 is right-most (closest to the edge)
  width?: number;
  gap?: number;
}

// No default mock messages - start with an empty conversation unless messages are provided via props or fetched

const ChatWindow: React.FC<ChatWindowProps> = ({ friend, onClose, style, index = 0, width = 350, gap = 16 }) => {
  const { data: session } = useSession();
  const { playMessageSound } = useSounds();
  const { addToast } = useToast();
  // Start with an empty message list by default. Messages should be provided by props or fetched from the server
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use local friendly variables for id/username to avoid TypeScript complaining about session.user typings
  const userId = (session?.user as any)?.id;
  const username = (session?.user as any)?.username;
  const socket = useSocket(`dm-${userId ?? ''}`, userId ? { id: userId, name: username, image: (session?.user as any)?.image } : undefined as any);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // helper to persist messages to localStorage per friend and update state
  const saveMessages = (arrOrUpdater: Message[] | ((prev: Message[]) => Message[])) => {
    setMessages(prev => {
      const next = typeof arrOrUpdater === 'function' ? (arrOrUpdater as ((p: Message[]) => Message[]))(prev) : arrOrUpdater;
      try {
        localStorage.setItem(`dm:${friend.id}`, JSON.stringify(next));
      } catch {
        // ignore storage errors in restricted environments
      }
      if (process.env.NODE_ENV !== 'production') console.debug('[ChatWindow] saveMessages', friend.id, next);
      return next as Message[];
    });
  };

  useEffect(() => {
    // restore locally-persisted messages immediately so UI doesn&apos;t appear blank
    try {
      const raw = localStorage.getItem(`dm:${friend.id}`);
      if (raw) {
        const parsed: Message[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          saveMessages(parsed);
        }
      }
    } catch {
      // ignore
    }

    const controller = new AbortController();
    const fetchMessages = async () => {
      if (!session) return;
      try {
        const res = await fetch(`/api/messages/dm?friendId=${encodeURIComponent(friend.id)}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          // Server should return an array of messages. If it doesn&apos;t, avoid crashing.
          let serverMessages: any[] = [];
          if (Array.isArray(data)) {
            serverMessages = data;
          } else if (data && Array.isArray((data as any).messages)) {
            serverMessages = (data as any).messages;
          } else {
            console.warn('[ChatWindow] Unexpected DM response shape for friend', friend.id, data);
          }

          if (serverMessages.length > 0) {
            let mapped: Message[] = [];
            if (Array.isArray(serverMessages)) {
              mapped = serverMessages.map((m: any) => ({
                id: m.id,
                text: m.text,
                sender: userId === m.senderId ? 'me' : friend.username,
                timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }));
            }
            // if server has messages, prefer them (they are authoritative). Also persist them locally.
            saveMessages(mapped);
          }
        } else {
          console.error('Failed to fetch DM messages');
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Fetch DM error', error);
      }
    };
    fetchMessages();
    return () => controller.abort();
  }, [friend.id, session]);

  useEffect(() => {
    if (!socket || !session) return;
    const onReceived = (dm: any) => {
      if (dm.senderId === friend.id && dm.receiverId === userId) {
        // append and persist using updater so we always operate on latest messages
        if (process.env.NODE_ENV !== 'production') console.debug('[ChatWindow] onReceived dm', dm);
        saveMessages(prev => ([...prev, {
          id: dm.id,
          text: dm.text,
          sender: friend.username,
          timestamp: new Date(dm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]));

        // Play sound and show popup if window is minimized or not visible
        if (minimized || document.hidden) {
          playMessageSound();
          addToast({
            type: 'info',
            title: `Message from ${friend.username}`,
            message: dm.text.length > 50 ? dm.text.substring(0, 50) + '...' : dm.text,
            duration: 5000,
          });
        } else {
          // Still play sound even if window is open (subtle notification)
          playMessageSound();
        }
      }
    };
    const onSent = (dm: any) => {
      if (dm.receiverId === friend.id && dm.senderId === userId) {
        if (process.env.NODE_ENV !== 'production') console.debug('[ChatWindow] onSent dm', dm);
        // replace optimistic temp id with server id in the latest messages
        saveMessages(prev => {
          if (!Array.isArray(prev)) return prev;
          return prev.map(m => m.id.startsWith('temp-') ? ({
            id: dm.id,
            text: dm.text,
            sender: 'me',
            timestamp: new Date(dm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }) : m);
        });
      }
    };
    socket.on('dm:received', onReceived);
    socket.on('dm:sent', onSent);
    return () => {
      socket.off('dm:received', onReceived);
      socket.off('dm:sent', onSent);
    };
  }, [socket, friend.id, friend.username, userId, session, minimized, playMessageSound, addToast]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!session) return;
    const text = input.trim();
    const optimisticMessage: Message = {
      id: 'temp-' + Math.random().toString(36).slice(2),
      text,
      sender: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    // optimistic update and persist locally so closing the window retains the message
    const next = [...messages, optimisticMessage];
    saveMessages(next);
    setInput('');
    // Prefer socket-based send for realtime + persistence. If no socket, fallback to API.
    if (socket) {
      socket.emit('dm:send', { receiverId: friend.id, text, sender: { id: userId, name: username } });
      // If socket event is delayed or missing, still show the message instantly
      // The onSent event will update the temp id to real id when received
    } else {
      try {
        const res = await fetch('/api/messages/dm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ friendId: friend.id, text }),
        });
        const data = await res.json();
        if (res.ok) {
          // Update the optimistic message with real id and timestamp
          saveMessages(Array.isArray(next) ? next.map(m => m.id === optimisticMessage.id ? ({
            id: data.id,
            text: data.text,
            sender: userId === data.senderId ? 'me' : friend.username,
            timestamp: new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }) : m) : next);
        } else {
          console.error('Failed to send DM', data);
        }
      } catch (err) {
        console.error('Error sending DM', err);
      }
    }
  };

  const root = typeof document !== 'undefined' ? document.body : null;
  const [mounted, setMounted] = useState(false);

  // Calculate rightOffset with bounds checking to prevent going off-screen
  const calculateRightOffset = () => {
    if (isMobile || typeof window === 'undefined') return 0;
    const baseOffset = 20 + index * (width + gap);
    const maxRight = window.innerWidth - width - 20; // 20px minimum from left edge
    return Math.min(baseOffset, maxRight);
  };

  const [rightOffset, setRightOffset] = useState(20);

  useEffect(() => {
    const updateOffset = () => {
      setRightOffset(calculateRightOffset());
    };
    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, [index, width, gap, isMobile]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const panelStyle: React.CSSProperties = {
    width: isMobile ? '100%' : width,
    height: minimized ? 'auto' : (isMobile ? '100%' : 500),
    maxHeight: isMobile ? '100dvh' : 500,
    background: '#fff',
    borderRadius: isMobile ? 0 : 18,
    border: isMobile ? 'none' : '2px solid #222',
    boxShadow: isMobile ? 'none' : '4px 4px 0px 0px #000',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100000,
    overflow: 'hidden',
    fontFamily: 'VT323, Inter, Arial, sans-serif',
    position: 'fixed',
    bottom: isMobile ? 0 : 24,
    right: isMobile ? 0 : rightOffset,
    left: isMobile ? 0 : 'auto',
    top: isMobile ? 0 : 'auto',
    transition: 'transform 240ms cubic-bezier(.2,.8,.2,1), opacity 160ms ease',
    transform: mounted ? 'translateY(0)' : 'translateY(8px)',
    opacity: mounted ? 1 : 0,
    ...style,
  };

  const content = (
    <div style={panelStyle}>
      {/* Chat Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '2px solid #222', background: '#fff',
        padding: isMobile ? 'max(18px, env(safe-area-inset-top)) 16px 16px 16px' : '18px 20px 16px 20px',
        minHeight: isMobile ? 60 : 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12 }}>
          <div style={{ position: 'relative', borderRadius: 12, background: '#f3f4f6', width: isMobile ? 40 : 44, height: isMobile ? 40 : 44, overflow: 'hidden' }}>
            {friend.image ? (
              <img src={friend.image} alt={friend.username} style={{ width: isMobile ? 40 : 44, height: isMobile ? 40 : 44, borderRadius: 12, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: isMobile ? 40 : 44, height: isMobile ? 40 : 44, borderRadius: 12, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: isMobile ? 18 : 22 }}>{friend.username[0].toUpperCase()}</div>
            )}
            <div style={{ position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, background: '#10b981', border: '2px solid #fff' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: isMobile ? 16 : 18, lineHeight: 1.1 }}>{friend.username}</div>
            <div style={{ fontSize: isMobile ? 12 : 13, color: '#888', marginTop: 2 }}>Online</div>
          </div>
        </div>
        <button
          aria-label="Close chat"
          tabIndex={0}
          onClick={onClose}
          style={{ background: 'none', color: '#ff69b4', border: 'none', fontSize: isMobile ? 28 : 22, cursor: 'pointer', fontWeight: 700, padding: isMobile ? '8px' : 0, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✖</button>
      </div>
      {/* Chat Messages */}
      {!minimized && (
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#fff', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 17, textAlign: 'center' }}>No messages yet. Start the conversation!</div>
          ) : (
            (Array.isArray(messages) ? messages : []).map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: msg.sender === 'me' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: 8,
              }}>
                <div style={{
                  maxWidth: '75%',
                  background: msg.sender === 'me' ? '#ff69b4' : '#f3f4f6',
                  color: msg.sender === 'me' ? '#fff' : '#222',
                  borderRadius: msg.sender === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '12px 18px',
                  fontSize: 17,
                  fontWeight: 500,
                  boxShadow: '2px 2px 0px 0px #000',
                  border: '2px solid #222',
                  position: 'relative',
                }}>
                  {msg.text}
                  <div style={{ fontSize: 13, color: '#888', marginTop: 6, textAlign: 'right' }}>{msg.timestamp}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
      {/* Chat Input */}
      {!minimized && (
        <div style={{
          borderTop: '2px solid #222',
          background: '#fff',
          padding: isMobile ? '12px 12px max(12px, env(safe-area-inset-bottom))' : '16px 20px',
          display: 'flex',
          gap: 8
        }}>
          <input
            aria-label={`Message to ${friend.username}`}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              borderRadius: 10,
              border: '2px solid #222',
              padding: isMobile ? '10px' : '12px',
              fontSize: isMobile ? 18 : 17,
              fontWeight: 500,
              background: '#fff',
              color: '#222',
              outline: 'none',
              boxShadow: '2px 2px 0px 0px #000',
              minHeight: 44,
            }}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            style={{
              background: '#ff69b4',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: isMobile ? '10px 18px' : '12px 22px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: isMobile ? 18 : 17,
              boxShadow: '2px 2px 0px 0px #000',
              minHeight: 44,
              minWidth: 44,
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );

  if (!root) return <DebugErrorBoundary debugContext={{ friend, messages }}>{content}</DebugErrorBoundary>;
  return createPortal(<DebugErrorBoundary debugContext={{ friend, messages }}>{content}</DebugErrorBoundary>, root);
};

export default ChatWindow;
