import { db } from "../../lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";

export default async function SellerPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "SELLER") redirect("/login");
  const sellerId = Number((session.user as any).id);

  const confirmedMeetings = await db.meeting.findMany({
    where: { sellerId, status: "ACCEPTED" },
    include: { timeSlot: true, buyer: true },
    orderBy: { timeSlot: { startTime: 'asc' } }
  });

  const availableSlots = await db.timeSlot.findMany({
    where: { status: "OPEN", NOT: { meetings: { some: { sellerId } } } },
    include: { buyer: true }
  });

  async function applyMeeting(formData: FormData) {
    "use server";
    const slotId = Number(formData.get("slotId"));
    const buyerId = Number(formData.get("buyerId"));
    const proposal = formData.get("proposal") as string;
    await db.meeting.create({ data: { timeSlotId: slotId, buyerId, sellerId, proposal, status: "PENDING" } });
    revalidatePath("/seller");
  }

  return (
    <div className="p-8 max-w-7xl mx-auto text-slate-900 font-sans space-y-12">
      <section className="space-y-6">
        <h2 className="text-2xl font-black flex items-center gap-2"><span className="w-2 h-6 bg-emerald-500 rounded-full"></span>Confirmed Calendar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {confirmedMeetings.map(m => (
            <div key={m.id} className="bg-white p-8 rounded-[40px] border-2 border-emerald-500 shadow-xl relative overflow-hidden">
              <div className="mb-6">
                <h3 className="text-2xl font-black text-slate-800">{new Date(m.timeSlot.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</h3>
                <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">{new Date(m.timeSlot.startTime).toLocaleDateString()}</p>
              </div>
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded border mr-2 uppercase">{m.buyer.userType}</span>
                  <h4 className="text-lg font-black text-slate-800">{m.buyer.companyName}</h4>
                  <p className="text-sm font-bold text-slate-500 mt-1">{m.buyer.name} {m.buyer.jobTitle}</p>
                  <p className="text-sm font-black text-blue-600 mt-2">📞 {m.buyer.phone}</p>
                  <p className="text-xs text-slate-400 mt-1">✉️ {m.buyer.email}</p>
                </div>
              </div>
            </div>
          ))}
          {confirmedMeetings.length === 0 && <div className="col-span-full p-16 text-center bg-slate-50 border-2 border-dashed rounded-[40px] text-slate-300 font-bold">확정된 미팅이 없습니다.</div>}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="space-y-6 lg:col-span-1">
          <h2 className="text-xl font-bold flex items-center gap-2">신청 가능 목록</h2>
          {availableSlots.map(slot => (
            <div key={slot.id} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
              <div>
                <span className="text-[10px] font-black text-blue-500 uppercase">{slot.buyer.userType}</span>
                <h3 className="text-lg font-black">{slot.buyer.companyName}</h3>
                <p className="text-xs text-slate-400 mt-1 italic line-clamp-2">"찾는 파트너: {slot.buyer.preferredPartners || "전분야"}"</p>
                {slot.description && <div className="mt-3 p-3 bg-amber-50 text-amber-700 text-[11px] rounded-xl border border-amber-100 font-bold">📢 미팅참고: {slot.description}</div>}
              </div>
              <div className="text-center font-black text-slate-700 bg-slate-50 py-2 rounded-xl text-sm">{new Date(slot.startTime).toLocaleString()}</div>
              <form action={applyMeeting} className="space-y-3">
                <input type="hidden" name="slotId" value={slot.id}/><input type="hidden" name="buyerId" value={slot.buyerId}/>
                <textarea name="proposal" required placeholder="미팅 제안 메시지 (자사 핵심 역량 등)" className="w-full p-3 text-xs bg-slate-50 border border-slate-100 rounded-xl resize-none h-24" />
                <button className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black text-sm hover:bg-slate-800">신청하기</button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}