import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number((session.user as any).id);

  try {
    // 사용자가 참여자인 모든 미팅의 최신 메시지를 가져옴
    const meetings = await db.meeting.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
          { picId: userId }
        ]
      },
      select: {
        id: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, senderId: true }
        }
      }
    });

    // 클라이언트에서 localStorage(lastRead_${id})와 비교할 수 있도록
    // 상대방이 보낸 메시지가 있는 미팅 정보를 반환
    const result = meetings
      .filter(m => m.messages.length > 0 && m.messages[0].senderId !== userId)
      .map(m => ({
        meetingId: m.id,
        lastMessageAt: m.messages[0].createdAt.getTime(), // Unix ms timestamp
        lastSenderId: m.messages[0].senderId
      }));

    return NextResponse.json({ meetings: result });
  } catch (e) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
