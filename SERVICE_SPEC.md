# My MICE Hub (Biz-Connect) Service Specification

This document serves as the primary reference for AI agents and human stakeholders working on the Biz-Connect platform.

## 🤖 Section 1: AI Instructions & Tech Stack
*Use these details to maintain architectural consistency and follow established patterns.*

### 🛠 Technology Stack
- **Project Structure**: Next.js 16 (App Router)
- **Language**: TypeScript (Strongly typed)
- **Database Architecture**: 
  - ORM: [Prisma](file:///c:/Users/richg/my-mice-hub/prisma/schema.prisma)
  - Engine: PostgreSQL (Hosted on Supabase)
- **Authentication**: NextAuth.js (Prisma Adapter)
- **UI & Styling**: 
  - Framework: Tailwind CSS 4
  - Icons: Lucide React
- **Advanced Features**:
  - AI Engine: Anthropic AI SDK (Claude)
  - Emails: Resend + React Email
  - Data Export: xlsx (Excel)

### 🧩 Core Modules & logic
1. **Meeting Workflow**:
   - `REGULAR`: Seller applies for Buyer's pre-defined `TimeSlot`.
   - `DIRECT_REQUEST`: Seller sends a proposal without a specific slot.
   - Statuses: `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`.
2. **AI Search Engine**:
   - `/api/ai-search`: Vector-like search using LLM to match Buyer needs with Seller One-Pagers.
3. **One-Pager System**:
   - Standardized profile for Sellers to showcase business value, traction, and tech.
4. **Chat System**:
   - Polling-based Real-time chat per `Meeting`.

### ⚠️ Development Rules for AI
- **I18n**: All text MUST go through [lib/i18n.tsx](file:///c:/Users/richg/my-mice-hub/lib/i18n.tsx). No hardcoded strings.
- **Server Actions**: Preferred for all mutations (Buyer/Seller logic).
- **Aesthetics**: Premium, professional, and high-contrast design. Use `indigo-600` primary colors.

---

## 👥 Section 2: Service Summary for Humans
*High-level overview for partners, users, and managers.*

### 1. 서비스 개요 (Service Overview)
**My MICE Hub (Biz-Connect)**는 MICE 산업과 스타트업 생태계를 인공지능(AI) 기술로 연결하는 프리미엄 B2B 매칭 플랫폼입니다. 구매자(투자자, 대기업)와 판매자(스타트업, 서비스사) 간의 복잡한 매칭 과정을 자동화하고 효율적인 미팅 관리를 지원합니다.

### 2. 서비스 특장점 (Key Features)
- **✨ AI 지능형 매칭**: 단순 필터링이 아닌, 사용자 질문의 의도를 파악하여 가장 적합한 비즈니스 파트너를 추천합니다.
- **📅 원스톱 스케줄링**: 바이어의 가능한 시간대를 확인하고 즉시 미팅을 신청하거나, 특정 목적의 다이렉트 제안을 보낼 수 있습니다.
- **📄 원페이저(One-Pager) 프로필**: 기업의 핵심 가치, 비즈니스 모델, 성과를 한눈에 파악할 수 있는 표준화된 기업 소개 페이지를 제공합니다.
- **💬 실시간 비즈니스 채팅**: 미팅 승인 후 즉시 소통 가능한 채팅룸이 개설되어 사전 조율 및 자료 공유가 원활합니다.
- **🌍 글로벌 지원**: 한국어와 영어를 완벽히 지원하여 국내외 다양한 비즈니스 기회를 창출합니다.

### 3. 추천 대상 (Target Audience)
- **바이어(Buyer)**:
  - 새로운 기술과 서비스를 찾는 대기업 오픈이노베이션 팀
  - 유망한 스타트업을 발굴하는 VC(벤처캐피털) 및 액셀러레이터
  - 대규모 비즈니스 이벤트를 기획하는 MICE 주최사
- **셀러(Seller)**:
  - 투자 유치 및 판로 개척이 필요한 초기/성장단계 스타트업
  - MICE 산업 내 특화된 솔루션을 제공하는 전문 서비스 기업
  - 대기업 파트너십을 희망하는 기술 기반 제조/서비스 기업
