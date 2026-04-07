import { Html, Body, Head, Heading, Hr, Container, Preview, Section, Text, Button, Link } from "@react-email/components";

interface DirectRequestEmailProps {
  buyerName: string;
  sellerName: string;
  proposalSnippet: string;
  locale: string;
}

export default function DirectRequestEmail({
  buyerName,
  sellerName,
  proposalSnippet,
  locale = "ko",
}: DirectRequestEmailProps) {
  const isEn = locale === "en";

  const content = {
    preview: isEn ? "New Direct Meeting Proposal - BizConnect" : "새로운 다이렉트 미팅 제안이 도착했습니다 - BizConnect",
    title: isEn ? "New Direct Proposal" : "다이렉트 미팅 제안 안내",
    greeting: isEn ? `Hello, ${buyerName}.` : `안녕하세요, ${buyerName}님.`,
    body1: isEn 
      ? `You have received a new business meeting proposal from ${sellerName}.`
      : `${sellerName}님으로부터 새로운 비즈니스 미팅 제안이 도착했습니다.`,
    proposalTitle: isEn ? "Proposal Summary:" : "제안 내용 요약:",
    body2: isEn
      ? "You can review the full proposal and chat with the seller in the Direct Proposals section of your dashboard."
      : "대시보드의 '받은 제안' 섹션에서 전체 제안 내용을 확인하고 셀러와 대화를 나누실 수 있습니다.",
    button: isEn ? "View Proposals" : "제안 확인하러 가기",
    footer: isEn
      ? "© 2026 BizConnect. All rights reserved."
      : "© 2026 BizConnect. 모든 권리 보유."
  };

  const dashboardUrl = "https://biz-connect-two.vercel.app/buyer";

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

          <Section style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "12px", margin: "24px 0", border: "1px solid #e2e8f0" }}>
            <Text style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>
              {content.proposalTitle}
            </Text>
            <Text style={{ margin: "0", fontSize: "15px", color: "#1e293b", fontStyle: "italic" }}>
              "{proposalSnippet.length > 100 ? proposalSnippet.substring(0, 100) + "..." : proposalSnippet}"
            </Text>
          </Section>

          <Text style={{ fontSize: "16px", color: "#333", lineHeight: "1.6" }}>
            {content.body2}
          </Text>

          <Section style={{ textAlign: "center", marginTop: "32px", marginBottom: "32px" }}>
            <Button
              href={dashboardUrl}
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
