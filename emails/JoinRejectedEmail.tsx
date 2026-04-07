import { Html, Body, Head, Heading, Hr, Container, Preview, Section, Text, Button, Link } from "@react-email/components";

interface JoinRejectedEmailProps {
  masterName: string;
  memberName: string;
  organizationName: string;
  rejectionReason?: string;
  locale: string;
}

export default function JoinRejectedEmail({
  masterName,
  memberName,
  organizationName,
  rejectionReason,
  locale = "ko",
}: JoinRejectedEmailProps) {
  const isEn = locale === "en";

  const content = {
    preview: isEn ? "Team Join Request Update - BizConnect" : "팀 가입 신청 결과 안내 - BizConnect",
    title: isEn ? "Join Request Update" : "팀 가입 신청 결과 안내",
    greeting: isEn ? `Hello, ${memberName}.` : `안녕하세요, ${memberName}님.`,
    body1: isEn 
      ? `We are writing to inform you about your request to join ${organizationName}.`
      : `${organizationName} 조직으로의 가입 신청 결과에 대해 안내드립니다.`,
    body2: isEn
      ? "Unfortunately, your request to join the organization has been rejected by the Master."
      : "안타깝게도, 해당 조직의 마스터에 의해 가입 신청이 거절되었습니다.",
    reasonTitle: isEn ? "Rejection Reason:" : "거절 사유:",
    body3: isEn
      ? "If you have any questions, please contact the organization master or reach out to our support team."
      : "추가 문의사항이 있으시면 조직 마스터에게 문의하시거나 저희 고객지원팀으로 연락해 주시기 바랍니다.",
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
          <Heading style={{ color: "#e11d48", fontSize: "24px", textAlign: "center", marginBottom: "30px" }}>
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

          {rejectionReason && (
            <Section style={{ backgroundColor: "#fff1f2", padding: "20px", borderRadius: "12px", marginTop: "20px", marginBottom: "20px", borderLeft: "4px solid #e11d48" }}>
              <Text style={{ fontSize: "14px", color: "#9f1239", fontWeight: "bold", margin: "0 0 8px 0" }}>
                {content.reasonTitle}
              </Text>
              <Text style={{ fontSize: "15px", color: "#333", margin: "0" }}>
                {rejectionReason}
              </Text>
            </Section>
          )}

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
