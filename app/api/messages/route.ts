import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get('meetingId');

  if (!meetingId) return NextResponse.json([], { status: 400 });

  try {
    const messages = await db.message.findMany({
      where: { meetingId: Number(meetingId) },
      orderBy: { createdAt: 'asc' },
      include: { 
        sender: { 
          select: { id: true, name: true, nameEn: true, companyName: true, role: true } 
        } 
      }
    });
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number((session.user as any).id);
  const body = await req.json();
  const { meetingId, content } = body;

  if (!meetingId || !content) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  try {
    const msg = await db.message.create({
      data: {
        meetingId: Number(meetingId),
        senderId: userId,
        content,
      },
      include: { 
        sender: { 
          select: { id: true, name: true, nameEn: true, companyName: true, role: true } 
        } 
      }
    });
    return NextResponse.json(msg);
  } catch (error) {
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
