import { Html, Body, Head, Heading, Hr, Container, Preview, Section, Text, Button, Link } from "@react-email/components";

interface MeetingConfirmedEmailProps {
  recipientName: string;
  partnerName: string;
  meetingDate: string; // 화면 표시용 (예: 2024년 5월 20일 14:00)
  location: string;    // 미팅 장소
  role: "BUYER" | "SELLER";
  // 구글 캘린더 링크 생성을 위한 데이터 (ISO 문자열 형태)
  startTimeIso: string; 
  endTimeIso: string;
}

export default function MeetingConfirmedEmail({
  recipientName,
  partnerName,
  meetingDate,
  location,
  role,
  startTimeIso,
  endTimeIso,
}: MeetingConfirmedEmailProps) {
  const isBuyer = role === "BUYER";

  // 구글 캘린더 링크 생성 로직
  // YYYYMMDDTHHmmssZ 포맷으로 변환해야 구글 캘린더가 인식합니다.
  const formatForGoogleCal = (isoString: string) => {
    return new Date(isoString).toISOString().replace(/-|:|\.\d\d\d/g, "");
  };
  
  const calStart = formatForGoogleCal(startTimeIso);
  const calEnd = formatForGoogleCal(endTimeIso);
  const eventTitle = encodeURIComponent(`[BizConnect] ${partnerName} 미팅`);
  const eventDetails = encodeURIComponent("BizConnect 플랫폼을 통해 확정된 비즈니스 미팅입니다.");
  const eventLocation = encodeURIComponent(location);

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${calStart}/${calEnd}&details=${eventDetails}&location=${eventLocation}`;

  // 💡 배포 시 실제 도메인으로 변경해야 합니다.
  const loginUrl = "https://biz-connect-two.vercel.app/login"; 

  return (
    <Html>
      <Head />
      <Preview>🎉 미팅 일정이 확정되었습니다!</Preview>
      <Body style={{ backgroundColor: "#f4f7fa", fontFamily: "sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "0 auto", padding: "30px", borderRadius: "16px", marginTop: "40px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Heading style={{ color: "#2563eb", fontSize: "24px", textAlign: "center", marginBottom: "30px" }}>
            BizConnect 미팅 확정 안내
          </Heading>
          <Text style={{ fontSize: "16px", color: "#333" }}>
            안녕하세요, <strong>{recipientName}</strong>님.
          </Text>
          <Text style={{ fontSize: "16px", color: "#333" }}>
            요청하신 미팅이 성공적으로 확정되었습니다. 아래 일정을 확인해 주세요.
          </Text>
          
          <Section style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "12px", margin: "24px 0", border: "1px solid #e2e8f0" }}>
            <Text style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1e293b" }}>
              <strong>📅 일시:</strong> {meetingDate}
            </Text>
            <Text style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1e293b" }}>
              <strong>📍 장소:</strong> {location || "미지정 (플랫폼에서 확인 요망)"}
            </Text>
            <Text style={{ margin: "0", fontSize: "15px", color: "#1e293b" }}>
              <strong>🤝 상대방:</strong> {partnerName} {isBuyer ? "(셀러/스타트업)" : "(바이어/투자사)"}
            </Text>
          </Section>

          {/* 버튼 영역 */}
          <Section style={{ textAlign: "center", marginTop: "32px", marginBottom: "32px" }}>
            <Button
              href={googleCalendarUrl}
              style={{ backgroundColor: "#4285F4", color: "#fff", padding: "12px 20px", borderRadius: "8px", fontWeight: "bold", textDecoration: "none", display: "inline-block", marginRight: "10px" }}
            >
              📅 구글 캘린더에 추가
            </Button>
            <Button
              href={loginUrl}
              style={{ backgroundColor: "#1e293b", color: "#fff", padding: "12px 20px", borderRadius: "8px", fontWeight: "bold", textDecoration: "none", display: "inline-block" }}
            >
              💻 플랫폼에서 확인하기
            </Button>
          </Section>

          <Text style={{ fontSize: "14px", color: "#64748b", marginTop: "20px", textAlign: "center", lineHeight: "1.5" }}>
            미팅 시간에 늦지 않게 참석 부탁드립니다.<br />
            기타 문의사항은 플랫폼 내 메시지를 이용해 주세요.
          </Text>
          <Hr style={{ borderColor: "#e2e8f0", margin: "30px 0 20px 0" }} />
          <Text style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>
            © 2024 BizConnect. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}