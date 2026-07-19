"use client";

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { motion, AnimatePresence } from 'motion/react';
import PixelCatMascot from '@/components/PixelCatMascot';
import { MessageCircle, X, Send, Sparkles, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import './AIChatbot.css';

interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: number;
    suggestions?: string[];
}

const WELCOME_MESSAGE: ChatMessage = {
    id: 'welcome',
    text: "Hey there! 🐱✨ I'm **PurrBot**, your CinePurr AI concierge! Ask me anything about rooms, XP, quests, themes, friends, or any feature. I'm here to help!",
    sender: 'bot',
    timestamp: Date.now(),
    suggestions: ['How do I create a room?', 'What is XP?', 'Tell me about themes', 'What features exist?'],
};

// Simple markdown-like bold parser
function formatMessage(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
    return parts.map((part, i) => {
        if (part === '\n') return <br key={i} />;
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-black">{part.slice(2, -2)}</strong>;
        }
        // Handle inline code
        if (part.includes('`')) {
            const codeParts = part.split(/(`[^`]+`)/g);
            return codeParts.map((cp, j) => {
                if (cp.startsWith('`') && cp.endsWith('`')) {
                    return <code key={`${i}-${j}`} className="bg-black/10 dark:bg-white/10 px-1 rounded font-mono text-xs">{cp.slice(1, -1)}</code>;
                }
                return cp;
            });
        }
        return part;
    });
}

function AIChatbot() {
    const { currentTheme, isDarkMode } = usePokemonTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Draggable / Minimizable state
    const [isMinimized, setIsMinimized] = useState<'left' | 'right' | false>(false);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, scrollToBottom]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setHasUnread(false);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            text: text.trim(),
            sender: 'user',
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        try {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text.trim() }),
                signal: abortControllerRef.current.signal
            });

            if (!res.ok) {
                throw new Error('Failed to get response');
            }

            const data = await res.json();

            // Simulate a small delay for natural feel
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

            const botMessage: ChatMessage = {
                id: `bot-${Date.now()}`,
                text: data.reply,
                sender: 'bot',
                timestamp: Date.now(),
                suggestions: data.suggestions,
            };

            setMessages(prev => [...prev, botMessage]);

            if (!isOpen) {
                setHasUnread(true);
            }
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: `error-${Date.now()}`,
                text: "Oops! Something went wrong. Please try again! 🐾",
                sender: 'bot',
                timestamp: Date.now(),
                suggestions: ['How do I create a room?', 'What is XP?', 'Help'],
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(inputValue);
    };

    const handleSuggestionClick = (suggestion: string) => {
        sendMessage(suggestion);
    };

    const toggleChat = () => {
        setIsOpen(prev => !prev);
    };

    const handleDragEnd = (event: any, info: any) => {
        const threshold = 50;
        if (info.point.x < threshold) {
            setIsMinimized('left');
            setIsOpen(false);
        } else if (info.point.x > window.innerWidth - threshold) {
            setIsMinimized('right');
            setIsOpen(false);
        }
    };

    const primaryColor = currentTheme.colors.primary;
    const darkBg = currentTheme.colors.darkBackground;

    if (isMinimized === 'left') {
        return (
            <motion.div
                initial={{ x: -50 }} animate={{ x: 0 }}
                className="fixed bottom-24 left-0 z-[801] bg-blue-500 rounded-r-xl p-2 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-y-2 border-r-2 border-black"
                onClick={() => setIsMinimized(false)}
            >
                <ChevronRight className="text-white" />
            </motion.div>
        );
    }

    if (isMinimized === 'right') {
        return (
            <motion.div
                initial={{ x: 50 }} animate={{ x: 0 }}
                className="fixed bottom-24 right-0 z-[801] bg-blue-500 rounded-l-xl p-2 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-y-2 border-l-2 border-black"
                onClick={() => setIsMinimized(false)}
            >
                <ChevronLeft className="text-white" />
            </motion.div>
        );
    }

    return (
        <motion.div
            drag
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            className="fixed bottom-3 sm:bottom-6 right-3 sm:right-6 z-[801] cursor-move"
            whileDrag={{ scale: 1.05 }}
        >
            <div className="relative pointer-events-auto">
                {/* Chat Panel */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            ref={panelRef}
                            initial={{ opacity: 0, scale: 0.9, x: 20, y: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, x: 20, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute bottom-20 sm:bottom-24 right-0 z-[800] w-[calc(100vw-1.5rem)] sm:w-[400px] max-h-[70vh] sm:max-h-[550px] flex flex-col origin-bottom-right"
                            style={{
                                border: '4px solid',
                                borderColor: isDarkMode ? 'white' : 'black',
                                boxShadow: isDarkMode
                                    ? '8px 8px 0px 0px rgba(255,255,255,0.2)'
                                    : '8px 8px 0px 0px rgba(0,0,0,1)',
                                backgroundColor: isDarkMode ? darkBg : 'white',
                            }}
                        >
                            {/* Title Bar */}
                            <div
                                className="flex items-center justify-between px-3 py-2 border-b-4 shrink-0"
                                style={{
                                    borderColor: isDarkMode ? 'white' : 'black',
                                    background: `linear-gradient(135deg, #111 0%, ${primaryColor}44 100%)`,
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full animate-pulse"
                                        style={{ backgroundColor: primaryColor }}
                                    />
                                    <span className="text-white font-mono font-bold text-sm tracking-wide">
                                        PURRBOT_AI.EXE
                                    </span>
                                    <Sparkles size={14} className="text-yellow-300" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={toggleChat}
                                        className="w-4 h-4 bg-[#ff5555] border border-gray-500 hover:bg-red-600 transition-colors cursor-pointer"
                                        aria-label="Close chatbot"
                                    />
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 chatbot-messages min-h-0"
                                style={{ backgroundColor: isDarkMode ? `${darkBg}` : '#fafafa' }}
                            >
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`chatbot-message-in flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {/* Bot avatar */}
                                        {msg.sender === 'bot' && (
                                            <div className="flex-shrink-0 mr-2 mt-1">
                                                <div
                                                    className="w-8 h-8 border-2 flex items-center justify-center overflow-hidden"
                                                    style={{
                                                        borderColor: isDarkMode ? 'white' : 'black',
                                                        backgroundColor: primaryColor + '20',
                                                    }}
                                                >
                                                    <PixelCatMascot size={24} variant="happy" animate={false} />
                                                </div>
                                            </div>
                                        )}

                                        <div className={`max-w-[80%] ${msg.sender === 'user' ? '' : ''}`}>
                                            {/* Message bubble */}
                                            <div
                                                className={`px-4 py-3 border-2 text-[18px] leading-relaxed ${msg.sender === 'user'
                                                    ? 'text-white'
                                                    : 'text-black dark:text-white'
                                                    }`}
                                                style={{
                                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.5)' : 'black',
                                                    backgroundColor: msg.sender === 'user'
                                                        ? primaryColor
                                                        : isDarkMode ? 'rgba(255,255,255,0.08)' : 'white',
                                                    boxShadow: msg.sender === 'user'
                                                        ? `3px 3px 0px 0px ${isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.4)'}`
                                                        : `3px 3px 0px 0px ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'}`,
                                                }}
                                            >
                                                {formatMessage(msg.text)}
                                            </div>

                                            {/* Suggestion chips */}
                                            {msg.sender === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {msg.suggestions.map((suggestion, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleSuggestionClick(suggestion)}
                                                            className="chatbot-suggestion text-[15px] font-bold px-3 py-1.5 border-2 cursor-pointer"
                                                            style={{
                                                                borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                                                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                                                color: primaryColor,
                                                                boxShadow: `2px 2px 0px 0px ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                            }}
                                                        >
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Typing indicator */}
                                {isTyping && (
                                    <div className="flex justify-start chatbot-message-in">
                                        <div className="flex-shrink-0 mr-2 mt-1">
                                            <div
                                                className="w-8 h-8 border-2 flex items-center justify-center overflow-hidden"
                                                style={{
                                                    borderColor: isDarkMode ? 'white' : 'black',
                                                    backgroundColor: primaryColor + '20',
                                                }}
                                            >
                                                <PixelCatMascot size={24} variant="default" animate={true} />
                                            </div>
                                        </div>
                                        <div
                                            className="px-4 py-3 border-2 flex items-center gap-1.5"
                                            style={{
                                                borderColor: isDarkMode ? 'rgba(255,255,255,0.5)' : 'black',
                                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'white',
                                                boxShadow: `3px 3px 0px 0px ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'}`,
                                            }}
                                        >
                                            <span className="chatbot-typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                                            <span className="chatbot-typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                                            <span className="chatbot-typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <form
                                onSubmit={handleSubmit}
                                className="flex border-t-4 shrink-0"
                                style={{
                                    borderColor: isDarkMode ? 'white' : 'black',
                                    backgroundColor: isDarkMode ? 'black' : '#f3f4f6',
                                }}
                            >
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask me anything..."
                                    className="flex-1 px-3 py-2.5 font-mono font-bold text-[18px] outline-none bg-transparent text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 min-w-0"
                                    maxLength={500}
                                    disabled={isTyping}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isTyping}
                                    className="px-4 py-2.5 font-bold text-white transition-all duration-150 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Toggle Button */}
                <button
                    onClick={toggleChat}
                    className={`fixed bottom-3 sm:bottom-6 right-3 sm:right-6 z-[801] w-14 h-14 border-4 flex items-center justify-center transition-all duration-300 cursor-pointer group ${isOpen
                        ? 'rotate-0 scale-95'
                        : 'hover:scale-110 hover:-translate-y-1 chatbot-glow-pulse'
                        }`}
                    style={{
                        borderColor: isDarkMode ? 'white' : 'black',
                        backgroundColor: isOpen
                            ? (isDarkMode ? '#1e293b' : '#f1f5f9')
                            : primaryColor,
                        boxShadow: isOpen
                            ? `4px 4px 0px 0px ${isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,1)'}`
                            : undefined,
                        '--chatbot-glow-color': primaryColor,
                    } as React.CSSProperties}
                    aria-label={isOpen ? 'Close chatbot' : 'Open AI chatbot'}
                >
                    {isOpen ? (
                        <ChevronDown size={24} className={isDarkMode ? 'text-white' : 'text-black'} />
                    ) : (
                        <div className="flex items-center justify-center">
                            <PixelCatMascot size={32} variant="wink" animate={false} />
                        </div>
                    )}

                    {/* Unread badge */}
                    {hasUnread && !isOpen && (
                        <span
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 chatbot-badge-bounce flex items-center justify-center"
                            style={{
                                backgroundColor: '#ff5555',
                                borderColor: isDarkMode ? 'white' : 'black',
                            }}
                        >
                            <span className="text-white text-[8px] font-black">!</span>
                        </span>
                    )}
                </button>
            </div>
        </motion.div>
    );
}

export default memo(AIChatbot);
