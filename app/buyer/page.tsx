import { db } from "../../lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";

export default async function BuyerPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "BUYER") redirect("/login");
  const buyerId = Number((session.user as any).id);

  const mySlots = await db.timeSlot.findMany({
    where: { buyerId },
    include: { meetings: { include: { seller: true } } },
    orderBy: { startTime: 'asc' }
  });

  const confirmedMeetings = await db.meeting.findMany({
    where: { buyerId, status: "ACCEPTED" },
    include: { seller: true, timeSlot: true },
    orderBy: { timeSlot: { startTime: 'asc' } }
  });

  async function createSlot(formData: FormData) {
    "use server";
    const date = formData.get("date") as string;
    const hour = formData.get("hour") as string;
    const minute = formData.get("minute") as string;
    const description = formData.get("description") as string;
    if (!date || !hour || !minute) return;

    const startTime = new Date(`${date}T${hour}:${minute}:00`);
    const endTime = new Date(startTime.getTime() + 30 * 60000);
    await db.timeSlot.create({ data: { startTime, endTime, buyerId, description } });
    revalidatePath("/buyer");
  }

  async function handleStatus(formData: FormData) {
    "use server";
    const meetingId = Number(formData.get("meetingId"));
    const slotId = Number(formData.get("slotId"));
    const action = formData.get("action") as string;

    if (action === "ACCEPT") {
      await db.meeting.update({ where: { id: meetingId }, data: { status: "ACCEPTED" } });
      await db.meeting.updateMany({ where: { timeSlotId: slotId, id: { not: meetingId } }, data: { status: "REJECTED" } });
      await db.timeSlot.update({ where: { id: slotId }, data: { status: "CLOSED" } });
    } else {
      await db.meeting.update({ where: { id: meetingId }, data: { status: "REJECTED" } });
    }
    revalidatePath("/buyer");
  }

  return (
    <div className="p-8 max-w-7xl mx-auto text-slate-900 font-sans grid grid-cols-1 xl:grid-cols-3 gap-10">
      <div className="xl:col-span-2 space-y-8">
        <header className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h1 className="text-2xl font-black mb-6">미팅 슬롯 오픈</h1>
          <form action={createSlot} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input name="date" type="date" required className="p-3 bg-slate-50 border rounded-2xl text-sm font-bold" />
            <select name="hour" className="p-3 bg-slate-50 border rounded-2xl text-sm font-bold">
              {Array.from({length:24}).map((_,i)=> <option key={i} value={String(i).padStart(2,'0')}>{i}시</option>)}
            </select>
            <select name="minute" className="p-3 bg-slate-50 border rounded-2xl text-sm font-bold">
              <option value="00">00분</option><option value="30">30분</option>
            </select>
            <button className="bg-blue-600 text-white rounded-2xl font-black text-sm">슬롯 오픈</button>
            <input name="description" placeholder="미팅 참고사항 (예: 투자 중심 상담)" className="md:col-span-4 p-3 bg-slate-50 border rounded-2xl text-xs mt-2" />
          </form>
        </header>

        <div className="space-y-6">
          {mySlots.map(slot => (
            <div key={slot.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                  <span className="text-lg font-black">{new Date(slot.startTime).toLocaleString()}</span>
                  {slot.description && <span className="text-xs text-blue-500 font-bold">📝 {slot.description}</span>}
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${slot.status==='OPEN'?'bg-emerald-100 text-emerald-600':'bg-slate-100 text-slate-400'}`}>{slot.status}</span>
              </div>
              <div className="space-y-3">
                {slot.meetings.map(m => (
                  <div key={m.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm">{m.seller.companyName} ({m.seller.name})</span>
                      {slot.status === "OPEN" && m.status === "PENDING" && (
                        <div className="flex gap-2">
                          <form action={handleStatus}><input type="hidden" name="meetingId" value={m.id}/><input type="hidden" name="slotId" value={slot.id}/><input type="hidden" name="action" value="ACCEPT"/><button className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black">수락</button></form>
                          <form action={handleStatus}><input type="hidden" name="meetingId" value={m.id}/><input type="hidden" name="action" value="REJECT"/><button className="bg-white text-rose-400 border border-rose-100 px-3 py-1.5 rounded-xl text-[10px] font-black">거절</button></form>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 bg-white p-3 rounded-xl border italic">{m.proposal}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-black flex items-center gap-2">Confirmed List</h2>
        {confirmedMeetings.map(m => (
          <div key={m.id} className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl border border-slate-800">
            <h4 className="text-xl font-black">{m.seller.companyName}</h4>
            <p className="text-blue-400 text-sm font-bold">{m.seller.name} {m.seller.jobTitle}</p>
            <p className="text-slate-400 text-xs mt-1">📞 {m.seller.phone} | ✉️ {m.seller.email}</p>
            <p className="mt-4 text-xs font-bold pt-4 border-t border-slate-800">{new Date(m.timeSlot.startTime).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}