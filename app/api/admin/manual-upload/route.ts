import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";

// 청크 저장을 위한 인메모리 버퍼 맵
const chunkBuffers = new Map<string, { chunks: Buffer[]; total: number }>();

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("x-admin-secret");
    if (authHeader !== "bizconnect_admin_upload_key_2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { uploadId, chunkIndex, totalChunks, chunkBase64, filename, userId } = body;

    if (!uploadId || chunkIndex === undefined || !totalChunks || !chunkBase64) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const chunkBuf = Buffer.from(chunkBase64, "base64");

    if (!chunkBuffers.has(uploadId)) {
      chunkBuffers.set(uploadId, {
        chunks: new Array(totalChunks),
        total: totalChunks,
      });
    }

    const item = chunkBuffers.get(uploadId)!;
    item.chunks[chunkIndex] = chunkBuf;

    // 모든 청크가 도착했는지 확인
    const receivedCount = item.chunks.filter(Boolean).length;
    if (receivedCount < item.total) {
      return NextResponse.json({
        success: true,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} received`,
      });
    }

    // 전체 결합
    const fullBuffer = Buffer.concat(item.chunks);
    chunkBuffers.delete(uploadId);

    console.log(`All chunks received for ${filename}. Total size: ${fullBuffer.length} bytes.`);

    // Supabase Storage에 업로드
    const targetFilename = `${userId}_${Date.now()}_${filename.replace(/[^a-zA-Z0-9_\-\.]/g, "_")}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("pitchdecks")
      .upload(targetFilename, fullBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("pitchdecks")
      .getPublicUrl(targetFilename);

    console.log("Uploaded pitch deck public URL:", publicUrl);

    // DB 업데이트
    const targetUserId = Number(userId);
    const existingOnePager = await db.onePager.findUnique({
      where: { userId: targetUserId },
    });

    if (existingOnePager) {
      await db.onePager.update({
        where: { userId: targetUserId },
        data: { pitchDeckUrl: publicUrl },
      });
    } else {
      await db.onePager.create({
        data: {
          userId: targetUserId,
          pitchDeckUrl: publicUrl,
        },
      });
    }

    // 동일 회사 멤버들에게도 피치덱 동기화
    const currentUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { companyName: true },
    });

    if (currentUser?.companyName) {
      const companyMembers = await db.user.findMany({
        where: { companyName: currentUser.companyName },
        select: { id: true },
      });

      for (const m of companyMembers) {
        if (m.id !== targetUserId) {
          await db.onePager.updateMany({
            where: { userId: m.id },
            data: { pitchDeckUrl: publicUrl },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      publicUrl,
      targetFilename,
      userId: targetUserId,
      companyName: currentUser?.companyName,
    });
  } catch (err: any) {
    console.error("Direct upload route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
