// lib/i18n.tsx
"use client";

import React, { useState, useEffect, createContext, useContext } from "react";

// ─── 번역 타입 ───
export type Locale = "ko" | "en";

// ─── 번역 딕셔너리 (as const 유지하여 자동완성 지원) ───
export const translations = {
  ko: {
    // 공통
    common: {
      login: "로그인",
      logout: "로그아웃",
      register: "회원가입",
      save: "저장하기",
      cancel: "취소",
      confirm: "확인",
      loading: "처리 중...",
      error: "오류가 발생했습니다.",
      required: "필수 입력 항목입니다.",
      company: "회사명",
      email: "이메일",
      password: "비밀번호",
      name: "성함",
      phone: "연락처",
      jobTitle: "직함",
    },
    // 네비게이션
    nav: {
      buyer: "Buyer",
      seller: "Seller",
      admin: "Admin",
    },
    // 로그인
    login: {
      title: "로그인",
      emailPlaceholder: "example@email.com",
      passwordPlaceholder: "••••••••",
      submitButton: "로그인",
      loadingButton: "로그인 중...",
      noAccount: "아직 계정이 없으신가요?",
      registerLink: "회원가입 하기",
      errorUserNotFound: "메일주소가 다르거나 가입하지 않은 메일주소입니다.",
      errorIncorrectPassword: "비밀번호가 틀립니다.",
      errorPending: "관리자 승인 대기 중입니다. 승인 완료 후 로그인 가능합니다.",
      errorRejected: "가입이 거절된 계정입니다. 관리자에게 문의해주세요.",
      errorGeneral: "로그인 중 오류가 발생했습니다.",
    },
    // 역할 선택 (어드민용)
    selectRole: {
      title: "대시보드 선택",
      subtitle: "접근할 대시보드 유형을 선택해주세요.",
      adminTitle: "관리자 콘솔",
      adminDesc: "전체 사용자 및 매칭 시스템 관리",
      buyerTitle: "바이어 대시보드",
      buyerDesc: "셀러 탐색 및 미팅 슬롯 관리",
      sellerTitle: "셀러 대시보드",
      sellerDesc: "매칭 탐색 및 미팅 신청 현황",
      greeting: "어드민으로 로그인되었습니다",
      goBtn: "이동하기",
    },
    // 회원가입
    register: {
      title: "BizConnect 가입",
      subtitle: "Personal Account Registration",
      roleLabel: "계정 유형",
      roleBuyer: "투자자 (VC, AC, BUYER)",
      roleSeller: "스타트업 (STARTUP)",
      roleLocked: "🔒 선택하신 회사의 전용 계정 유형으로 고정되었습니다.",
      emailLabel: "이메일 주소",
      emailInvalid: "유효한 이메일 형식을 입력해주세요.",
      emailDuplicate: "이미 가입된 이메일입니다.",
      emailAvailable: "✓ 사용 가능한 이메일입니다.",
      emailChecking: "확인 중...",
      phoneLabel: "전화번호",
      passwordLabel: "비밀번호",
      passwordHint: "8글자 이상으로 작성하세요.",
      passwordTooShort: "비밀번호가 너무 짧습니다. (8자 이상)",
      passwordValid: "✓ 8글자 이상으로 안전합니다.",
      confirmPasswordLabel: "비밀번호 확인",
      confirmPasswordMatch: "✓ 비밀번호가 일치합니다.",
      confirmPasswordMismatch: "비밀번호가 일치하지 않습니다.",
      forgotPasswordLink: "비밀번호를 잊으셨나요?",
      primaryRegionLabel: "주 활동 권역 (1안)",
      secondaryRegionLabel: "추가 활동/관심 권역 (2안)",
      regionPlaceholder: "권역을 선택해주세요",
      companyLabel: "회사명 (Company)",
      companyPlaceholder: "회사명을 입력하세요",
      companyConfirmed: "✓ 기존 등록된 회사입니다. 비즈니스 정보가 자동 연계됩니다.",
      similarCompaniesTitle: "이미 등록된 유사한 회사가 있습니다. 소속 회사를 선택해 주세요.",
      selectButton: "선택",
      bizNumberLabel: "사업자등록번호",
      bizNumberLocked: "🔒 선택하신 회사의 사업자등록번호로 고정되었습니다.",
      bizNumberHint: "💡 정확한 회사 분류를 위해 사업자번호 입력이 필수입니다.",
      nameLabel: "가입자 성함",
      namePlaceholder: "실명을 입력하세요",
      jobTitleLabel: "직함 (한글)",
      jobTitlePlaceholder: "예: 팀장, 대표, 매니저",
      // ─── [변경 2] 영문 직함 ───
      jobTitleEnLabel: "직함 (영문)",
      userTypeLabel: "회원 유형",
      userTypeOtherPlaceholder: "상세 유형 입력",
      preferredPartnersLabel: "관심 파트너 및 산업군",
      preferredPartnersPlaceholder: "관심 산업군 및 선호하는 파트너를 적어주세요. (선택)",
      submitButton: "BizConnect 시작하기",
      requiredNote: "* 표시는 필수 입력 항목입니다.",
      successBuyer: "바이어 계정 가입이 완료되었습니다.\n관리자(어드민)의 최종 승인 후 정상적으로 서비스를 이용하실 수 있습니다.",
      successGeneral: "회원가입이 성공적으로 완료되었습니다.",
      existingUserLabel: "기존 가입자 확인용",
      investor: "[투자자]",
      startup: "[스타트업]",
      companyNameEnLabel: "영문 회사명",
      ceoNameKoLabel: "대표자 한글명",
      ceoNameEnLabel: "대표자 영문명",
      nameEnLabel: "가입자 영문 이름",
      masterBadgeTitle: "귀사가 최초 등록되는 마스터 계정입니다.",
      masterBadgeDesc: "입력하신 회사 정보는 이후 합류하는 팀원에게 자동 공유됩니다.",
      privacyConsentLabel: "개인정보 처리방침에 동의합니다.",
      privacyConsentDesc: "수집된 정보는 BizConnect 서비스 운영 목적으로만 사용되며, 제3자에게 제공되지 않습니다.",
      // ─── [변경 3] LinkedIn ───
      linkedinLabel: "LinkedIn 프로필",
      linkedinHint: "LinkedIn 프로필 URL을 입력하시면 비즈니스 매칭 시 활용됩니다.",
    },
    // 바이어 대시보드
    buyer: {
      nav: {
        directory: "셀러 탐색",
        pending: "예약 관리",
        confirmed: "확정 일정",
        generator: "슬롯 생성",
        analytics: "분석 정보",
        profile: "정보 수정",
      },
      directory: {
        title: "셀러 탐색 디렉토리",
        downloadBtn: "비즈니스 DB 다운로드",
        keywordSearch: "🔍 키워드 검색",
        aiSearch: "AI 스마트 검색",
        searchPlaceholder: "회사명, 제품, 산업 키워드 검색...",
        aiPlaceholder: "예: AI 기반 헬스케어 솔 파트너 검색...",
        aiHint: "💡 자연어로 원하는 파트너 조건을 자유롭게 입력하세요. AI가 DB + 웹 정보를 종합 분석합니다.",
        aiSearchBtn: "AI 검색",
        analyzing: "분석 중...",
        allIndustries: "전체 산업 분야",
        noResults: "검색 조건에 맞는 기업이 없습니다.",
        dbNotRegistered: "DB 미등록",
        avgMatchScore: "평균 매칭도",
        noMatchFound: "검색 조건에 맞는 기업을 찾지 못했습니다",
        switchToKeyword: "키워드 검색으로 전환",
        clickToView: "카드 클릭 시 기업 상세 원페이저를 확인합니다",
        companiesFound: "Companies Found",
      },
      pending: {
        title: "예약 관리",
        pendingFilter: "신청 대기중",
        matchedFilter: "매칭 완료",
        noReservations: "해당하는 예약 일정이 없습니다.",
        noRequests: "신청 없음",
        reviewBtn: "검토하기",
        detailReview: "상세 검토",
      },
      confirmed: {
        title: "확정 미팅 일정",
        all: "전체",
        upcoming: "남은 미팅",
        past: "지난 미팅",
        downloadBtn: "다운로드",
        noMeetings: "조건에 해당하는 미팅 일정이 없습니다.",
        completed: "Completed",
        confirmed: "Confirmed",
        location: "운영팀 지정 장소",
      },
      generator: {
        title: "상담 가능 슬롯 생성",
        subtitle: "셀러가 신청할 수 있는 시간을 새롭게 등록하세요.",
        dateLabel: "상담 희망 일자",
        hourLabel: "시간 (Hour)",
        minuteLabel: "분 (Minute)",
        locationLabel: "상담 장소 / 온라인 여부",
        locationPlaceholder: "예: 미팅룸 A, 온라인(ZOOM) 등",
        submitBtn: "슬롯 등록 완료",
        creating: "생성 중...",
      },
      analytics: {
        title: "셀러 생태계 분석",
        industryTitle: "산업별 참여 분포",
        stageTitle: "투자 단계 분포",
      },
      profile: {
        title: "정보 수정",
        companyLabel: "회사명",
        masterOnly: "* 마스터만 변경 가능",
        emailFixed: "이메일 (고정)",
        nameLabel: "성함",
        phoneLabel: "연락처",
        jobTitleLabel: "소속 부서 및 직함",
        newPassword: "새 비밀번호 (변경 시에만)",
        confirmPassword: "비밀번호 확인",
        userTypeLabel: "회원 유형",
        preferredLabel: "관심 산업군 및 선호 파트너",
        saveBtn: "정보 저장하기",
      },
      rejection: {
        matchedOther: "타기업 매칭",
        cancelledByBuyer: "바이어/VC가 예약을 취소하였습니다.",
        defaultReason: "사유가 입력되지 않았습니다.",
      },
    },
    // 셀러 대시보드
    seller: {
      nav: {
        available: "매칭 탐색",
        pending: "신청 현황",
        confirmed: "확정 일정",
        rejected: "거절 내역",
        team: "팀 관리",
        profile: "내 프로필",
        onePager: "기업 소개",
        onePagerNeeded: "(작성 필요)",
        onePagerManage: "(관리)",
      },
      available: {
        title: "매칭 탐색",
        viewAll: "🔍 전체 목록 보기",
        aiSearch: "AI 스마트 검색",
        aiPlaceholder: "예: SaaS 솔루션에 투자하는 VC, 헬스케어 분야 바이어...",
        aiHint: "💡 원하는 바이어/VC 조건을 자유롭게 입력하세요. AI가 DB + 웹 정보를 종합 분석합니다.",
        noSlots: "현재 신청 가능한 미팅 슬롯이 없습니다.",
        applyBtn: "미팅 신청",
        duplicateWarning: "팀원 중 중복 신청",
        slotNotOpen: "슬롯 미개설",
        applyMeetingBtn: "미팅 신청하기",
        switchToAll: "전체 목록으로 전환",
      },
      pending: {
        title: "신청 현황",
        noPending: "현재 대기 중인 신청 내역이 없습니다.",
        reviewing: "검토 중",
        statusInfo: "상대 기업에서 제안 내용을 검토하고 있습니다. 확정 여부는 [확정 일정] 또는 [거절 내역]에서 확인 가능합니다.",
      },
      confirmed: {
        title: "확정된 미팅 일정",
        noConfirmed: "확정된 미팅 일정이 없습니다.",
        downloadBtn: "엑셀 다운로드",
        matchConfirmed: "매칭 확정",
      },
      rejected: {
        title: "거절 내역",
        noRejected: "거절된 미팅 내역이 없습니다.",
        reason: "거절 사유 (Reason)",
        noReason: "사유가 입력되지 않았습니다.",
      },
      team: {
        title: "팀 멤버 관리",
        pendingTitle: "승인 대기",
        membersTitle: "소속 팀원",
        noPending: "새로운 합류 요청이 없습니다.",
        approveBtn: "승인",
        rejectBtn: "거절",
        transferBtn: "권한 위임",
        rejectedTitle: "반려된 멤버",
        rejectionReason: "반려 사유",
      },
      profile: {
        masterBadge: "마스터 (MASTER)",
        memberBadge: "조직원 (MEMBER)",
        saveBtn: "정보 저장하기",
        masterOnly: "*마스터 권한",
      },
      onePager: {
        bannerTitle: "마지막 단계! 매칭 성공률을",
        bannerHighlight: "3.5배",
        bannerSuffix: "높이세요.",
        writeBtn: "내 원페이저 작성하기",
        writeTime: "약 3분 소요",
        pendingAlert: "가입 승인 대기 중",
        rejectedTitle: "가입 승인 거절",
        reApplyBtn: "정보 수정하여 재신청하기",
      },
      applyModal: {
        title: "미팅 신청하기",
        proposalLabel: "사전 제안 메시지",
        proposalPlaceholder: "어떤 비즈니스 시너지를 낼 수 있는지 간략하게 어필해주세요.",
        submitBtn: "이 내용으로 신청하기",
        submitting: "신청 중...",
      },
    },
  },
  en: {
    common: {
      login: "Sign In",
      logout: "Logout",
      register: "Sign Up",
      save: "Save",
      cancel: "Cancel",
      confirm: "Confirm",
      loading: "Processing...",
      error: "An error occurred.",
      required: "This field is required.",
      company: "Company",
      email: "Email",
      password: "Password",
      name: "Full Name",
      phone: "Phone",
      jobTitle: "Job Title",
    },
    nav: {
      buyer: "Buyer",
      seller: "Seller",
      admin: "Admin",
    },
    login: {
      title: "Sign In",
      emailPlaceholder: "example@email.com",
      passwordPlaceholder: "••••••••",
      submitButton: "Sign In",
      loadingButton: "Signing in...",
      noAccount: "Don't have an account?",
      registerLink: "Sign up here",
      errorUserNotFound: "Email not found or not registered.",
      errorIncorrectPassword: "Incorrect password.",
      errorPending: "Your account is pending approval. Please wait for admin approval.",
      errorRejected: "Your account has been rejected. Please contact the administrator.",
      errorGeneral: "An error occurred during sign in.",
    },
    selectRole: {
      title: "Select Dashboard",
      subtitle: "Choose the dashboard type you want to access.",
      adminTitle: "Admin Console",
      adminDesc: "Manage all users and the matching system",
      buyerTitle: "Buyer Dashboard",
      buyerDesc: "Explore sellers and manage meeting slots",
      sellerTitle: "Seller Dashboard",
      sellerDesc: "Explore matches and track meeting applications",
      greeting: "Logged in as Administrator",
      goBtn: "Go",
    },
    register: {
      title: "Join BizConnect",
      subtitle: "Personal Account Registration",
      roleLabel: "Account Type",
      roleBuyer: "Investor (VC, AC, Buyer)",
      roleSeller: "Startup",
      roleLocked: "🔒 Account type is fixed based on your selected company.",
      emailLabel: "Email Address",
      emailInvalid: "Please enter a valid email format.",
      emailDuplicate: "This email is already registered.",
      emailAvailable: "✓ This email is available.",
      emailChecking: "Checking...",
      phoneLabel: "Phone Number",
      passwordLabel: "Password",
      passwordHint: "Must be at least 8 characters.",
      passwordTooShort: "Password is too short. (Min. 8 characters)",
      passwordValid: "✓ Password meets the requirements.",
      confirmPasswordLabel: "Confirm Password",
      confirmPasswordMatch: "✓ Passwords match.",
      confirmPasswordMismatch: "Passwords do not match.",
      forgotPasswordLink: "Forgot your password?",
      primaryRegionLabel: "Primary Activity Region",
      secondaryRegionLabel: "Secondary Activity Region",
      regionPlaceholder: "Select Region",
      companyLabel: "Company Name",
      companyPlaceholder: "Enter your company name",
      companyConfirmed: "✓ Existing company found. Business info will be linked automatically.",
      similarCompaniesTitle: "Similar companies found. Please select your company.",
      selectButton: "Select",
      bizNumberLabel: "Business Registration Number",
      bizNumberLocked: "🔒 Business number is fixed based on your selected company.",
      bizNumberHint: "💡 Required for accurate company classification.",
      nameLabel: "Full Name",
      namePlaceholder: "Enter your full name",
      jobTitleLabel: "Job Title",
      jobTitlePlaceholder: "e.g. Manager, CEO, Director",
      // ─── [변경 2] 영문 직함 (영어에서는 단일 필드이므로 동일하게 표기) ───
      jobTitleEnLabel: "Job Title (English)",
      userTypeLabel: "Member Type",
      userTypeOtherPlaceholder: "Enter details",
      preferredPartnersLabel: "Interests & Preferred Partners",
      preferredPartnersPlaceholder: "Describe your preferred partners or industries. (Optional)",
      submitButton: "Get Started with BizConnect",
      requiredNote: "* indicates required fields.",
      successBuyer: "Registration complete.\nYou can use the service after admin approval.",
      successGeneral: "Registration completed successfully.",
      existingUserLabel: "Existing member",
      investor: "[Investor]",
      startup: "[Startup]",
      companyNameEnLabel: "Company Name (English)",
      ceoNameKoLabel: "CEO Name (Korean)",
      ceoNameEnLabel: "CEO Name (English)",
      nameEnLabel: "Your Name (English)",
      masterBadgeTitle: "You are registering as the Master account for your company.",
      masterBadgeDesc: "Company information you enter will be automatically shared with future team members.",
      privacyConsentLabel: "I agree to the Privacy Policy.",
      privacyConsentDesc: "Your information will only be used for BizConnect service operations and will not be shared with third parties.",
      // ─── [변경 3] LinkedIn ───
      linkedinLabel: "LinkedIn Profile",
      linkedinHint: "Adding your LinkedIn URL helps improve business matching accuracy.",
    },
    401: {
      nav: {
        directory: "Explore",
        pending: "Reservations",
        confirmed: "Schedule",
        generator: "Create Slot",
        analytics: "Insights",
        profile: "Profile",
      },
      directory: {
        title: "Seller Directory",
        downloadBtn: "Download Business DB",
        keywordSearch: "🔍 Keyword Search",
        aiSearch: "AI Smart Search",
        searchPlaceholder: "Search by company, product, industry...",
        aiPlaceholder: "e.g. AI-based healthcare solution partner...",
        aiHint: "💡 Describe your ideal partner in natural language. AI analyzes DB + web data.",
        aiSearchBtn: "AI Search",
        analyzing: "Analyzing...",
        allIndustries: "All Industries",
        noResults: "No companies found matching your criteria.",
        dbNotRegistered: "Not in DB",
        avgMatchScore: "Avg. Match Score",
        noMatchFound: "No companies found matching your search",
        switchToKeyword: "Switch to Keyword Search",
        clickToView: "Click a card to view the company's One-Pager",
        companiesFound: "Companies Found",
      },
      pending: {
        title: "Reservation Management",
        pendingFilter: "Pending",
        matchedFilter: "Matched",
        noReservations: "No reservations found.",
        noRequests: "No requests",
        reviewBtn: "Review",
        detailReview: "Review Details",
      },
      confirmed: {
        title: "Confirmed Schedule",
        all: "All",
        upcoming: "Upcoming",
        past: "Past",
        downloadBtn: "Download",
        noMeetings: "No meetings found for the selected filter.",
        completed: "Completed",
        confirmed: "Confirmed",
        location: "Location TBD by organizer",
      },
      generator: {
        title: "Create Consultation Slot",
        subtitle: "Add a new time slot for sellers to apply.",
        dateLabel: "Preferred Date",
        hourLabel: "Hour",
        minuteLabel: "Minute",
        locationLabel: "Location / Online",
        locationPlaceholder: "e.g. Meeting Room A, Online (Zoom)",
        submitBtn: "Create Slot",
        creating: "Creating...",
      },
      analytics: {
        title: "Seller Ecosystem Analytics",
        industryTitle: "Industry Distribution",
        stageTitle: "Investment Stage Distribution",
      },
      profile: {
        title: "Edit Profile",
        companyLabel: "Company Name",
        masterOnly: "* Master only",
        emailFixed: "Email (Fixed)",
        nameLabel: "Full Name",
        phoneLabel: "Phone",
        jobTitleLabel: "Department & Job Title",
        newPassword: "New Password (only if changing)",
        confirmPassword: "Confirm Password",
        userTypeLabel: "Member Type",
        preferredLabel: "Interests & Preferred Partners",
        saveBtn: "Save Changes",
      },
      rejection: {
        matchedOther: "Matched with another company",
        cancelledByBuyer: "The Buyer/VC has cancelled the reservation.",
        defaultReason: "No reason provided.",
      },
    },
    seller: {
      nav: {
        available: "Explore",
        pending: "Applications",
        confirmed: "Schedule",
        rejected: "Rejected",
        team: "Team",
        profile: "Profile",
        onePager: "Company Info",
        onePagerNeeded: "(Required)",
        onePagerManage: "(Manage)",
      },
      available: {
        title: "Match Explore",
        viewAll: "🔍 View All",
        aiSearch: "AI Smart Search",
        aiPlaceholder: "e.g. VC investing in SaaS, healthcare buyer...",
        aiHint: "💡 Describe your ideal buyer/VC. AI analyzes DB + web data.",
        noSlots: "No available meeting slots at this time.",
        applyBtn: "Apply",
        duplicateWarning: "Team member already applied",
        slotNotOpen: "No slot available",
        applyMeetingBtn: "Apply for Meeting",
        switchToAll: "Switch to Full List",
      },
      pending: {
        title: "Application Status",
        noPending: "No pending applications.",
        reviewing: "Under Review",
        statusInfo: "The other party is reviewing your proposal. Check [Schedule] or [Rejected] for updates.",
      },
      confirmed: {
        title: "Confirmed Meetings",
        noConfirmed: "No confirmed meetings.",
        downloadBtn: "Download Excel",
        matchConfirmed: "Confirmed",
      },
      rejected: {
        title: "Rejected Applications",
        noRejected: "No rejected applications.",
        reason: "Rejection Reason",
        noReason: "No reason provided.",
      },
      team: {
        title: "Team Management",
        pendingTitle: "Pending Approval",
        membersTitle: "Team Members",
        noPending: "No new join requests.",
        approveBtn: "Approve",
        rejectBtn: "Reject",
        transferBtn: "Transfer Master",
        rejectedTitle: "Rejected Members",
        rejectionReason: "Rejection Reason",
      },
      profile: {
        masterBadge: "MASTER",
        memberBadge: "MEMBER",
        saveBtn: "Save Changes",
        masterOnly: "*Master only",
      },
      onePager: {
        bannerTitle: "Last step! Increase your match rate by",
        bannerHighlight: "3.5x",
        bannerSuffix: "",
        writeBtn: "Write My One-Pager",
        writeTime: "~3 min",
        pendingAlert: "Awaiting Approval",
        rejectedTitle: "Registration Rejected",
        reApplyBtn: "Edit Info & Reapply",
      },
      applyModal: {
        title: "Apply for Meeting",
        proposalLabel: "Proposal Message",
        proposalPlaceholder: "Briefly explain the business synergy you can offer.",
        submitBtn: "Submit Application",
        submitting: "Submitting...",
      },
    },
  },
} as const;

