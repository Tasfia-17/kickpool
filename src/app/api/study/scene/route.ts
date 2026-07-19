import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { clampVolume, getAmbientPreset, getStudyScene } from '@/lib/study';
import { getStudyDashboard, ensureStudySpace } from '@/lib/studyData';
import {
  getStudySessionUserId,
  sanitizeStudyMultiline,
  sanitizeStudyText,
  unauthorizedStudyResponse,
} from '@/lib/studyRouteUtils';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getStudySessionUserId();
    if (!userId) {
      return unauthorizedStudyResponse();
    }

    const dashboard = await getStudyDashboard(userId);
    return NextResponse.json({ scene: dashboard.scene });
  } catch (error) {
    logger.error('Error fetching study scene:', error);
    return NextResponse.json({ error: 'Failed to fetch study scene' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getStudySessionUserId();
    if (!userId) {
      return unauthorizedStudyResponse();
    }

    const body = await request.json();
    const existing = await ensureStudySpace(userId);
    const nextSceneId = sanitizeStudyText(body?.sceneId, 48) || existing.sceneId;
    const scenePreset = getStudyScene(nextSceneId);
    const explicitAmbiencePresetId = sanitizeStudyText(body?.ambiencePresetId, 48);
    const sceneChanged = nextSceneId !== existing.sceneId;
    const requestedAmbiencePresetId =
      explicitAmbiencePresetId ||
      (sceneChanged ? scenePreset.ambiencePresetId : existing.ambiencePresetId);
    const ambiencePreset = getAmbientPreset(requestedAmbiencePresetId);

    const nextParkingLot = Array.isArray(body?.parkingLot)
      ? body.parkingLot
          .map((entry: unknown) => sanitizeStudyText(entry, 180))
          .filter(Boolean)
          .slice(0, 16)
      : existing.parkingLot;

    await prisma.studySpace.update({
      where: { userId },
      data: {
        sceneId: nextSceneId,
        weather: sanitizeStudyText(body?.weather, 32) || scenePreset.weather,
        timeOfDay: sanitizeStudyText(body?.timeOfDay, 32) || scenePreset.timeOfDay,
        lampMode: sanitizeStudyText(body?.lampMode, 32) || existing.lampMode,
        ambiencePresetId: requestedAmbiencePresetId,
        musicMode: sanitizeStudyText(body?.musicMode, 32) || existing.musicMode,
        lofiStationId:
          typeof body?.lofiStationId === 'string'
            ? sanitizeStudyText(body.lofiStationId, 64) || null
            : existing.lofiStationId,
        focusTone: sanitizeStudyText(body?.focusTone, 32) || existing.focusTone,
        quietMode:
          typeof body?.quietMode === 'boolean' ? body.quietMode : existing.quietMode,
        scratchpad:
          typeof body?.scratchpad === 'string'
            ? sanitizeStudyMultiline(body.scratchpad, 4000) || null
            : existing.scratchpad,
        parkingLot: nextParkingLot,
        rainVolume:
          typeof body?.rainVolume === 'number'
            ? clampVolume(body.rainVolume)
            : sceneChanged || explicitAmbiencePresetId
              ? ambiencePreset.defaultMix.rainVolume
              : existing.rainVolume,
        windVolume:
          typeof body?.windVolume === 'number'
            ? clampVolume(body.windVolume)
            : sceneChanged || explicitAmbiencePresetId
              ? ambiencePreset.defaultMix.windVolume
              : existing.windVolume,
        thunderVolume:
          typeof body?.thunderVolume === 'number'
            ? clampVolume(body.thunderVolume)
            : sceneChanged || explicitAmbiencePresetId
              ? ambiencePreset.defaultMix.thunderVolume
              : existing.thunderVolume,
        birdsVolume:
          typeof body?.birdsVolume === 'number'
            ? clampVolume(body.birdsVolume)
            : sceneChanged || explicitAmbiencePresetId
              ? ambiencePreset.defaultMix.birdsVolume
              : existing.birdsVolume,
        focusToneVolume:
          typeof body?.focusToneVolume === 'number'
            ? clampVolume(body.focusToneVolume)
            : sceneChanged || explicitAmbiencePresetId
              ? ambiencePreset.defaultMix.focusToneVolume
              : existing.focusToneVolume,
      },
    });

    const dashboard = await getStudyDashboard(userId);
    return NextResponse.json(dashboard);
  } catch (error) {
    logger.error('Error updating study scene:', error);
    return NextResponse.json({ error: 'Failed to update study scene' }, { status: 500 });
  }
}
