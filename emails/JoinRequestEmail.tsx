import { Html, Body, Head, Heading, Hr, Container, Preview, Section, Text, Button, Link } from "@react-email/components";

interface JoinRequestEmailProps {
  masterName: string;
  memberName: string;
  memberEmail: string;
  locale: string;
}

export default function JoinRequestEmail({
  masterName,
  memberName,
  memberEmail,
  locale = "ko",
}: JoinRequestEmailProps) {
  const isEn = locale === "en";

  const content = {
    preview: isEn ? "New Team Member Request - BizConnect" : "새로운 팀원 가입 승인 요청 - BizConnect",
    title: isEn ? "New Member Request" : "팀원 가입 승인 요청",
    greeting: isEn ? `Hello, ${masterName}.` : `안녕하세요, ${masterName} 마스터님.`,
    body1: isEn 
      ? `A new member, ${memberName} (${memberEmail}), has requested to join your organization on BizConnect.`
      : `새로운 팀원 ${memberName} (${memberEmail})님이 BizConnect의 회원님 조직으로 가입을 신청했습니다.`,
    body2: isEn
      ? "Please review the request and approve or reject it in the Team Management section."
      : "팀 관리 섹션에서 해당 신청 건을 검토하신 후 승인 또는 거절 처리를 진행해 주시기 바랍니다.",
    button: isEn ? "Go to Team Management" : "팀 관리로 이동하기",
    footer: isEn
      ? "© 2026 BizConnect. All rights reserved."
      : "© 2026 BizConnect. 모든 권리 보유."
  };

  const teamUrl = "https://biz-connect-two.vercel.app/seller"; // Often redirects or has a section

  return (
    <Html>
      <Head />
      <Preview>{content.preview}</Preview>
      <Body style={{ backgroundColor: "#f4f7fa", fontFamily: "sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "0 auto", padding: "30px", borderRadius: "16px", marginTop: "40px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Heading style={{ color: "#2563eb", fontSize: "24px", textAlign: "center", marginBottom: "30px" }}>
            {content.title}
          </Heading>
          <Text style={{ fontSize: "16px", color: "#333", fontWeight: "bold" }}>
            {content.greeting}
          </Text>
          <Text style={{ fontSize: "16px", color: "#333", lineHeight: "1.6" }}>
            {content.body1}
          </Text>
          <Text style={{ fontSize: "16px", color: "#333", lineHeight: "1.6" }}>
            {content.body2}
          </Text>

          <Section style={{ textAlign: "center", marginTop: "32px", marginBottom: "32px" }}>
            <Button
              href={teamUrl}
              style={{ backgroundColor: "#1e293b", color: "#fff", padding: "12px 24px", borderRadius: "12px", fontWeight: "bold", textDecoration: "none", fontSize: "15px" }}
            >
              {content.button}
            </Button>
          </Section>
          
          <Hr style={{ borderColor: "#e2e8f0", margin: "30px 0 20px 0" }} />
          <Text style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>
            {content.footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