// ─── 해결의 핵심: 타입 정의 ───
export type TranslationSchema = typeof translations.ko;

interface I18nContextType {
  locale: Locale;
  hasSelectedLocale: boolean;
  isInitialized: boolean;
  setLocale: (locale: Locale) => void;
  t: TranslationSchema;
}

export const I18nContext = createContext<I18nContextType>({
  locale: "ko",
  hasSelectedLocale: true,
  isInitialized: false,
  setLocale: () => { },
  t: translations.ko,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");
  const [hasSelectedLocale, setHasSelectedLocale] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale;
    if (saved === "ko" || saved === "en") {
      setLocaleState(saved);
      setHasSelectedLocale(true);
    }
    setIsInitialized(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setHasSelectedLocale(true);
    localStorage.setItem("locale", newLocale);
  };

  const t = translations[locale] as any;

  return (
    <I18nContext.Provider value={{ locale, hasSelectedLocale, isInitialized, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

// --- [추가] 활동 권역 리스트 ---
export const regionOptions = [
  { value: "GLOBAL", ko: "글로벌 전체 (Global)", en: "Global" },
  { value: "KOREA", ko: "대한민국 (South Korea)", en: "South Korea" },
  { value: "NORTH_AMERICA", ko: "북미 (North America)", en: "North America" },
  { value: "EUROPE", ko: "유럽 (Europe)", en: "Europe" },
  { value: "APAC", ko: "아시아 태평양 (APAC)", en: "Asia-Pacific (APAC)" },
  { value: "SEA", ko: "동남아시아 (South East Asia)", en: "South East Asia" },
  { value: "CHINA", ko: "중국 (China)", en: "China" },
  { value: "JAPAN", ko: "일본 (Japan)", en: "Japan" },
  { value: "MIDDLE_EAST", ko: "중동/아중동 (Middle East)", en: "Middle East" },
  { value: "LATIN_AMERICA", ko: "중남미 (Latin America)", en: "Latin America" },
];

// --- [추가] 산업 분야 리스트 ---
export const industryOptions = [
  { ko: "인공지능 (AI & Big Data)", en: "AI & Big Data" },
  { ko: "핀테크 (Fintech)", en: "Fintech" },
  { ko: "바이오/헬스케어 (Bio & Healthcare)", en: "Bio & Healthcare" },
  { ko: "이커머스/물류 (E-commerce & Logistics)", en: "E-commerce & Logistics" },
  { ko: "에듀테크 (Edtech)", en: "Edtech" },
  { ko: "모빌리티/자율주행 (Mobility & Auto)", en: "Mobility & Autonomous Driving" },
  { ko: "프롭테크/부동산 (Proptech)", en: "Proptech & Real Estate" },
  { ko: "SaaS/B2B 솔루션 (SaaS & B2B)", en: "SaaS & B2B Solutions" },
  { ko: "ESG/클린테크 (ESG & Cleantech)", en: "ESG & Cleantech" },
  { ko: "로보틱스/딥테크 (Robotics & Deeptech)", en: "Robotics & Deeptech" },
  { ko: "콘텐츠/엔터테인먼트 (Content & Entertainment)", en: "Content & Entertainment" },
  { ko: "기타 (Others)", en: "Others" },
];

// --- [추가] 회원 유형 리스트 ---
export const userTypeOptions = {
  ko: ["VC", "AC", "바이어", "스타트업", "기타"],
  en: ["VC", "AC", "Buyer", "Startup", "Other"],
};