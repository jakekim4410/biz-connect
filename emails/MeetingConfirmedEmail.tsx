import { Html, Body, Head, Heading, Hr, Container, Preview, Section, Text, Button } from "@react-email/components";

interface MeetingConfirmedEmailProps {
  recipientName: string;
  partnerName: string;
  meetingDate: string; // 화면 표시용 (예: 2026년 11월 26일 21:00)
  location: string;    // 미팅 장소
  role: "BUYER" | "SELLER";
  // 구글 캘린더 링크 생성을 위한 데이터 (ISO 문자열 형태, DB에 한국시간이 Z로 저장됨)
  startTimeIso: string; 
  endTimeIso: string;
  locale?: string;
}

export default function MeetingConfirmedEmail({
  recipientName,
  partnerName,
  meetingDate,
  location,
  role,
  startTimeIso,
  endTimeIso,
  locale = "ko",
}: MeetingConfirmedEmailProps) {
  const isEn = locale === "en";
  const isBuyer = role === "BUYER";

  // 구글 캘린더 링크 생성 로직
  // ⭐ 핵심: BizConnect DB는 모든 슬롯의 시/분을 '한국 표준시(KST, UTC+9)' 기준으로 저장하고 있습니다.
  // Google Calendar의 TEMPLATE action 규격(YYYYMMDDTHHmmssZ)에 맞추기 위해,
  // 저장된 KST 시각에서 9시간(9 * 60 * 60 * 1000 ms)을 차감하여 진정한 UTC 시각으로 변환해야 합니다.
  // 이렇게 해야 한국 사용자는 21:00 KST에, 해외 사용자는 각자의 거주지 타임존에서 정확히 21:00 KST에 해당하는 로컬 시각에 등록됩니다.
  const formatForGoogleCal = (isoString: string) => {
    try {
      if (!isoString) return "";
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      const trueUtcMs = d.getTime() - 9 * 60 * 60 * 1000;
      return new Date(trueUtcMs).toISOString().replace(/-|:|\.\d\d\d/g, "");
    } catch {
      return "";
    }
  };
  
  const calStart = formatForGoogleCal(startTimeIso);
  const calEnd = formatForGoogleCal(endTimeIso);

  const eventTitle = encodeURIComponent(
    isEn 
      ? `[BizConnect] Meeting with ${partnerName}` 
      : `[BizConnect] ${partnerName} 미팅`
  );
  
  const eventDetails = encodeURIComponent(
    isEn
      ? `[BizConnect Business Meeting]\n• Partner: ${partnerName}\n• Location / Link: ${location || "TBA"}\n• Standard Time: Korea Standard Time (KST / UTC+9)\n• Portal: https://biz-connect-two.vercel.app/login`
      : `[BizConnect 비즈니스 미팅]\n• 미팅 상대: ${partnerName}\n• 장소/링크: ${location || "미지정"}\n• 기준 시간: 한국 표준시 (KST / UTC+9)\n• 플랫폼: https://biz-connect-two.vercel.app/login`
  );
  
  const eventLocation = encodeURIComponent(location || "");

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${calStart}/${calEnd}&ctz=Asia/Seoul&details=${eventDetails}&location=${eventLocation}`;

  // 표시용 일시 포맷 (KST 기준 명시)
  const formattedDate = (() => {
    try {
      if (!startTimeIso) return meetingDate;
      const d = new Date(startTimeIso);
      if (isNaN(d.getTime())) return meetingDate;
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      const day = d.getUTCDate();
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const minutes = String(d.getUTCMinutes()).padStart(2, '0');

      if (isEn) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${monthNames[month]} ${day}, ${year} ${hours}:${minutes} (Korea Standard Time, KST / UTC+9)`;
      } else {
        return `${year}년 ${month + 1}월 ${day}일 ${hours}:${minutes} (한국 표준시 / KST)`;
      }
    } catch {
      return meetingDate;
    }
  })();

  const loginUrl = "https://biz-connect-two.vercel.app/login"; 

  return (
    <Html>
      <Head />
      <Preview>{isEn ? `🎉 Meeting Confirmed with ${partnerName}` : `🎉 [BizConnect] ${partnerName}님과의 미팅 일정이 확정되었습니다!`}</Preview>
      <Body style={{ backgroundColor: "#f4f7fa", fontFamily: "sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "0 auto", padding: "30px", borderRadius: "16px", marginTop: "40px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Heading style={{ color: "#2563eb", fontSize: "24px", textAlign: "center", marginBottom: "30px" }}>
            {isEn ? "BizConnect Meeting Confirmation" : "BizConnect 미팅 확정 안내"}
          </Heading>
          <Text style={{ fontSize: "16px", color: "#333" }}>
            {isEn ? (
              <>Hello, <strong>{recipientName}</strong>.</>
            ) : (
              <>안녕하세요, <strong>{recipientName}</strong>님.</>
            )}
          </Text>
          <Text style={{ fontSize: "16px", color: "#333" }}>
            {isEn
              ? "Your requested meeting has been successfully confirmed. Please review the schedule and details below."
              : "요청하신 미팅이 성공적으로 확정되었습니다. 아래 일정을 확인해 주세요."
            }
          </Text>
          
          <Section style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "12px", margin: "24px 0", border: "1px solid #e2e8f0" }}>
            <Text style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1e293b" }}>
              <strong>📅 {isEn ? "Date & Time:" : "일시:"}</strong> {formattedDate}
            </Text>
            <Text style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1e293b" }}>
              <strong>📍 {isEn ? "Location / Link:" : "장소:"}</strong> {location || (isEn ? "TBA (Check on platform)" : "미지정 (플랫폼에서 확인 요망)")}
            </Text>
            <Text style={{ margin: "0", fontSize: "15px", color: "#1e293b" }}>
              <strong>🤝 {isEn ? "Partner:" : "상대방:"}</strong> {partnerName} {isEn ? (isBuyer ? "(Seller / Startup)" : "(Buyer / Investor)") : (isBuyer ? "(셀러/스타트업)" : "(바이어/투자사)")}
            </Text>
          </Section>

          {/* 버튼 영역 */}
          <Section style={{ textAlign: "center", marginTop: "32px", marginBottom: "32px" }}>
            <Button
              href={googleCalendarUrl}
              style={{ backgroundColor: "#4285F4", color: "#fff", padding: "12px 20px", borderRadius: "8px", fontWeight: "bold", textDecoration: "none", display: "inline-block", marginRight: "10px" }}
            >
              {isEn ? "📅 Add to Google Calendar" : "📅 구글 캘린더에 추가"}
            </Button>
            <Button
              href={loginUrl}
              style={{ backgroundColor: "#1e293b", color: "#fff", padding: "12px 20px", borderRadius: "8px", fontWeight: "bold", textDecoration: "none", display: "inline-block" }}
            >
              {isEn ? "💻 View on Platform" : "💻 플랫폼에서 확인하기"}
            </Button>
          </Section>

          <Text style={{ fontSize: "14px", color: "#64748b", marginTop: "20px", textAlign: "center", lineHeight: "1.5" }}>
            {isEn
              ? <>Please attend the meeting on time.<br />For further details or updates, please check the platform messages.</>
              : <>미팅 시간에 늦지 않게 참석 부탁드립니다.<br />기타 문의사항은 플랫폼 내 메시지를 이용해 주세요.</>
            }
          </Text>
          <Hr style={{ borderColor: "#e2e8f0", margin: "30px 0 20px 0" }} />
          <Text style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>
            © 2026 BizConnect. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
