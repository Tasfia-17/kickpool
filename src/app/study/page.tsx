import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { getStudyDashboard } from '@/lib/studyData';
import StudyClient from './StudyClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Study Room | CinePurr',
  description:
    'Step into a cozy lo-fi study habitat with one active task, ambient focus controls, and a persistent journal.',
};

export default async function StudyPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect('/login');
  }

  const dashboard = await getStudyDashboard(userId);
  const userName = session?.user?.name?.trim() || 'Trainer';

  return <StudyClient initialDashboard={dashboard} userName={userName} />;
}
