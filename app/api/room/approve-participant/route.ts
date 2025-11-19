import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyPassword } from '@/lib/auth';

// POST - Approve or reject student request
export async function POST(request: NextRequest) {
  try {
    const { requestId, roomLink, password, action } = await request.json();

    if (!requestId || !roomLink || !action) {
      return NextResponse.json(
        { error: 'Request ID, room link, and action are required' },
        { status: 400 }
      );
    }

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json(
        { error: 'Action must be APPROVE or REJECT' },
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

      const isValidPassword = await verifyPassword(password, room.hostPassword);
      
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        );
      }
    }

    // Find the pending request
    const pendingRequest = await prisma.pendingParticipant.findUnique({
      where: { id: requestId },
      include: { room: true }
    });

    if (!pendingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    if (pendingRequest.roomId !== room.id) {
      return NextResponse.json(
        { error: 'Request does not belong to this room' },
        { status: 403 }
      );
    }

    if (pendingRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Request has already been processed' },
        { status: 400 }
      );
    }

    // Update the request status
    const updatedRequest = await prisma.pendingParticipant.update({
      where: { id: requestId },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
      }
    });

    return NextResponse.json({
      id: updatedRequest.id,
      name: updatedRequest.name,
      status: updatedRequest.status,
      message: action === 'APPROVE' ? 'Student approved successfully' : 'Student rejected'
    });

  } catch (error) {
    console.error('Failed to approve/reject participant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Check request status (for students)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const pendingRequest = await prisma.pendingParticipant.findUnique({
      where: { id: requestId }
    });

    if (!pendingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: pendingRequest.id,
      name: pendingRequest.name,
      status: pendingRequest.status,
      createdAt: pendingRequest.createdAt,
      updatedAt: pendingRequest.updatedAt
    });

  } catch (error) {
    console.error('Failed to check request status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

