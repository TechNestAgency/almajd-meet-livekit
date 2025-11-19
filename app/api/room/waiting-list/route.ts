import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

// POST - Submit student admission request
export async function POST(request: NextRequest) {
  try {
    const { name, roomLink } = await request.json();

    if (!name || !roomLink) {
      return NextResponse.json(
        { error: 'Name and room link are required' },
        { status: 400 }
      );
    }

    // Find room by guest link
    const room = await prisma.room.findFirst({
      where: {
        guestLink: roomLink
      }
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    if (!room.isActive) {
      return NextResponse.json(
        { error: 'Room is not active' },
        { status: 400 }
      );
    }

    // ALL rooms now require host approval for guests
    // No need to check hostApproval flag - it's always required

    // Check if there's already a pending request with the same name for this room
    const existingRequest = await prisma.pendingParticipant.findFirst({
      where: {
        roomId: room.id,
        name: name.trim(),
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return NextResponse.json(
        { 
          error: 'You already have a pending request',
          requestId: existingRequest.id,
          status: existingRequest.status
        },
        { status: 409 }
      );
    }

    // Create pending participant request
    const pendingRequest = await prisma.pendingParticipant.create({
      data: {
        name: name.trim(),
        roomId: room.id,
        status: 'PENDING'
      }
    });

    return NextResponse.json({
      id: pendingRequest.id,
      name: pendingRequest.name,
      status: pendingRequest.status,
      roomId: pendingRequest.roomId,
      createdAt: pendingRequest.createdAt
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to submit waiting list request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get pending requests for a room (host only, requires password verification)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomLink = searchParams.get('roomLink');
    const password = searchParams.get('password');

    if (!roomLink) {
      return NextResponse.json(
        { error: 'Room link is required' },
        { status: 400 }
      );
    }

    // Find room by host link
    const room = await prisma.room.findFirst({
      where: {
        hostLink: roomLink
      }
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Verify password if room has password protection
    if (room.hostPassword) {
      if (!password) {
        return NextResponse.json(
          { error: 'Password required' },
          { status: 401 }
        );
      }

      const { verifyPassword } = await import('@/lib/auth');
      const isValidPassword = await verifyPassword(password, room.hostPassword);
      
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        );
      }
    }

    // Get all pending requests for this room
    const pendingRequests = await prisma.pendingParticipant.findMany({
      where: {
        roomId: room.id,
        status: 'PENDING'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json({
      requests: pendingRequests.map(req => ({
        id: req.id,
        name: req.name,
        status: req.status,
        createdAt: req.createdAt
      }))
    });

  } catch (error) {
    console.error('Failed to get pending requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

