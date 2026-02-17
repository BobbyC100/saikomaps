/**
 * API Route: Update / Delete MapPlace
 * PATCH /api/map-places/[mapPlaceId] - Update descriptor, userNote, orderIndex
 * DELETE /api/map-places/[mapPlaceId] - Remove place from map (does NOT delete Place)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, requireOwnership } from '@/lib/auth/guards';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ mapPlaceId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { mapPlaceId } = await params;

    // Get the map place and its map to check ownership
    const mapPlace = await db.map_places.findUnique({
      where: { id: mapPlaceId },
      include: { lists: true },
    });

    if (!mapPlace) {
      return NextResponse.json(
        { error: 'Map place not found' },
        { status: 404 }
      );
    }

    // Check if user owns the map
    await requireOwnership(mapPlace.lists.userId);

    const body = await request.json();
    const { descriptor, userNote, orderIndex, neighborhood, priceLevel, cuisineType } = body;

    if (neighborhood !== undefined || priceLevel !== undefined || cuisineType !== undefined) {
      await db.places.update({
        where: { id: mapPlace.placeId },
        data: {
          ...(neighborhood !== undefined && {
            neighborhood: neighborhood?.trim() || null,
          }),
          ...(priceLevel !== undefined && {
            priceLevel: priceLevel === null || priceLevel === '' ? null : Math.min(4, Math.max(0, Number(priceLevel))),
          }),
          ...(cuisineType !== undefined && {
            cuisineType: cuisineType?.trim() || null,
          }),
        },
      });
    }

    const updated = await db.map_places.update({
      where: { id: mapPlaceId },
      data: {
        ...(descriptor !== undefined && {
          descriptor: descriptor?.trim()?.slice(0, 120) || null,
        }),
        ...(userNote !== undefined && { userNote: userNote?.trim() || null }),
        ...(typeof orderIndex === 'number' && { orderIndex }),
      },
      include: { places: true },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating map place:', error);
    return NextResponse.json(
      {
        error: 'Failed to update place',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mapPlaceId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { mapPlaceId } = await params;

    // Get the map place and its map to check ownership
    const mapPlace = await db.map_places.findUnique({
      where: { id: mapPlaceId },
      include: { lists: true },
    });

    if (!mapPlace) {
      return NextResponse.json(
        { error: 'Map place not found' },
        { status: 404 }
      );
    }

    // Check if user owns the map
    await requireOwnership(mapPlace.lists.userId);

    await db.map_places.delete({
      where: { id: mapPlaceId },
    });

    return NextResponse.json({
      success: true,
      message: 'Place removed from map',
    });
  } catch (error) {
    console.error('Error deleting map place:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete place',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
