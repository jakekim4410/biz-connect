import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SELLER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const userId = Number((session.user as any).id);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "파일이 첨부되지 않았습니다." }, { status: 400 });
    }

    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type.includes("pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "PDF 파일만 업로드 가능합니다." }, { status: 400 });
    }

    const lastDotIndex = file.name.lastIndexOf(".");
    const baseName = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;
    const safeName = baseName
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/\s/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "");

    const filename = `${userId}_${Date.now()}_${safeName || "pitchdeck"}.pdf`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("pitchdecks")
      .upload(filename, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("pitchdecks")
      .getPublicUrl(filename);

    return NextResponse.json({ success: true, publicUrl });
  } catch (err: any) {
    console.error("Upload route exception:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

