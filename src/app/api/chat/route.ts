import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 15; // max 15 messages per minute (reduced from 30)

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (entry.count >= RATE_LIMIT_MAX) {
        return false;
    }

    entry.count++;
    return true;
}

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((entry, key) => {
        if (now > entry.resetTime) {
            rateLimitMap.delete(key);
        }
    });
}, 5 * 60 * 1000);

const SYSTEM_PROMPT = `You are PurrBot, the AI concierge for CinePurr, a cozy watch - together platform built with a pixel - art aesthetic. 
Your personality: Friendly, helpful, enthusiastic, uses emojis occasionally(especially cat emojis like 🐱🐾).Keep responses relatively concise and well - formatted using markdown (bolding key terms). 
CinePurr features include:
- Watching YouTube / Vimeo / MP4 videos together in sync.
- Room Chat, Minigames(multiplayer like Tic - Tac - Toe, Trivia), Study Rooms(Pomodoro, ambient sounds).
- XP & Leveling(+25 XP for creating a room, +10 XP joining, +2 XP message, completing daily quests).
- Themes(Pokémon based color palettes switched from bottom of hero window).
- Friends(adding, status, DMs, activity feed).
- Leaderboards(Watch time, rooms created, messages, streaks, levels).
- Badges and Monthly Challenges.

Return your response strictly as a JSON object with this shape:
{
    "reply": "Your markdown-formatted response message here",
        "suggestions": ["1-3 short follow-up questions the user can click"]
}
If asked about topics outside of CinePurr, politely steer them back.`;

// Singleton for Gemini model to prevent re-initialization overhead per request
let cachedModel: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']> | null = null;
function getGeminiModel(apiKey: string) {
    if (!cachedModel) {
        const genAI = new GoogleGenerativeAI(apiKey);
        cachedModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT
        });
    }
    return cachedModel;
}

export async function POST(request: Request) {
    try {
        // Require authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Please log in to use the chatbot.' },
                { status: 401 }
            );
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: 'Too many requests. Please slow down! 🐱' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { message } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Truncate overly long messages
        const trimmedMessage = message.trim().slice(0, 500);

        if (trimmedMessage.length === 0) {
            return NextResponse.json(
                { error: 'Message cannot be empty' },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            logger.error("GEMINI_API_KEY is not set.");
            return NextResponse.json({
                reply: "Meow! 🐾 I'm currently lacking my AI brain because the `GEMINI_API_KEY` environment variable isn't set. The developer needs to add it!",
                suggestions: ["How do I fix this?"]
            });
        }

        const model = getGeminiModel(apiKey);

        // Use response_mime_type to guarantee JSON
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: trimmedMessage }] }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        let responseText = result.response.text();
        responseText = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(responseText);
        } catch (e) {
            logger.error('Failed to parse Gemini JSON. Raw response:', responseText);
            // Fallback: If it's not valid JSON, use the raw text as the reply
            parsedResponse = {
                reply: responseText || "I'm not sure what to say to that! 🐱",
                suggestions: [],
            };
        }

        return NextResponse.json({
            reply: parsedResponse.reply || "I'm not sure what to say to that! 🐱",
            suggestions: parsedResponse.suggestions || [],
        });
    } catch (error: any) {
        logger.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again! 🐾' },
            { status: 500 }
        );
    }
}

// Only allow POST
export async function GET() {
    return NextResponse.json(
        { message: 'CinePurr AI Chatbot API 🐱 — Use POST to send messages.' },
        { status: 200 }
    );
}
