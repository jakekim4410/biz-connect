import { Resend } from "resend";
import MeetingConfirmedEmail from "@/emails/MeetingConfirmedEmail";
import RegistrationReceivedEmail from "@/emails/RegistrationReceivedEmail";
import ApprovalCompletedEmail from "@/emails/ApprovalCompletedEmail";
import JoinRequestEmail from "@/emails/JoinRequestEmail";
import JoinRejectedEmail from "@/emails/JoinRejectedEmail";
import DirectRequestEmail from "@/emails/DirectRequestEmail";
import ForgotPasswordEmail from "@/emails/ForgotPasswordEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "BizConnect <info@labelk.co.kr>";

// --- 6. 비밀번호 재설정 안내 ---
export async function sendForgotPasswordEmail(email: string, name: string, resetLink: string, locale: string = "ko") {
  try {
    const isEn = locale === "en";
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: isEn ? "[BizConnect] Password Reset Request" : "[BizConnect] 비밀번호 재설정 안내",
      react: ForgotPasswordEmail({ name, resetLink, locale }),
    });
    return { success: true };
  } catch (error) {
    console.error("Forgot password email error:", error);
    return { success: false };
  }
}

// --- 1. 미팅 확정 안내 (기존) ---
interface SendMeetingEmailParams {
  buyerEmail: string;
  buyerName: string;
  sellerEmail: string;
  sellerName: string;
  meetingDate: string;
  location: string;
  startTimeIso: string;
  endTimeIso: string;
}

export async function sendMeetingConfirmationEmails(params: SendMeetingEmailParams) {
  try {
    await Promise.all([
      resend.emails.send({
        from: FROM_EMAIL,
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
      resend.emails.send({
        from: FROM_EMAIL,
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

// --- 2. 가입 접수 안내 (Welcome) ---
export async function sendRegistrationReceivedEmail(email: string, name: string, role: "BUYER" | "SELLER", locale: string = "ko") {
  try {
    const isEn = locale === "en";
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: isEn ? "[BizConnect] Registration Received" : "[BizConnect] 회원가입 신청이 접수되었습니다.",
      react: RegistrationReceivedEmail({ name, role, locale }),
    });
    return { success: true };
  } catch (error) {
    console.error("Registration email error:", error);
    return { success: false };
  }
}

// --- 3. 승인 완료 안내 ---
export async function sendApprovalCompletedEmail(email: string, name: string, locale: string = "ko") {
  try {
    const isEn = locale === "en";
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: isEn ? "[BizConnect] Account Approved" : "[BizConnect] 서비스 이용 승인 안내",
      react: ApprovalCompletedEmail({ name, locale }),
    });
    return { success: true };
  } catch (error) {
    console.error("Approval email error:", error);
    return { success: false };
  }
}

// --- 4. 팀 합류 요청 안내 (마스터에게 발송) ---
export async function sendJoinRequestEmail(masterEmail: string, masterName: string, memberName: string, memberEmail: string, locale: string = "ko") {
  try {
    const isEn = locale === "en";
    await resend.emails.send({
      from: FROM_EMAIL,
      to: masterEmail,
      subject: isEn ? "[BizConnect] New Team Member Join Request" : "[BizConnect] 새로운 팀원 가입 승인 요청",
      react: JoinRequestEmail({ masterName, memberName, memberEmail, locale }),
    });
    return { success: true };
  } catch (error) {
    console.error("Join request email error:", error);
    return { success: false };
  }
}

// --- 4.1 팀 합류 거절 안내 (멤버에게 발송) ---
export async function sendJoinRejectedEmail(memberEmail: string, memberName: string, masterName: string, organizationName: string, rejectionReason?: string, locale: string = "ko") {
  try {
    const isEn = locale === "en";
    await resend.emails.send({
      from: FROM_EMAIL,
      to: memberEmail,
      subject: isEn ? "[BizConnect] Team Join Request Update" : "[BizConnect] 팀 가입 신청 결과 안내",
      react: JoinRejectedEmail({ masterName, memberName, organizationName, rejectionReason, locale }),
    });
    return { success: true };
  } catch (error) {
    console.error("Join rejected email error:", error);
    return { success: false };
  }
}

// --- 5. 다이렉트 미팅 제안 안내 ---
export async function sendDirectRequestEmail(buyerEmail: string, buyerName: string, sellerName: string, proposalSnippet: string, locale: string = "ko") {
  try {
    const isEn = locale === "en";
    await resend.emails.send({
      from: FROM_EMAIL,
      to: buyerEmail,
      subject: isEn ? "[BizConnect] New Direct Meeting Proposal" : "[BizConnect] 새로운 다이렉트 미팅 제안 도착",
      react: DirectRequestEmail({ buyerName, sellerName, proposalSnippet, locale }),
    });
    return { success: true };
  } catch (error) {
    console.error("Direct request email error:", error);
    return { success: false };
  }
}