import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyPassword } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomLink: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const guestName = searchParams.get('guestName');
    const password = searchParams.get('password');

    if (!type || (type !== 'host' && type !== 'guest')) {
      return NextResponse.json(
        { message: 'Invalid access type' },
        { status: 400 }
      );
    }

    // Await params for Next.js 15 compatibility
    const { roomLink } = await params;

    // Find room by host or guest link
    const room = await prisma.room.findFirst({
      where: {
        OR: [
          { hostLink: roomLink },
          { guestLink: roomLink }
        ]
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        hostApproval: true,
        canRecord: true,
        hostPassword: true
      }
    });

    if (!room) {
      return NextResponse.json(
        { exists: false, message: 'Room not found' },
        { status: 404 }
      );
    }

    // For host access, check password if required
    if (type === 'host' && room.hostPassword) {
      if (!password) {
        return NextResponse.json({
          exists: true,
          requiresPassword: true,
          room: {
            id: room.id,
            name: room.name,
            isActive: room.isActive,
            hostApproval: room.hostApproval,
            canRecord: room.canRecord
          }
        });
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, room.hostPassword);
      if (!isValidPassword) {
        return NextResponse.json({
          exists: true,
          requiresPassword: true,
          passwordValid: false,
          message: 'Invalid password',
          room: {
            id: room.id,
            name: room.name,
            isActive: room.isActive,
            hostApproval: room.hostApproval,
            canRecord: room.canRecord
          }
        }, { status: 401 });
      }

      // Password is valid
      return NextResponse.json({
        exists: true,
        requiresPassword: true,
        passwordValid: true,
        room: {
          id: room.id,
          name: room.name,
          isActive: room.isActive,
          hostApproval: room.hostApproval,
          canRecord: room.canRecord
        }
      });
    }

    // Regular room validation (guest or host without password)
    return NextResponse.json({
      exists: true,
      requiresPassword: false,
      room: {
        id: room.id,
        name: room.name,
        isActive: room.isActive,
        hostApproval: room.hostApproval,
        canRecord: room.canRecord
      }
    });

  } catch (error) {
    console.error('Error validating room:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
