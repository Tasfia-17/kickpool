import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// This endpoint returns the raw NextAuth JWT so the socket client
// can pass it in the handshake `auth.token` field.
// The httpOnly cookie is unreadable from the browser, so we relay it here.
export async function GET(request: Request) {
  try {
    const token = await getToken({
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET,
      raw: true, // Return the raw encoded JWT string (not decoded)
    });

    if (!token) {
      return NextResponse.json({ token: null }, { status: 200 });
    }

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ token: null }, { status: 200 });
  }
}
