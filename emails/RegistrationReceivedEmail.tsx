import { Html, Body, Head, Heading, Hr, Container, Preview, Section, Text, Link } from "@react-email/components";

interface RegistrationReceivedEmailProps {
  name: string;
  role: "BUYER" | "SELLER";
  locale: string;
}

export default function RegistrationReceivedEmail({
  name,
  role,
  locale = "ko",
}: RegistrationReceivedEmailProps) {
  const isEn = locale === "en";
  const isBuyer = role === "BUYER";

  const content = {
    preview: isEn ? "Registration Received - BizConnect" : "회원가입 신청이 접수되었습니다 - BizConnect",
    title: isEn ? "Welcome to BizConnect" : "BizConnect 가입을 환영합니다",
    greeting: isEn ? `Hello, ${name}.` : `안녕하세요, ${name}님.`,
    body1: isEn 
      ? `Thank you for registering as a ${isBuyer ? "Buyer (Investor)" : "Seller (Startup)"} on BizConnect.`
      : `BizConnect에 ${isBuyer ? "바이어(투자사)" : "셀러(스타트업)"}로 가입해 주셔서 감사합니다.`,
    body2: isEn
      ? "Your registration is currently under review by our team. You will receive an approval notification via email once the review is complete."
      : "현재 회원님의 가입 신청이 접수되어 검토 중에 있습니다. 승인이 완료되는 대로 안내 메일을 보내드릴 예정입니다.",
    body3: isEn
      ? "Please wait a moment for the approval process."
      : "잠시만 기다려 주시면 신속히 확인하여 승인 처리를 도와드리겠습니다.",
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
          <Text style={{ fontSize: "16px", color: "#333", lineHeight: "1.6" }}>
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
