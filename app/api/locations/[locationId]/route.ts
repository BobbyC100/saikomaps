/**
 * API Route: Update Location
 * PATCH /api/locations/[locationId]
 * Update location details (name, address, phone, website, description)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { locationId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the location and its list to check ownership
    const location = await db.location.findUnique({
      where: { id: locationId },
      include: {
        list: true,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if user owns the map
    if (location.list.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this location' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, address, phone, website, description, userNote, descriptor, orderIndex } = body;

    const updated = await db.location.update({
      where: { id: locationId },
      data: {
        ...(name !== undefined && { name: name?.trim() || location.name }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(website !== undefined && { website: website?.trim() || null }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(userNote !== undefined && { userNote: userNote?.trim() || null }),
        ...(descriptor !== undefined && {
          descriptor: descriptor?.trim()?.slice(0, 120) || null,
        }),
        ...(typeof orderIndex === 'number' && { orderIndex }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      {
        error: 'Failed to update location',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { locationId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the location and its list to check ownership
    const location = await db.location.findUnique({
      where: { id: locationId },
      include: {
        list: true,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if user owns the map
    if (location.list.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this location' },
        { status: 403 }
      );
    }

    // Delete the location
    await db.location.delete({
      where: { id: locationId },
    });

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete location',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
