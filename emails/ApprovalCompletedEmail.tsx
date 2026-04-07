import { Html, Body, Head, Heading, Hr, Container, Preview, Section, Text, Button, Link } from "@react-email/components";

interface ApprovalCompletedEmailProps {
  name: string;
  locale: string;
}

export default function ApprovalCompletedEmail({
  name,
  locale = "ko",
}: ApprovalCompletedEmailProps) {
  const isEn = locale === "en";

  const content = {
    preview: isEn ? "Account Approved - BizConnect" : "가입 승인이 완료되었습니다 - BizConnect",
    title: isEn ? "Account Approved!" : "가입 승인 안내",
    greeting: isEn ? `Congratulations, ${name}!` : `축하합니다, ${name}님!`,
    body1: isEn 
      ? "Your account has been reviewed and approved by the administrator."
      : "회원님의 계정 검토가 완료되어 정식으로 서비스 이용 승인이 이루어졌습니다.",
    body2: isEn
      ? "You can now log in to BizConnect and start networking with global partners."
      : "이제 BizConnect에 로그인하여 다양한 글로벌 파트너들과 네트워킹을 시작하실 수 있습니다.",
    button: isEn ? "Log in Now" : "지금 로그인하기",
    footer: isEn
      ? "© 2026 BizConnect. All rights reserved."
      : "© 2026 BizConnect. 모든 권리 보유."
  };

  const loginUrl = "https://biz-connect-two.vercel.app/login";

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
              href={loginUrl}
              style={{ backgroundColor: "#2563eb", color: "#fff", padding: "12px 24px", borderRadius: "12px", fontWeight: "bold", textDecoration: "none", fontSize: "15px" }}
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
