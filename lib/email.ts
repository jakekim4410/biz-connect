"use server";

import { Resend } from "resend";
import MeetingConfirmedEmail from "@/emails/MeetingConfirmedEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendMeetingEmailParams {
  buyerEmail: string;
  buyerName: string;
  sellerEmail: string;
  sellerName: string;
  meetingDate: string;
  // 💡 새로 추가된 속성들
  location: string;
  startTimeIso: string;
  endTimeIso: string;
}

export async function sendMeetingConfirmationEmails(params: SendMeetingEmailParams) {
  try {
    await Promise.all([
      // 1. 바이어에게 보내는 메일
      resend.emails.send({
        from: "BizConnect <info@labelk.co.kr>",
        to: params.buyerEmail, 
        subject: `[BizConnect] ${params.sellerName}님과의 미팅이 확정되었습니다.`,
        react: MeetingConfirmedEmail({
          recipientName: params.buyerName,
          partnerName: params.sellerName,
          meetingDate: params.meetingDate,
          location: params.location,
          startTimeIso: params.startTimeIso,
          endTimeIso: params.endTimeIso,
          role: "BUYER",
        }),
      }),

      // 2. 셀러에게 보내는 메일
      resend.emails.send({
        from: "BizConnect <info@labelk.co.kr>", // <--- 여기에 쉼표(,)를 추가했습니다!
        to: params.sellerEmail, 
        subject: `[BizConnect] ${params.buyerName}님과의 미팅이 확정되었습니다.`,
        react: MeetingConfirmedEmail({
          recipientName: params.sellerName,
          partnerName: params.buyerName,
          meetingDate: params.meetingDate,
          location: params.location,
          startTimeIso: params.startTimeIso,
          endTimeIso: params.endTimeIso,
          role: "SELLER",
        }),
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("이메일 발송 실패:", error);
    return { success: false, error: "이메일 발송 중 오류가 발생했습니다." };
  }
}