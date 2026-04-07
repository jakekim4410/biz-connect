import { Html, Body, Head, Heading, Hr, Container, Preview, Section, Text, Button, Link } from "@react-email/components";

interface ForgotPasswordEmailProps {
  name: string;
  resetLink: string;
  locale: string;
}

export default function ForgotPasswordEmail({
  name,
  resetLink,
  locale = "ko",
}: ForgotPasswordEmailProps) {
  const isEn = locale === "en";

  const content = {
    preview: isEn ? "Password Reset Request - BizConnect" : "비밀번호 재설정 요청 - BizConnect",
    title: isEn ? "Reset Your Password" : "비밀번호 재설정 안내",
    greeting: isEn ? `Hello, ${name}.` : `안녕하세요, ${name}님.`,
    body1: isEn 
      ? "We received a request to reset your password for your BizConnect account."
      : "BizConnect 계정의 비밀번호 재설정 요청이 접수되었습니다.",
    body2: isEn
      ? "Click the button below to set a new password. This link will expire in 1 hour."
      : "아래 버튼을 클릭하여 새로운 비밀번호를 설정해 주세요. 이 링크는 1시간 동안 유효합니다.",
    body3: isEn
      ? "If you did not request this, please ignore this email."
      : "비밀번호 재설정을 요청하지 않으셨다면 이 메일을 무시해 주셔도 됩니다.",
    button: isEn ? "Reset Password" : "비밀번호 재설정하기",
    footer: isEn
      ? "© 2026 BizConnect. All rights reserved."
      : "© 2026 BizConnect. 모든 권리 보유."
  };

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
              href={resetLink}
              style={{ backgroundColor: "#2563eb", color: "#fff", padding: "12px 24px", borderRadius: "12px", fontWeight: "bold", textDecoration: "none", fontSize: "15px" }}
            >
              {content.button}
            </Button>
          </Section>

          <Text style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.6" }}>
            {content.body3}
          </Text>
          
          <Hr style={{ borderColor: "#e2e8f0", margin: "30px 0 20px 0" }} />
          <Text style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>
            {content.footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
