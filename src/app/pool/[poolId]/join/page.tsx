/**
 * KickPool — Join pool directly from pool room (/pool/[poolId]/join)
 * Redirects to the invite-code join flow pre-filled with the pool's invite code.
 */
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

interface Props {
  params: Promise<{ poolId: string }>;
}

export default async function PoolJoinRedirectPage({ params }: Props) {
  const { poolId } = await params;

  const pool = await prisma.matchPool.findUnique({
    where: { id: poolId },
    select: { inviteCode: true },
  }).catch(() => null);

  if (!pool) redirect('/');
  redirect(`/pool/join?invite=${pool.inviteCode}`);
}
