// app/meetings/page.tsx
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export default async function MeetingsPage() {
  const meetings = await db.meeting.findMany({
    include: { buyer: true, seller: true },
    orderBy: { createdAt: "desc" },
  });

  // 미팅 상태 업데이트 함수
  async function updateStatus(formData: FormData) {
    "use server";
    const meetingId = Number(formData.get("meetingId"));
    const status = formData.get("status") as string;

    await db.meeting.update({
      where: { id: meetingId },
      data: { status: status },
    });

    revalidatePath("/meetings");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900 font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black mb-8 text-slate-800 tracking-tight">
          Biz<span className="text-blue-600">Connect</span> 미팅 매칭 현황
        </h1>

        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* 상태별 색상 표시 */}
                <div className={`w-24 text-center py-1.5 rounded-full text-xs font-black uppercase ${
                  meeting.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                  meeting.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {meeting.status}
                </div>
                
                <div>
                  <div className="text-sm text-slate-400 mb-1">매칭 요청 건</div>
                  <div className="font-bold text-lg">
                    {meeting.buyer.companyName} <span className="text-slate-300 mx-2">→</span> {meeting.seller.companyName}
                  </div>
                </div>
              </div>

              {/* 수락/거절 버튼 (PENDING 상태일 때만 표시) */}
              {meeting.status === "PENDING" && (
                <div className="flex gap-2">
                  <form action={updateStatus}>
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <input type="hidden" name="status" value="ACCEPTED" />
                    <button className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-600 transition">수락</button>
                  </form>
                  <form action={updateStatus}>
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <input type="hidden" name="status" value="REJECTED" />
                    <button className="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-300 transition">거절</button>
                  </form>
                </div>
              )}
            </div>
          ))}
          
          {meetings.length === 0 && (
            <div className="text-center py-20 text-slate-400 font-medium">아직 신청된 미팅이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}