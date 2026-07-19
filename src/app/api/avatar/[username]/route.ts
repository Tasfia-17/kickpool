
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Force dynamic rendering - this route uses database queries
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const resolvedParams = await params;
  const username = decodeURIComponent(resolvedParams.username);

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { image: true }
    });

    if (!user || !user.image) {
      // Generate a cute avatar using dicebear.com API (fun-emoji style - cute and friendly!)
      // This creates a visible avatar based on the username
      const dicebearUrl = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(username)}&size=200`;

      // Fetch the SVG from dicebear
      try {
        const response = await fetch(dicebearUrl);
        if (response.ok) {
          const svg = await response.text();
          return new NextResponse(svg, {
            headers: {
              'Content-Type': 'image/svg+xml',
              'Cache-Control': 'public, max-age=86400' // Cache for 1 day
            }
          });
        }
      } catch (error) {
        logger.error('Failed to fetch dicebear avatar:', error);
      }

      // Fallback: simple colored SVG with first letter
      const firstLetter = username[0]?.toUpperCase() || '?';
      const colors = ['#ff69b4', '#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
      const color = colors[username.charCodeAt(0) % colors.length];
      const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="${color}"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${firstLetter}</text>
      </svg>`;

      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    const imageData = user.image;

    // Check if it's a data URI
    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        logger.error('Invalid image data format for user:', username);
        return new NextResponse('Invalid image data', { status: 500 });
      }

      const type = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': type,
          'Cache-Control': 'public, max-age=60, must-revalidate' // Short cache so updates show up
        }
      });
    } else if (imageData.startsWith('http')) {
      // Validate URL to prevent open redirect
      try {
        const url = new URL(imageData);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return new NextResponse('Invalid URL protocol', { status: 400 });
        }
        return NextResponse.redirect(url.toString());
      } catch {
        return new NextResponse('Invalid image URL', { status: 400 });
      }
    } else {
      logger.error('Unknown image format for user:', username, 'format:', imageData.substring(0, 20));
      return new NextResponse('Unknown image format', { status: 500 });
    }

  } catch (error) {
    logger.error('Avatar fetch error for user:', username, error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
