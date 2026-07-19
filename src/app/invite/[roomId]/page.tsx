import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { InviteClient } from './InviteClient';

interface Props {
  params: Promise<{ roomId: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomId } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cinepurr.me';
  
  return {
    title: 'Join Watch Party - CinePurr',
    openGraph: {
      images: [`${baseUrl}/api/rooms/${roomId}/invite-image`],
    },
  };
}

export default async function InvitePage({ params }: Props) {
  const { roomId } = await params;

  // Fetch room data server-side
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      name: true,
      currentVideoTitle: true,
      onlineCount: true,
      maxUsers: true,
      host: {
        select: {
          username: true,
          image: true,
        },
      },
    },
  });

  if (!room) {
    notFound();
  }

  return (
    <InviteClient 
      roomId={roomId} 
      room={{
        name: room.name,
        currentVideoTitle: room.currentVideoTitle,
        onlineCount: room.onlineCount,
        maxUsers: room.maxUsers,
        host: room.host,
      }}
    />
  );
}
