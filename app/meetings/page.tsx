import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { MapPin } from "lucide-react";

export default async function MeetingsPage() {
  const meetings = await db.meeting.findMany({
    include: { buyer: true, seller: true, timeSlot: true },
    orderBy: { createdAt: "desc" },
  });

  async function updateStatus(formData: FormData) {
    "use server";
    const meetingId = Number(formData.get("meetingId"));
    const status = formData.get("status") as string;

    await db.meeting.update({
      where: { id: meetingId },
      data: { 
        status: status,
        // 수락 시 슬롯 상태도 변경하는 로직을 추가하면 좋습니다.
      },
    });

    if (status === "ACCEPTED") {
      const m = await db.meeting.findUnique({ where: { id: meetingId } });
      if (m && m.timeSlotId) {
        await db.timeSlot.update({
          where: { id: m.timeSlotId },
          data: { status: "MATCHED" }
        });
      }
    }

    revalidatePath("/meetings");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900 font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black mb-8 text-slate-800 tracking-tight">BizConnect 미팅 현황</h1>

        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className={`w-24 text-center py-1.5 rounded-full text-xs font-black uppercase ${
                  meeting.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                  meeting.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {meeting.status}
                </div>
                
                <div>
                  <div className="font-bold text-lg">
                    {meeting.buyer.companyName} <span className="text-slate-300 mx-2">→</span> {meeting.seller.companyName}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                    <span className="font-bold text-indigo-600">
                      {meeting.timeSlot ? new Date(meeting.timeSlot.startTime).toLocaleString() : "시간 미정 (Direct Request)"}
                    </span>
                    {meeting.status === "ACCEPTED" && (
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-indigo-700 font-bold">
                        <MapPin size={14} /> 장소: {meeting.location || "확정 중"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

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
        </div>
      </div>
    </div>
  );
}