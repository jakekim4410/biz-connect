"use client";
import AiSearchResultCard from "@/components/AiSearchResultCard";
import { useI18n, industryOptions, regionOptions } from "@/lib/i18n";
import { isCompanyMatch } from "@/lib/matchUtils";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  handleStatusAction,
  requestLocationChange,
  createSlotAction,
  updateSlotAction,
  deleteSlotAction,
  handleMemberStatus,
  transferMasterRole,
  acceptDirectMeetingAction,
  rejectDirectMeetingAction,
  applyToSellerSlotAction,
  sendDirectMeetingToSellerAction
} from "./actions";
import { updateProfileAction } from "../profile/action";
import {
  MapPin, Clock, Plus, X, Phone, Download, Mail, FileText,
  Building2, Target, Lightbulb, TrendingUp, Briefcase, Sparkles, Search,
  BarChart3, ChevronRight, PieChart, UserCheck, Save, User as UserIcon, Calendar, Settings, Handshake, Globe, Award,
  CheckCircle2, AlertCircle, Info, Rocket, Bell, Check, XCircle, FileSearch, ArrowRight, Activity, Zap,
  Users, ShieldCheck, Edit2, Trash2, Inbox,
  LayoutList, LayoutGrid, ExternalLink, Video, MapPinned, Link as LinkIcon,
  Ban, MessageCircle, RefreshCw, ChevronDown, Filter, Smartphone
} from "lucide-react";
import * as XLSX from 'xlsx';
import React from "react";
import MeetingChat from "@/components/MeetingChat";


/** "에듀테크 (Edtech)" → "Edtech" (영문 모드일 때) */
const localizeIndustry = (raw: string | undefined, isEn: boolean): string => {
  if (!raw) return isEn ? "N/A" : "미지정";
  if (!isEn) return raw;
  const match = industryOptions.find(opt => opt.ko === raw);
  return match ? match.en : raw;
};

/** URL 정규화: http/https 없으면 https:// 자동 추가 */
const normalizeUrl = (url: string): string => {
  if (!url || !url.trim()) return url;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

// ─── 상수: 추후 공지 placeholder 값 ───
const TBA_VALUE = "__TBA__";

export default function BuyerClient({
  mySlots = [],
  confirmedMeetings = [],
  directRequests = [],
  rejectedMeetings = [],
  allSellers = [],
  buyerId,
  user,
  pendingMembers = [],
  approvedMembers = [],
  rejectedTeamMembers = [],
  availableSellerSlots = [],
}: any) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'directory';

  const [isPending, setIsPending] = useState(false);
  const [processingMemberId, setProcessingMemberId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("ALL");
  const [selectedOnePager, setSelectedOnePager] = useState<any>(null);

  const [reservationFilter, setReservationFilter] = useState<'PENDING' | 'MATCHED' | 'EXPIRED' | 'ALL'>('PENDING');
  const [confirmedFilter, setConfirmedFilter] = useState<'ALL' | 'UPCOMING' | 'PAST'>('UPCOMING');
  const [reviewingMeeting, setReviewingMeeting] = useState<{ slot: any, meeting: any } | null>(null);
  const [editingSlot, setEditingSlot] = useState<any>(null);

  const [confirmedViewMode, setConfirmedViewMode] = useState<'table' | 'card'>('table');
  const [reservationViewMode, setReservationViewMode] = useState<'table' | 'card'>('table');
  const [directoryViewMode, setDirectoryViewMode] = useState<'table' | 'card'>('card'); // 기본 카드뷰
  const [rejectedViewMode, setRejectedViewMode] = useState<'table' | 'card'>('table'); // 기본 테이블뷰

  const [counts, setCounts] = useState({ sellers: 0, confirmed: 0, requests: 0, direct: 0, rejected: 0 });
  const [alerts, setAlerts] = useState({ directory: false, confirmed: false, pending: false, direct: false, rejected: false });
  const [seenCounts, setSeenCounts] = useState({ rejected: 0 });

  const [editSelectedType, setEditSelectedType] = useState(
    ["VC", "AC", "바이어", "스타트업", "기타"].includes(user?.userType) ? user?.userType : (user?.userType ? "기타" : "VC")
  );
  const [editUserTypeDetail, setEditUserTypeDetail] = useState(
    !["VC", "AC", "바이어", "스타트업"].includes(user?.userType) && user?.userType ? user.userType : ""
  );
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editPhone, setEditPhone] = useState(user?.phone || "");

  // [CHANGE 4] LinkedIn URL 정규화를 위한 state
  const [editLinkedinUrl, setEditLinkedinUrl] = useState(user?.linkedinUrl || "");

  // AI 검색 state
  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiIsFallback, setAiIsFallback] = useState(false);
  const [aiSearched, setAiSearched] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // ── 슬롯 생성: 온라인/오프라인 선택 state ──
  const [createMeetingType, setCreateMeetingType] = useState<'offline' | 'online'>('offline');
  const [createLocationValue, setCreateLocationValue] = useState("");
  // ── 슬롯 생성: 온라인 링크 TBA 선택 state (신규) ──
  const [createLinkTba, setCreateLinkTba] = useState(false);
  // ── 슬롯 생성: 추가 안내사항 state (신규) ──
  const [createNote, setCreateNote] = useState("");

  // 다이렉트 미팅 수락 모달 state
  const [acceptingDirect, setAcceptingDirect] = useState<any>(null);
  const [acceptMappingSlotId, setAcceptMappingSlotId] = useState<string>("");
  const [selectedChatMeeting, setSelectedChatMeeting] = useState<any>(null);

  // 셀러 슬롯 탐색 및 신청 state
  const [sellerSlotFilter, setSellerSlotFilter] = useState<'ALL' | 'AVAILABLE'>('AVAILABLE');
  const [applyingToSellerSlot, setApplyingToSellerSlot] = useState<any>(null);
  const [applyingToDirectSeller, setApplyingToDirectSeller] = useState<any>(null);
  const [sellerProposal, setSellerProposal] = useState("");

  // ── 슬롯 수정: 온라인/오프라인 선택 state ──
  const [editMeetingType, setEditMeetingType] = useState<'offline' | 'online'>('offline');
  const [editLocationValue, setEditLocationValue] = useState("");
  // ── 슬롯 수정: 온라인 링크 TBA 선택 state (신규) ──
  const [editLinkTba, setEditLinkTba] = useState(false);
  // ── 새로운 메시지 알림 state ──
  const [unreadMeetings, setUnreadMeetings] = useState<number[]>([]);

  // ─── 핵심 알림 로직: API 응답 + localStorage lastRead 비교 ───────────────
  // MeetingChat이 열리면 localStorage.setItem(`lastRead_${user?.id}_${id}`, Date.now())을 저장함
  // 여기서는 상대방 메시지의 timestamp > lastRead 이면 unread로 판정
  const checkNewMessages = async () => {
    try {
      const res = await fetch('/api/meetings/new-messages');
      if (res.ok) {
        const data = await res.json();
        const meetings: { meetingId: number; lastMessageAt: number }[] = data.meetings || [];

        const unreadIds = meetings
          .filter(item => {
            const lastRead = parseInt(
              localStorage.getItem(`lastRead_${user?.id}_${item.meetingId}`) || '0',
              10
            );
            // 상대방 메시지 시간이 마지막 읽은 시간보다 나중이면 unread
            return item.lastMessageAt > lastRead;
          })
          .map(item => item.meetingId);

        setUnreadMeetings(unreadIds);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    checkNewMessages();
    const interval = setInterval(checkNewMessages, 10000); // 10초마다 폴링
    const handleMessagesRead = () => checkNewMessages();
    const handleUnreadUpdate = () => checkNewMessages();
    window.addEventListener('messagesRead', handleMessagesRead);
    window.addEventListener('unreadUpdate', handleUnreadUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('messagesRead', handleMessagesRead);
      window.removeEventListener('unreadUpdate', handleUnreadUpdate);
    };
  }, [mounted]);

  // ── 슬롯 수정: 추가 안내사항 state (신규) ──
  const [editNote, setEditNote] = useState("");

  const isEn = locale === "en";

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    let formatted = value;
    if (value.length <= 3) formatted = value;
    else if (value.length <= 7) formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    else formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    setEditPhone(formatted);
  };

  // [CHANGE 4] LinkedIn URL 입력 핸들러: 포커스 아웃 시 https:// 자동 추가
  const handleLinkedinBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    if (val && !/^https?:\/\//i.test(val)) {
      setEditLinkedinUrl(`https://${val}`);
    }
  };

  const totalPendingRequests = useMemo(() => {
    return mySlots?.reduce((acc: number, slot: any) => {
      return acc + slot.meetings.filter((m: any) => m.status === 'PENDING').length;
    }, 0) || 0;
  }, [mySlots]);

  const todayString = useMemo(() => {
    const offset = new Date().getTimezoneOffset() * 60000;
    const dateOffset = new Date(Date.now() - offset);
    return dateOffset.toISOString().split("T")[0];
  }, []);

  const formatDateWithDay = (dateString: string) => {
    const d = new Date(dateString);
    const dateLocale = locale === "ko" ? 'ko-KR' : 'en-US';
    const datePart = d.toLocaleDateString(dateLocale, { year: 'numeric', month: 'numeric', day: 'numeric' });
    const dayPart = d.toLocaleDateString(dateLocale, { weekday: 'short' });
    return `${datePart} (${dayPart})`;
  };

  const formatTime24And12 = (dateString: string) => {
    const d = new Date(dateString);
    const dateLocale = locale === "ko" ? 'ko-KR' : 'en-US';
    const time24 = d.toLocaleTimeString(dateLocale, { hour12: false, hour: '2-digit', minute: '2-digit' });
    const time12 = d.toLocaleTimeString(dateLocale, { hour12: true, hour: '2-digit', minute: '2-digit' });
    return `${time24} (${time12})`;
  };

  // ── 팀 관리: 승인된 멤버 정렬 (마스터 먼저, 이후 가입순) ──
  const sortedApprovedMembers = useMemo(() => {
    if (!approvedMembers) return [];
    return [...approvedMembers].sort((a: any, b: any) => {
      const isMasterA = a.id === user?.id;
      const isMasterB = b.id === user?.id;
      if (isMasterA && !isMasterB) return -1;
      if (!isMasterA && isMasterB) return 1;
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });
  }, [approvedMembers, user?.id]);

  useEffect(() => {
    setMounted(true);
    const upcomingConfirmed = confirmedMeetings?.filter((m: any) => {
      const start = new Date(m.timeSlot.startTime);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return start >= today;
    }).length || 0;

    setCounts({
      sellers: allSellers?.length || 0,
      confirmed: upcomingConfirmed,
      requests: mySlots?.reduce((acc: number, slot: any) => acc + (slot.meetings?.length || 0), 0) || 0,
      direct: directRequests?.length || 0,
      rejected: rejectedMeetings?.length || 0
    });

    if (user?.id) {
      setSeenCounts({
        rejected: parseInt(localStorage.getItem(`seen_rejected_${user.id}`) || '0', 10)
      });
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const currentSellers = allSellers?.length || 0;
    const currentConfirmed = confirmedMeetings?.length || 0;
    const currentRequests = mySlots?.reduce((acc: number, slot: any) => acc + (slot.meetings?.length || 0), 0) || 0;
    const currentDirect = directRequests?.length || 0;
    const currentRejected = rejectedMeetings?.length || 0;

    setAlerts(prev => ({
      directory: prev.directory || currentSellers > counts.sellers,
      confirmed: prev.confirmed || currentConfirmed > counts.confirmed,
      pending: prev.pending || currentRequests > counts.requests,
      direct: prev.direct || currentDirect > counts.direct,
      rejected: prev.rejected || currentRejected > counts.rejected
    }));
    setCounts({ 
      sellers: currentSellers, 
      confirmed: currentConfirmed, 
      requests: currentRequests, 
      direct: currentDirect,
      rejected: currentRejected 
    });
  }, [allSellers, confirmedMeetings, mySlots, directRequests, rejectedMeetings]);

  // [ADD] 탭 확장 시 알림 동기화 로직
  useEffect(() => {
    if (!mounted || !user?.id) return;
    if (expandedSection === 'rejected') {
      const currentCount = rejectedMeetings?.length || 0;
      if (seenCounts.rejected !== currentCount) {
        setSeenCounts(prev => ({ ...prev, rejected: currentCount }));
        localStorage.setItem(`seen_rejected_${user.id}`, currentCount.toString());
      }
    }
  }, [expandedSection, rejectedMeetings?.length, mounted, user?.id]);

  // editingSlot이 열릴 때 미팅 타입 / 장소값 / TBA / note 초기화
  useEffect(() => {
    if (!editingSlot) return;
    const loc = editingSlot.location || "";
    const isTba = loc === TBA_VALUE;
    const isOnline = isTba || /^https?:\/\//i.test(loc) || /^www\./i.test(loc) || loc.includes("zoom") || loc.includes("meet.") || loc.includes("teams");
    setEditMeetingType(isOnline ? 'online' : 'offline');
    setEditLinkTba(isTba);
    setEditLocationValue(isTba ? "" : loc);
    setEditNote(editingSlot.note || "");
  }, [editingSlot]);

  // 다이렉트 미팅 제안 매핑 확정 핸들러
  const handleConfirmDirectMapping = async () => {
    if (!acceptingDirect || !acceptMappingSlotId) return;
    setIsPending(true);
    let targetSlotId = parseInt(acceptMappingSlotId, 10);

    try {
      const res = await acceptDirectMeetingAction(acceptingDirect.id, targetSlotId);
      if (res.error) {
        alert(res.error);
      } else {
        alert(isEn ? "Direct meeting accepted and scheduled successfully." : "다이렉트 미팅 제안이 스케줄에 수락 및 매핑되었습니다.");
        setAcceptingDirect(null);
        setAcceptMappingSlotId("");
      }
    } catch (e) {
      alert("Error processing your request.");
    } finally {
      setIsPending(false);
    }
  };

  const handleTabClick = (id: string) => {
    setExpandedSection(id);
    if ((alerts as any)[id]) {
      setAlerts(prev => ({ ...prev, [id]: false }));
    }
  };

  const uniqueSellers = useMemo(() => {
    const map = new Map();
    allSellers.forEach((s: any) => {
      const compName = (s.companyName || s.onePager?.companyNameKr || s.id).trim().toLowerCase();
      if (!map.has(compName)) {
        map.set(compName, { ...s, members: [s] });
      } else {
        const existing = map.get(compName);
        existing.members.push(s);
      }
    });
    return Array.from(map.values());
  }, [allSellers]);

  const stats = useMemo(() => {
    const industries: any = {};
    const stages: any = {};
    uniqueSellers.forEach((s: any) => {
      const ind = s.onePager?.industrySector || "N/A";
      const stg = s.onePager?.investmentStage || "TBD";
      industries[ind] = (industries[ind] || 0) + 1;
      stages[stg] = (stages[stg] || 0) + 1;
    });
    return { industries, stages };
  }, [uniqueSellers]);

  const filteredSellers = useMemo(() => {
    return uniqueSellers.filter((s: any) => {
      const searchTarget = (
        (s.companyName || "") +
        (s.onePager?.companyNameKr || "") +
        (s.onePager?.companyNameEn || "") +
        (s.onePager?.productType || "") +
        (s.onePager?.industrySector || "")
      ).toLowerCase();
      const matchesSearch = searchTarget.includes(searchTerm.toLowerCase());
      const matchesIndustry = industryFilter === "ALL" || s.onePager?.industrySector === industryFilter;
      return matchesSearch && matchesIndustry;
    });
  }, [searchTerm, industryFilter, uniqueSellers]);

  const filteredReservations = useMemo(() => {
    if (!mySlots) return [];
    return reservationFilter === 'ALL' ? mySlots :
      reservationFilter === 'PENDING' ? mySlots.filter((s: any) => s.status === 'OPEN' && new Date(s.startTime) > new Date()) :
      reservationFilter === 'MATCHED' ? mySlots.filter((s: any) => s.status === 'CLOSED') :
      reservationFilter === 'EXPIRED' ? mySlots.filter((s: any) => s.status === 'OPEN' && new Date(s.startTime) <= new Date()) :
      mySlots;
  }, [reservationFilter, mySlots]);

  const displayConfirmedMeetings = useMemo(() => {
    if (!confirmedMeetings) return [];
    const now = new Date();
    const processed = confirmedMeetings
      .filter((m: any) => m.status === 'CONFIRMED' || m.status === 'ACCEPTED') // 확정/승인만 포함
      .map((m: any) => ({
        ...m,
        isPast: new Date(m.timeSlot.startTime) < now
      })).filter((m: any) => {
        if (confirmedFilter === 'UPCOMING') return !m.isPast;
        if (confirmedFilter === 'PAST') return m.isPast;
        return true;
      });
    return processed.sort((a: any, b: any) => {
      const timeA = new Date(a.timeSlot.startTime).getTime();
      const timeB = new Date(b.timeSlot.startTime).getTime();
      return confirmedFilter === 'PAST' ? timeB - timeA : timeA - timeB;
    });
  }, [confirmedMeetings, confirmedFilter]);

  // ── 거절 내역 (REJECTED) 데이터 필터링 ──
  // 서버에서 props로 "rejectedMeetings"가 이미 들어옴

  if (!mounted || !user) return null;

  // ─── locale별 셀러 표시 데이터 헬퍼 ───
  const getSellerDisplay = (seller: any) => {
    const o = seller.onePager;
    return {
      companyName: isEn ? (o?.companyNameEn || seller.companyNameEn || seller.companyName) : seller.companyName,
      companyNameSub: isEn ? seller.companyName : (o?.companyNameEn || seller.companyNameEn || "N/A"),
      industry: localizeIndustry(o?.industrySector, isEn),
      stage: o?.investmentStage || (isEn ? "TBD" : "미정"),
      ceoLabel: isEn ? (o?.ceoNameEn || o?.ceoName || "-") : (o?.ceoName || "-"),
      summary: o?.solutionSummary || "",
      picName: isEn
        ? (o?.picNameEn || o?.picName || seller.nameEn || seller.name)
        : (o?.picName || seller.name),
    };
  };

  // ─── 다운로드: industry도 locale 적용 ───
  const downloadSellerList = () => {
    const data = uniqueSellers.map((s: any) => {
      const o = s.onePager;
      return {
        [isEn ? "Company (KR)" : "업체명 (한글)"]: s.companyName || "-",
        [isEn ? "Company (EN)" : "업체명 (영문)"]: o?.companyNameEn || s.companyNameEn || "-",
        [isEn ? "Industry" : "산업분야"]: localizeIndustry(o?.industrySector, isEn) || "-",
        [isEn ? "Investment Stage" : "투자단계"]: o?.investmentStage || "-",
        [isEn ? "Year Founded" : "설립연도"]: o?.yearFounded || "-",
        [isEn ? "CEO (KR)" : "대표자 (한글)"]: o?.ceoName || "-",
        [isEn ? "CEO (EN)" : "대표자 (영문)"]: o?.ceoNameEn || "-",
        [isEn ? "Primary Tech" : "핵심기술"]: o?.primaryTech || "-",
        [isEn ? "Product / Service" : "주요제품/서비스"]: o?.productType || "-",
        [isEn ? "Solution Summary" : "솔루션 요약"]: o?.solutionSummary || "-",
        [isEn ? "Problem" : "시장 문제점"]: o?.problem || "-",
        [isEn ? "Solution" : "해결 방안"]: o?.solution || "-",
        [isEn ? "Traction" : "성과 지표"]: o?.traction || "-",
        [isEn ? "Business Model" : "비즈니스 모델"]: o?.bizModel || "-",
        [isEn ? "Monthly Revenue" : "월 매출 수준"]: o?.monthlyRevenue || "-",
        [isEn ? "Team Size" : "등록 멤버 수"]: s.members.length,
        [isEn ? "PIC Name (KR)" : "담당자명 (한글)"]: o?.picName || s.name || "-",
        [isEn ? "PIC Name (EN)" : "담당자명 (영문)"]: o?.picNameEn || s.nameEn || "-",
        [isEn ? "PIC Title (KR)" : "담당자 직함 (한글)"]: o?.picTitle || s.jobTitle || "-",
        [isEn ? "PIC Title (EN)" : "담당자 직함 (영문)"]: o?.picTitleEn || s.jobTitleEn || "-",
        [isEn ? "Contact Email" : "담당자 이메일"]: o?.contactEmail || s.email || "-",
        [isEn ? "Phone" : "담당자 연락처"]: s.phone || "-",
        [isEn ? "LinkedIn" : "LinkedIn"]: o?.linkedinUrl || s.linkedinUrl || "-",
        [isEn ? "Pitch Deck" : "피치덱 URL"]: o?.pitchDeckUrl || "-",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Company_Database");
    XLSX.writeFile(wb, `Company_Database_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const downloadConfirmedMeetings = () => {
    const data = confirmedMeetings.map((m: any) => {
      const meetingDate = new Date(m.timeSlot.startTime);
      return {
        [isEn ? "Meeting Date" : "미팅 일자 (Meeting Date)"]: meetingDate.toLocaleDateString(isEn ? 'en-US' : 'ko-KR'),
        [isEn ? "Meeting Time" : "미팅 시간 (Meeting Time)"]: meetingDate.toLocaleTimeString(isEn ? 'en-US' : 'ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        [isEn ? "Status" : "상태 (Status)"]: meetingDate < new Date() ? (isEn ? "Completed" : "종료됨 (Completed)") : (isEn ? "Upcoming" : "예정됨 (Upcoming)"),
        [isEn ? "Location" : "장소 (Location)"]: m.location || (isEn ? "TBD" : "미지정 (TBD)"),
        [isEn ? "Company Name" : "업체명 (Company Name)"]: isEn ? (m.seller.companyNameEn || m.seller.companyName) : m.seller.companyName,
        [isEn ? "PIC Name" : "담당자명 (PIC Name)"]: isEn ? (m.seller.nameEn || m.seller.name) : m.seller.name,
        [isEn ? "Job Title" : "담당자 직함 (Job Title)"]: isEn ? (m.seller.jobTitleEn || m.seller.jobTitle || "-") : (m.seller.jobTitle || "-"),
        [isEn ? "Email" : "담당자 이메일 (Email)"]: m.seller.email,
        [isEn ? "Phone" : "담당자 연락처 (Phone)"]: m.seller.phone || "-",
        [isEn ? "Industry Sector" : "산업분야 (Industry Sector)"]: localizeIndustry(m.seller.onePager?.industrySector, isEn) || "-",
        [isEn ? "Investment Stage" : "투자단계 (Investment Stage)"]: m.seller.onePager?.investmentStage || "-",
        [isEn ? "Product/Service" : "주요제품/서비스 (Product/Service)"]: m.seller.onePager?.productType || "-",
        [isEn ? "Solution Summary" : "솔루션 요약 (Solution Summary)"]: m.seller.onePager?.solutionSummary || "-",
        [isEn ? "Website" : "홈페이지 (Website)"]: m.seller.onePager?.websiteUrl || "-"
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    const wscols = [{ wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 30 }];
    ws['!cols'] = wscols;
    XLSX.utils.book_append_sheet(wb, ws, "Confirmed_Meetings");
    XLSX.writeFile(wb, `My_Confirmed_Meetings_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const res = await updateProfileAction(new FormData(e.currentTarget));
    setIsPending(false);
    if (res.success) {
      alert(isEn ? "✅ All profile info updated." : "✅ 모든 정보가 성공적으로 업데이트되었습니다.");
      setEditPassword("");
      setEditConfirmPassword("");
    } else {
      alert(res.error || (isEn ? "Error occurred." : "수정 중 오류가 발생했습니다."));
    }
  };

  const onCreate = async (formData: FormData) => {
    const date = formData.get("date") as string;
    const hour = formData.get("hour") as string;
    const minute = formData.get("minute") as string;
    const selectedDateTime = new Date(`${date}T${hour}:${minute}:00`);
    if (selectedDateTime < new Date()) {
      alert(isEn ? "🚨 You cannot create slots in the past." : "🚨 과거 시간으로는 슬롯을 생성할 수 없습니다. 현재 시간 이후를 선택해주세요.");
      return;
    }
    // ── 온라인 TBA 처리 (신규) ──
    if (createMeetingType === 'online') {
      if (createLinkTba) {
        formData.set("location", TBA_VALUE);
      } else {
        const rawLocation = formData.get("location") as string;
        formData.set("location", normalizeUrl(rawLocation));
      }
    }
    if (!confirm(isEn ? "Create new slot at the selected time?" : "선택한 시간에 새로운 상담 슬롯을 생성하시겠습니까?")) return;
    setIsPending(true);
    try {
      const result = await createSlotAction(formData, buyerId);
      if (!result?.success) {
        alert(`🚨 ${result?.error || (isEn ? "Failed to create slot." : "슬롯 생성에 실패했습니다.")}`);
        return;
      }
      handleTabClick('pending');
      setCreateMeetingType('offline');
      setCreateLocationValue("");
      setCreateLinkTba(false);
      setCreateNote("");
      alert(isEn ? "New slot created successfully." : "신규 슬롯이 생성되었습니다.");
      router.refresh();
    } finally { setIsPending(false); }
  };

  const handleUpdateSlot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get("date") as string;
    const hour = formData.get("hour") as string;
    const minute = formData.get("minute") as string;
    const selectedDateTime = new Date(`${date}T${hour}:${minute}:00`);
    if (selectedDateTime < new Date()) {
      alert(isEn ? "🚨 Cannot update to past time." : "🚨 과거 시간으로 수정할 수 없습니다.");
      return;
    }
    // ── 온라인 TBA 처리 (신규) ──
    if (editMeetingType === 'online') {
      if (editLinkTba) {
        formData.set("location", TBA_VALUE);
      } else {
        const rawLocation = formData.get("location") as string;
        formData.set("location", normalizeUrl(rawLocation));
      }
    }
    if (!confirm(isEn ? "Update this reservation?" : "해당 예약을 수정하시겠습니까?")) return;
    setIsPending(true);
    try {
      const result = await updateSlotAction(editingSlot.id, formData);
      if (!result?.success) {
        alert(`🚨 ${result?.error || (isEn ? "Failed to update slot." : "슬롯 수정에 실패했습니다.")}`);
        return;
      }
      setEditingSlot(null);
      alert(isEn ? "Updated successfully." : "예약이 성공적으로 수정되었습니다.");
      router.refresh();
    } catch (error) {
      alert("Error.");
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!confirm(isEn ? "Cancel this reservation? Pending requests will be automatically rejected." : "🚨 정말 이 예약을 취소하시겠습니까?\n대기 중인 신청 건이 있다면 모두 자동 거절 처리됩니다.")) return;
    setIsPending(true);
    try {
      await deleteSlotAction(slotId, locale);
      alert(isEn ? "Reservation cancelled." : "예약이 취소되었습니다.");
      router.refresh();
    } catch (error) {
      alert("Error.");
    } finally {
      setIsPending(false);
    }
  };

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResults([]);
    setAiError(null);
    setAiIsFallback(false);
    setAiSearched(true);
    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery, searchRole: "SELLER" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Error.");
        return;
      }
      setAiResults(data.results || []);
      setAiIsFallback(data.isFallback || false);
    } catch (e) {
      setAiError("Network error.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleApproveMatch = async (slot: any, meeting: any) => {
    if (!confirm(isEn
      ? `Confirm meeting with ${meeting.seller.companyNameEn || meeting.seller.companyName}?`
      : `${meeting.seller.companyName} 기업의 ${meeting.seller.name}님과 미팅을 최종 확정하시겠습니까?`
    )) return;
    setIsPending(true);
    try {
      await handleStatusAction(Number(meeting.id), Number(slot.id), 'ACCEPT', '', locale);
      setReviewingMeeting(null);
      router.refresh();
    } catch (error) {
      alert("Error.");
    } finally {
      setIsPending(false);
    }
  };

  const handleRejectMatch = async (meeting: any) => {
    const defaultReason = isEn ? "Currently not aligned with our business direction." : "현재 당사의 비즈니스 방향성과 맞지 않아 부득이하게 거절하게 되었습니다.";
    const userReason = prompt(isEn ? "Please enter a rejection reason." : "거절 사유를 입력해주세요.", defaultReason);
    if (userReason === null) return;
    setIsPending(true);
    try {
      const slotId = reviewingMeeting?.slot?.id;
      await handleStatusAction(Number(meeting.id), Number(slotId), 'REJECT', userReason, locale);
      setReviewingMeeting(null);
      router.refresh();
    } catch (error) {
      alert("Error.");
    } finally {
      setIsPending(false);
    }
  };

  const handleRejectDirect = async (req: any) => {
    const defaultReason = isEn ? "Currently not aligned with our business direction." : "현재 당사의 비즈니스 방향성과 맞지 않아 부득이하게 거절하게 되었습니다.";
    const userReason = prompt(isEn ? "Please enter a rejection reason." : "거절 사유를 입력해주세요.", defaultReason);
    if (userReason === null) return;
    setIsPending(true);
    try {
      await rejectDirectMeetingAction(Number(req.id), userReason, locale);
      alert(isEn ? "Proposal rejected." : "제안이 정중히 거절되었습니다.");
      router.refresh();
    } catch (error) {
      alert("Error.");
    } finally {
      setIsPending(false);
    }
  };

  // 바이어가 셀러 슬롯에 신청
  const handleApplyToSellerSlot = async () => {
    if (!applyingToSellerSlot) return;
    if (!confirm(isEn ? "Apply to this slot?" : "해당 시간에 미팅을 신청하시겠습니까?")) return;
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.set("slotId", String(applyingToSellerSlot.id));
      formData.set("sellerId", String(applyingToSellerSlot.sellerId));
      formData.set("proposal", sellerProposal);
      const res = await applyToSellerSlotAction(formData, buyerId);
      if (res?.error) {
        alert(res.error);
      } else {
        alert(isEn ? "Application submitted." : "미팅 신청이 완료되었습니다.");
        setApplyingToSellerSlot(null);
        setSellerProposal("");
        router.refresh();
      }
    } catch { alert("Error."); } finally { setIsPending(false); }
  };

  // 바이어가 셀러에게 다이렉트 제안
  const handleSendDirectToSeller = async () => {
    if (!applyingToDirectSeller) return;
    if (!confirm(isEn ? "Send direct proposal?" : "해당 기업에게 다이렉트 미팅을 제안하시겠습니까?")) return;
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.set("sellerId", String(applyingToDirectSeller.id));
      // 슬롯을 명시하지 않으면 actions 안에서 DIRECT_REQUEST로 처리
      formData.set("slotId", "-1");
      formData.set("proposal", sellerProposal);
      const res = await applyToSellerSlotAction(formData, buyerId);
      if (res?.error) {
        alert(res.error);
      } else {
        alert(isEn ? "Proposal sent." : "미팅 제안이 전송되었습니다.");
        setApplyingToDirectSeller(null);
        setSellerProposal("");
        router.refresh();
      }
    } catch { alert("Error."); } finally { setIsPending(false); }
  };

  // ─── 뷰 토글 컴포넌트 ───
  const ViewToggle = ({
    mode,
    setMode,
    tableLabel,
    cardLabel,
    iconOnly = false
  }: {
    mode: 'table' | 'card',
    setMode: (m: 'table' | 'card') => void,
    tableLabel?: string,
    cardLabel?: string,
    iconOnly?: boolean
  }) => (
    <div className="flex bg-slate-100 p-1 rounded-[12px] shadow-inner shrink-0 scale-90 sm:scale-100 origin-right transition-all">
      <button
        type="button"
        onClick={() => setMode('table')}
        title={tableLabel || (isEn ? "Table View" : "테이블 뷰")}
        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] transition-all ${mode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <LayoutList size={16} /> {!iconOnly && <span className="hidden md:inline text-[11px] font-black">{tableLabel || (isEn ? "Table" : "표")}</span>}
      </button>
      <button
        type="button"
        onClick={() => setMode('card')}
        title={cardLabel || (isEn ? "Card View" : "카드 뷰")}
        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] transition-all ${mode === 'card' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <LayoutGrid size={16} /> {!iconOnly && <span className="hidden md:inline text-[11px] font-black">{cardLabel || (isEn ? "Card" : "카드")}</span>}
      </button>
    </div>
  );

  // ─── 미팅 타입 토글 컴포넌트 (슬롯 생성/수정 공통) ───
  const MeetingTypeToggle = ({
    meetingType,
    setMeetingType,
    disabled = false,
  }: {
    meetingType: 'offline' | 'online';
    setMeetingType: (t: 'offline' | 'online') => void;
    disabled?: boolean;
  }) => (
    <div className={`flex bg-slate-100 p-1 rounded-[16px] shadow-inner w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <button
        type="button"
        onClick={() => setMeetingType('offline')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] text-xs font-black transition-all ${meetingType === 'offline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <MapPinned size={14} className={meetingType === 'offline' ? 'text-indigo-500' : ''} />
        {isEn ? "Offline (In-person)" : "오프라인 (대면)"}
      </button>
      <button
        type="button"
        onClick={() => setMeetingType('online')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] text-xs font-black transition-all ${meetingType === 'online' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <Video size={14} className={meetingType === 'online' ? 'text-emerald-500' : ''} />
        {isEn ? "Online (Video)" : "온라인 (화상)"}
      </button>
    </div>
  );

  // ─── [CHANGE 1] 필수 표시: 빨간 점 컴포넌트 (REQUIRED 뱃지 대체) ───
  const RequiredDot = () => (
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 ml-1.5 mb-0.5 shrink-0" aria-label="required" />
  );

  // ─── [CHANGE 1] 이전 RequiredBadge / OptionalBadge 제거 → 하위 호환을 위해 빈 컴포넌트로 유지하지 않고 모두 RequiredDot으로 교체
  // OptionalBadge는 완전히 제거 (렌더링하지 않음)
  const OptionalBadge = () => null;

  // ── 각 섹션별 unread 카운트 계산 (내비게이션 배지는 채팅 메시지만 반영)
  const buyerUnreadCounts = {
    directory: alerts.directory ? 1 : 0,
    direct: directRequests.filter((r: any) => unreadMeetings.includes(r.id)).length,
    pending: mySlots.reduce((acc: number, s: any) =>
      acc + s.meetings.filter((m: any) => m.status !== 'REJECTED' && unreadMeetings.includes(m.id)).length, 0),
    confirmed: confirmedMeetings.filter((m: any) => m.status === 'CONFIRMED' && unreadMeetings.includes(m.id)).length,
    rejected: Math.max(0, (rejectedMeetings?.length || 0) - seenCounts.rejected),
  };

  const toAlertCount = (n: number) => n <= 0 ? null : n > 99 ? '99+' : String(n);

  const navItems: any[] = [
    {
      id: 'directory', label: t.buyer.nav.directory, sub: 'SEARCH', icon: <Search size={22} />,
      alertCount: toAlertCount(buyerUnreadCounts.directory), count: uniqueSellers.length
    },
    {
      id: 'pending',
      label: t.buyer.nav.pending,
      sub: 'STATUS',
      icon: <Clock size={22} />,
      alertCount: toAlertCount(buyerUnreadCounts.pending),
      count: totalPendingRequests > 0 ? totalPendingRequests : null
    },
    {
      id: 'confirmed',
      label: t.buyer.nav.confirmed,
      sub: 'LIST',
      icon: <Handshake size={22} />,
      alertCount: toAlertCount(buyerUnreadCounts.confirmed),
      count: displayConfirmedMeetings.length
    },
    {
      id: 'rejected',
      label: isEn ? "Rejected" : "거절 내역",
      sub: 'REJECTED',
      icon: <Ban size={22} />,
      alertCount: toAlertCount(buyerUnreadCounts.rejected),
      count: rejectedMeetings.length > 0 ? rejectedMeetings.length : null
    },
    { id: 'available-seller-slots', label: isEn ? "Seller Slots" : "셀러 오픈 슬롯", sub: 'SLOTS', icon: <Calendar size={22} />, alertCount: null, count: availableSellerSlots.length > 0 ? availableSellerSlots.length : null },
    { id: 'direct', label: isEn ? "Proposals" : "받은 제안", sub: 'DIRECT', icon: <Sparkles size={22} />, alertCount: toAlertCount(buyerUnreadCounts.direct), count: directRequests?.length > 0 ? directRequests.length : null },
    { id: 'generator', label: t.buyer.nav.generator, sub: 'CREATE', icon: <Plus size={22} />, alertCount: null, count: null },
    { id: 'analytics', label: t.buyer.nav.analytics, sub: 'INSIGHT', icon: <BarChart3 size={22} />, alertCount: null, count: null },
    { id: 'profile', label: t.buyer.nav.profile, sub: 'PROFILE', icon: <Settings size={22} />, alertCount: null, count: null },
  ];

  // ── 마스터인 경우에만 팀 관리 메뉴 추가 ──
  if (user.isMaster) {
    navItems.push({
      id: 'team',
      label: isEn ? "Team" : "팀 관리",
      sub: 'TEAM',
      icon: <ShieldCheck size={22} />,
      alertCount: pendingMembers.length > 0 ? String(pendingMembers.length) : null,
      count: pendingMembers.length > 0 ? pendingMembers.length : null,
    });
  }

  const aiAvgScore = aiResults.length > 0
    ? Math.round(aiResults.reduce((s: number, r: any) => s + (r.matchScore ?? 0), 0) / aiResults.length)
    : 0;

  return (
    <div className={`w-full max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-8 space-y-3 md:space-y-8 pb-6 md:pb-20 font-pretendard text-[#121926] text-left relative ${isPending ? 'opacity-50 pointer-events-none transition-opacity' : ''}`}>

      {/* ── 대기 중 알림 배너 ── */}
      {totalPendingRequests > 0 && expandedSection !== 'pending' && (
        <div className="bg-white rounded-[20px] md:rounded-[32px] p-4 md:p-8 shadow-lg border border-indigo-100 relative overflow-hidden animate-in fade-in slide-in-from-top-2 w-full">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                <Activity size={18} className="animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-sm md:text-base text-slate-800 leading-tight truncate">
                  {isEn ? (
                    <><span className="text-indigo-600">{totalPendingRequests}</span> requests pending</>
                  ) : (
                    <><span className="text-indigo-600">{totalPendingRequests}건</span> 미팅 요청 대기 중</>
                  )}
                </p>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5 hidden sm:block">
                  {isEn ? "Review incoming meeting requests" : "미팅 요청을 검토하고 매칭을 확정하세요"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setExpandedSection('pending')}
              className="shrink-0 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-[14px] text-xs font-black hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 active:scale-95"
            >
              <FileSearch size={14} />
              <span>{isEn ? "Review" : "검토하기"}</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── 팀원 합류 대기 알림 배너 (마스터 전용) ── */}
      {user.isMaster && pendingMembers.length > 0 && expandedSection !== 'team' && (
        <div className="bg-indigo-600 text-white px-4 py-3 md:px-6 md:py-4 rounded-[18px] shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top-2 w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0"><Users size={15} /></div>
            <span className="font-bold text-xs leading-snug">
              {isEn
                ? <><span className="font-black">{pendingMembers.length}</span> member{pendingMembers.length > 1 ? 's' : ''} awaiting</>
                : <><span className="font-black">{pendingMembers.length}명</span> 승인 대기 중</>
              }
            </span>
          </div>
          <button
            onClick={() => setExpandedSection('team')}
            className="shrink-0 bg-white text-indigo-600 px-4 py-2 rounded-[12px] text-xs font-black hover:bg-indigo-50 transition-colors whitespace-nowrap"
          >
            {isEn ? "Review" : "승인하기"}
          </button>
        </div>
      )}

      {/* ── 네비게이션 헤더 (상단 고정) ── */}
      <header className="bg-white/95 backdrop-blur-2xl border-b border-slate-100 shadow-sm sticky top-0 z-40 w-full overflow-hidden">
        <div className="flex flex-row overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:justify-center md:gap-8 md:py-3 md:px-6 w-full px-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`relative flex flex-col items-center gap-1.5 shrink-0 w-[25%] sm:w-[20%] md:flex-1 md:w-auto py-3 px-1 md:px-1 md:py-3 transition-all duration-200`}
            >
              <div className={`relative w-12 h-12 md:w-16 md:h-16 rounded-[14px] md:rounded-[20px] flex items-center justify-center transition-all duration-200 ${expandedSection === item.id
                ? 'bg-slate-900 text-white shadow-md shadow-slate-200 scale-105'
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}>
                {item.alertCount && (
                  <span className={`absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-rose-500 text-white border-2 border-white z-10 shadow font-black leading-none ${(item.alertCount as string).length > 1 ? 'h-5 min-w-[20px] px-1.5 text-[9px] md:h-6 md:min-w-[24px] md:text-[10px]' : 'h-5 w-5 text-[10px] md:h-6 md:w-6 md:text-[12px]'
                    }`}>
                    {item.alertCount}
                  </span>
                )}
                <span className="[&>svg]:w-[20px] [&>svg]:h-[20px] md:[&>svg]:w-[28px] md:[&>svg]:h-[28px]">
                  {item.icon}
                </span>
              </div>
              <div className="text-center mt-1">
                <span className={`text-[11px] md:text-[14px] font-black block leading-tight ${expandedSection === item.id ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                  {item.label}
                </span>
                {item.count !== null && (
                  <span className={`text-[10px] md:text-[11px] font-black block mt-0.5 ${expandedSection === item.id ? 'text-indigo-500' : 'text-slate-300'
                    }`}>
                    {item.count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="min-h-[600px]">

        {/* ── [A] 셀러 탐색 ── */}
        {expandedSection === 'directory' && (
          <section className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-2">

            {/* 헤더 */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">{t.buyer.directory.title}</h2>
                <p className="text-xs text-slate-400 font-bold uppercase mt-0.5 tracking-widest">
                  {filteredSellers.length} {t.buyer.directory.companiesFound}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ViewToggle
                  mode={directoryViewMode}
                  setMode={setDirectoryViewMode}
                  tableLabel={isEn ? "Table" : "표"}
                  cardLabel={isEn ? "Card" : "카드형"}
                />
                <button onClick={downloadSellerList} className="w-10 h-10 bg-slate-900 text-white rounded-[14px] flex items-center justify-center shadow-md hover:bg-indigo-600 transition-colors active:scale-95" title={t.buyer.directory.downloadBtn}>
                  <Download size={16} />
                </button>
              </div>
            </div>

            {/* 검색 모드 토글 */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => setAiSearchMode(false)}
                className={`px-4 py-2.5 rounded-[12px] text-xs font-black transition-all ${!aiSearchMode ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
              >
                {t.buyer.directory.keywordSearch}
              </button>
              <button
                onClick={() => setAiSearchMode(true)}
                className={`px-4 py-2.5 rounded-[12px] text-xs font-black transition-all flex items-center gap-1.5 ${aiSearchMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
              >
                <Sparkles size={13} /> {t.buyer.directory.aiSearch}
              </button>
            </div>

            {/* 검색창 */}
            {!aiSearchMode ? (
              <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[30px] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-3 md:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t.buyer.directory.searchPlaceholder}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[18px] text-sm font-bold outline-none transition-all"
                  />
                </div>
                <div className="relative w-full md:w-64 group">
                  <select
                    value={industryFilter}
                    onChange={e => setIndustryFilter(e.target.value)}
                    className="w-full h-full px-5 py-4 pr-12 bg-slate-50 border border-slate-100 md:border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[18px] text-sm font-bold text-slate-600 outline-none appearance-none transition-all cursor-pointer group-hover:bg-slate-100"
                  >
                    <option value="ALL">{t.buyer.directory.allIndustries}</option>
                    {Object.keys(stats.industries).map(ind => (
                      <option key={ind} value={ind}>{localizeIndustry(ind, isEn)}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
                    <ChevronDown size={20} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[30px] shadow-sm border border-indigo-100 flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Sparkles className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                    <input
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                      placeholder={t.buyer.directory.aiPlaceholder}
                      className="w-full pl-12 pr-5 py-4 bg-indigo-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[18px] text-sm font-bold outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={handleAiSearch}
                    disabled={aiLoading || !aiQuery.trim()}
                    className="px-5 md:px-6 py-4 bg-indigo-600 text-white rounded-[18px] font-black text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-lg shadow-indigo-200"
                  >
                    {aiLoading ? <Clock className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    <span className="hidden md:inline">{aiLoading ? t.buyer.directory.analyzing : t.buyer.directory.aiSearchBtn}</span>
                  </button>
                </div>
                <p className="text-[11px] text-indigo-400 font-bold pl-1">{t.buyer.directory.aiHint}</p>
              </div>
            )}

            {/* AI 로딩 UI */}
            {aiSearchMode && aiLoading && (
              <div className="bg-white rounded-[24px] p-10 flex flex-col items-center gap-5 border border-indigo-100 shadow-sm">
                <div className="relative">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                    <Sparkles size={28} className="text-indigo-500 animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-black text-slate-700">{t.buyer.directory.analyzing}</p>
                  <p className="text-xs text-slate-400 font-bold">{isEn ? 'Combining database & web search insights' : 'DB 데이터 + 웹 검색을 종합하고 있어요'}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  {(isEn
                    ? ["DB Analysis", "Web Search", "Calculating Match Score"]
                    : ["DB 분석", "웹 검색", "매칭 스코어 계산"]
                  ).map((step, i) => (
                    <span key={step} className="px-3 py-1.5 bg-indigo-50 text-indigo-400 text-[10px] font-black rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {aiSearchMode && !aiLoading && aiSearched && (
              <AiSearchResultCard
                results={aiResults}
                query={aiQuery}
                isFallback={aiIsFallback}
                error={aiError}
                locale={locale}
                isMatched={(companyName) =>
                  uniqueSellers.some((s: any) =>
                    isCompanyMatch(s.companyName || "", companyName) ||
                    isCompanyMatch(s.onePager?.companyNameKr || "", companyName) ||
                    isCompanyMatch(s.onePager?.companyNameEn || "", companyName)
                  )
                }
                onViewOnePager={(companyName) => {
                  const matched = uniqueSellers.find((s: any) =>
                    isCompanyMatch(s.companyName || "", companyName) ||
                    isCompanyMatch(s.onePager?.companyNameKr || "", companyName)
                  );
                  if (matched) setSelectedOnePager({ ...matched.onePager, user: matched, members: matched.members });
                }}
              />
            )}

            {/* 셀러 리스트 */}
            {!aiSearchMode && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">

                {/* ──── 카드 뷰 (디렉토리) ──── */}
                {directoryViewMode === 'card' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredSellers.map((seller: any) => {
                      const d = getSellerDisplay(seller);
                      return (
                        <div
                          key={seller.id}
                          onClick={() => setSelectedOnePager({ ...seller.onePager, user: seller, members: seller.members })}
                          className="bg-white rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col overflow-hidden"
                        >
                          <div className="p-6 border-b border-slate-50 bg-slate-50/20 group-hover:bg-indigo-50/30 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:bg-indigo-600 transition-colors">
                                  <Building2 size={24} />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-black text-base md:text-lg text-slate-800 truncate">{d.companyName}</h4>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate block mt-0.5">{d.companyNameSub}</span>
                                </div>
                              </div>
                              <span className="px-3 py-1 bg-white text-slate-600 border border-slate-100 rounded-lg text-[10px] font-black whitespace-nowrap shadow-sm group-hover:border-indigo-100 group-hover:text-indigo-600 transition-all">{d.stage}</span>
                            </div>
                            <div className="inline-flex px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100/50">
                              {d.industry}
                            </div>
                          </div>

                          <div className="p-6 flex-1 space-y-5">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[80px] flex items-center group-hover:bg-white transition-colors">
                              <p className="text-xs text-slate-600 font-bold leading-relaxed line-clamp-3 italic">
                                {d.summary ? `"${d.summary}"` : t.buyer.directory.noResults}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                              {seller.members.length > 1 && (
                                <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded-md text-[9px] font-bold border border-slate-100">
                                  {isEn ? "Team" : "팀원"} {seller.members.length}
                                </span>
                              )}
                              <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded-md text-[9px] font-bold border border-slate-100">
                                CEO: {d.ceoLabel}
                              </span>
                            </div>
                          </div>

                          <div className="px-6 pb-6 mt-auto">
                            <div className="flex justify-between items-center group-hover:translate-x-1 transition-transform">
                              <span className="text-slate-400 text-[11px] font-bold flex items-center gap-1">
                                <FileText size={14} className="text-slate-300" /> Explore Details
                              </span>
                              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg group-hover:bg-indigo-600 transition-all">
                                <ArrowRight size={18} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ──── 테이블 뷰 (디렉토리) ──── */}
                {directoryViewMode === 'table' && (
                  <div className="bg-white rounded-[24px] md:rounded-[30px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[950px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isEn ? "Company Name" : "회사명"}</th>
                            <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isEn ? "Industry Section" : "산업 분야"}</th>
                            <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isEn ? "Investment Stage" : "투자 단계"}</th>
                            <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">{isEn ? "Solution Summary" : "솔루션 요약"}</th>
                            <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">{isEn ? "Key Info" : "주요 정보"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSellers.map((seller: any) => {
                            const d = getSellerDisplay(seller);
                            return (
                              <tr
                                key={seller.id}
                                onClick={() => setSelectedOnePager({ ...seller.onePager, user: seller, members: seller.members })}
                                className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                              >
                                <td className="px-6 py-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 bg-slate-100 rounded-[14px] flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                                      <Building2 size={20} />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-black text-sm text-slate-800 truncate">{d.companyName}</h4>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate block mt-0.5">{d.companyNameSub}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-6">
                                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-black whitespace-nowrap tracking-tight uppercase">{d.industry}</span>
                                </td>
                                <td className="px-6 py-6">
                                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black whitespace-nowrap tracking-tight uppercase group-hover:bg-white transition-colors">{d.stage}</span>
                                </td>
                                <td className="px-6 py-6 max-w-[320px]">
                                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed line-clamp-2 italic">
                                      {d.summary ? `"${d.summary}"` : t.buyer.directory.noResults}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-6 py-6 text-right">
                                  <div className="flex items-center justify-end gap-5">
                                    <div className="text-right">
                                      <p className="text-[10px] font-black text-slate-800">{d.ceoLabel}</p>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">CEO</span>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 shadow-lg shadow-indigo-100">
                                      <ChevronRight size={18} />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {filteredSellers.length === 0 && (
                  <div className="bg-white rounded-[32px] py-20 text-center border-2 border-dashed border-slate-100 max-w-2xl mx-auto">
                    <Search size={40} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-black text-lg">{t.buyer.directory.noResults}</p>
                    <p className="text-slate-300 text-sm font-bold mt-2">Try adjusting your filters or search term</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── [C] 확정된 미팅 일정 ── */}
        {expandedSection === 'confirmed' && (
          <section className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-2">

            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">{t.buyer.confirmed.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-indigo-100">Confirmed</span>
                  <span className="text-xs text-slate-400 font-bold">{displayConfirmedMeetings.length} {t.buyer.confirmed.countSuffix}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ViewToggle mode={confirmedViewMode} setMode={setConfirmedViewMode} />
                <button
                  onClick={downloadConfirmedMeetings}
                  className="w-10 h-10 bg-slate-900 text-white rounded-[14px] flex items-center justify-center shadow-md hover:bg-indigo-600 transition-all active:scale-95"
                  title={`${t.buyer.confirmed.downloadBtn} (EXCEL)`}
                >
                  <Download size={16} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-lg shadow-slate-100 border border-slate-100 overflow-hidden">
              {/* 상단 탭 필터 */}
              <div className="px-4 py-3 md:px-6 md:py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                  {["UPCOMING", "PAST", "ALL"].map(f => (
                    <button
                      key={f}
                      onClick={() => setConfirmedFilter(f as any)}
                      className={`px-3 md:px-5 py-2 rounded-[10px] text-[11px] font-black transition-all whitespace-nowrap ${confirmedFilter === f ? "bg-slate-900 text-white shadow" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      {f === "UPCOMING" ? (isEn ? "Upcoming" : "예정") : f === "PAST" ? (isEn ? "Past" : "지난") : (isEn ? "All" : "전체")}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-slate-400 hidden sm:block">
                  {isEn ? "By time" : "시간순"}
                </span>
              </div>

              {displayConfirmedMeetings.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center text-center px-10">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 border border-slate-100"><Handshake size={40} /></div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">{t.buyer.confirmed.noMeetings}</h3>
                  <p className="text-sm text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">{t.buyer.confirmed.noMeetingsDesc}</p>
                </div>
              ) : confirmedViewMode === 'table' ? (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isEn ? "Status" : "상태"}</th>
                        <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isEn ? "Meeting Date" : "미팅 일시"}</th>
                        <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isEn ? "Location" : "장소"}</th>
                        <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isEn ? "PIC" : "담당자"}</th>
                        <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isEn ? "Partner" : "파트너 정보"}</th>
                        <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">{isEn ? "Chat" : "채팅기능"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {displayConfirmedMeetings.map((m: any) => {
                        const d = getSellerDisplay(m.seller);
                        const isMine = m.timeSlot.buyerId === buyerId;
                        return (
                          <tr key={m.id} className={`transition-all duration-200 ${m.isPast ? 'opacity-50 grayscale-[0.5]' : 'hover:bg-indigo-50/30'}`}>
                            <td className="px-6 py-6">
                              <span className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${m.isPast ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-600 text-white border-emerald-700'}`}>
                                {m.isPast ? (isEn ? "Completed" : "종료") : (isEn ? "Upcoming" : "예정")}
                              </span>
                            </td>
                            <td className="px-6 py-6 font-black text-slate-800">
                              <div>{formatDateWithDay(m.timeSlot.startTime)}</div>
                              <div className="text-indigo-600 mt-0.5">{formatTime24And12(m.timeSlot.startTime)}</div>
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex items-center gap-1.5 text-xs font-black text-slate-600">
                                <MapPin size={14} className="text-rose-400 shrink-0" />
                                <span className="truncate max-w-[150px]">{m.location === TBA_VALUE ? (isEn ? "TBD" : "추후 공지") : (m.location || "TBA")}</span>
                              </div>
                            </td>
                            <td className="px-6 py-6 font-sans">
                              {m.pic ? (
                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                                  <UserIcon size={12} className="inline mr-1" /> {isEn ? (m.pic.nameEn || m.pic.name) : m.pic.name}
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-slate-300 italic uppercase">{isEn ? "UNKNOWN" : "미지정"}</span>
                              )}
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-md transition-colors group-hover:bg-indigo-600">S</div>
                                <div className="min-w-0">
                                  <p className="font-black text-sm text-slate-900 truncate">{d.companyName}</p>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{d.picName} · {d.industry}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6 text-right">
                              {(isMine || user.isMaster) && (
                                <button
                                  onClick={() => setSelectedChatMeeting(m)}
                                  className={`relative p-2.5 rounded-xl transition-all shadow-sm active:scale-95 ${unreadMeetings.includes(m.id) ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200'}`}
                                >
                                  <MessageCircle size={18} />
                                  {unreadMeetings.includes(m.id) && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-black rounded-full border-2 border-white flex items-center justify-center">N</span>}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:p-8">
                  {displayConfirmedMeetings.map((m: any) => {
                    const d = getSellerDisplay(m.seller);
                    const hasNew = unreadMeetings.includes(m.id);
                    const isMine = m.timeSlot.buyerId === buyerId;
                    return (
                      <div key={m.id} className={`bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all overflow-hidden group flex flex-col ${m.isPast ? 'opacity-60 grayscale-[0.3]' : ''}`}>
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-start">
                          <div className="space-y-1">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${m.isPast ? 'bg-slate-200 text-slate-500 border-slate-300' : 'bg-emerald-500 text-white border-emerald-600'}`}>
                              {m.isPast ? "PAST" : "UPCOMING"}
                            </span>
                            <p className="text-lg font-black text-slate-800 mt-2">{formatDateWithDay(m.timeSlot.startTime)}</p>
                            <p className="text-sm font-black text-indigo-600">{formatTime24And12(m.timeSlot.startTime)}</p>
                          </div>
                          {isMine && (
                            <button onClick={() => setSelectedChatMeeting(m)} className={`relative p-3 rounded-xl transition-all ${hasNew ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white border border-slate-100 text-slate-400 hover:text-indigo-600'}`}>
                              <MessageCircle size={20} />
                              {hasNew && <span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span></span>}
                            </button>
                          )}
                        </div>
                        <div className="p-7 space-y-5 flex-1">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:bg-indigo-600 transition-colors"><Building2 size={24} /></div>
                              <div className="min-w-0">
                                <h4 className="font-black text-base text-slate-800 truncate">{d.companyName}</h4>
                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">{d.picName} · {d.industry}</p>
                              </div>
                            </div>
                            {m.pic && (
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50/50 w-fit px-2.5 py-1 rounded-lg border border-indigo-100/50">
                                <UserIcon size={12} className="text-indigo-400" />
                                {isEn ? "Meeting PIC:" : "미팅 담당자:"} {isEn ? (m.pic.nameEn || m.pic.name) : m.pic.name}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                            <MapPin size={16} className="text-indigo-500 shrink-0" />
                            <span className="text-xs font-black text-slate-600 truncate">{m.location === TBA_VALUE ? "TBA" : (m.location || "TBA")}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── [D] 거절 내역 ── */}
        {expandedSection === 'rejected' && (
          <section className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">{t.buyer.rejected.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-rose-100">Rejected</span>
                  <span className="text-xs text-slate-400 font-bold">{rejectedMeetings.length} {t.buyer.rejected.countSuffix}</span>
                </div>
              </div>
              <ViewToggle mode={rejectedViewMode} setMode={setRejectedViewMode} iconOnly={true} />
            </div>

            <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-lg shadow-slate-100 border border-slate-100 overflow-hidden">
              {rejectedMeetings.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center text-center px-10">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 border border-slate-100"><Ban size={40} /></div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">{t.buyer.rejected.noMeetings}</h3>
                  <p className="text-sm text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">{t.buyer.rejected.noMeetingsDesc}</p>
                </div>
              ) : rejectedViewMode === 'table' ? (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[950px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isEn ? "Partner" : "협력사 정보"}</th>
                        <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isEn ? "Proposed Slot" : "신청 일정"}</th>
                        <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isEn ? "Location" : "신청 장소"}</th>
                        <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isEn ? "PIC" : "거절 담당자"}</th>
                        <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">{isEn ? "Rejection Reason" : "거절 사유/설명"}</th>
                        <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">{isEn ? "Action" : "상세"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rejectedMeetings.map((m: any) => {
                        const d = getSellerDisplay(m.seller);
                        const hasNew = unreadMeetings.includes(m.id);
                        const isMine = m.timeSlot?.buyerId === buyerId;
                        return (
                          <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border border-rose-100">S</div>
                                <div className="min-w-0">
                                  <p className="font-black text-sm text-slate-800 truncate">{d.companyName}</p>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{d.picName} · {d.industry}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <div className="text-[13px] font-black text-slate-700">{formatDateWithDay(m.timeSlot?.startTime)}</div>
                              <div className="text-[11px] font-bold text-slate-400 mt-0.5">{formatTime24And12(m.timeSlot?.startTime)}</div>
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                <MapPin size={12} className="text-slate-300" />
                                {m.location === TBA_VALUE ? "TBA" : (m.location || "TBA")}
                              </div>
                            </td>
                            <td className="px-6 py-6 font-sans">
                              {m.pic ? (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                                  <UserIcon size={12} className="inline mr-1" /> {isEn ? (m.pic.nameEn || m.pic.name) : m.pic.name}
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-slate-200 italic uppercase">{isEn ? "UNKNOWN" : "미지정"}</span>
                              )}
                            </td>
                            <td className="px-6 py-6">
                              <p className="text-xs text-slate-400 font-bold leading-relaxed line-clamp-2 max-w-md italic">
                                "{m.rejectionReason || (isEn ? "No specific reason provided." : "별도의 거절 사유가 제공되지 않았습니다.")}"
                              </p>
                            </td>
                            <td className="px-6 py-6 text-right">
                              {(isMine || user.isMaster) && (
                                <button onClick={() => setSelectedChatMeeting(m)} className={`p-2.5 rounded-xl transition-all relative ${hasNew ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                                  <MessageCircle size={18} />
                                  {hasNew && <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white"></span>}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:p-8 font-sans">
                  {rejectedMeetings.map((m: any) => {
                    const d = getSellerDisplay(m.seller);
                    const hasNew = unreadMeetings.includes(m.id);
                    const isMine = m.timeSlot?.buyerId === buyerId;
                    return (
                      <div key={m.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden group flex flex-col">
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-start">
                          <div className="space-y-1">
                            <span className="px-3 py-1 bg-rose-50 text-rose-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-100">REJECTED</span>
                            <p className="text-lg font-black text-slate-800 mt-2">{formatDateWithDay(m.timeSlot?.startTime)}</p>
                            <p className="text-sm font-bold text-slate-400">{m.timeSlot?.startTime ? formatTime24And12(m.timeSlot.startTime) : 'N/A'}</p>
                          </div>
                          {(isMine || user.isMaster) && (
                            <button onClick={() => setSelectedChatMeeting(m)} className={`relative p-3 rounded-xl transition-all ${hasNew ? 'bg-rose-500 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400'}`}>
                              <MessageCircle size={20} />
                              {hasNew && <span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span></span>}
                            </button>
                          )}
                        </div>
                        <div className="p-7 space-y-5 flex-1">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors"><Building2 size={24} /></div>
                              <div className="min-w-0">
                                <h4 className="font-black text-base text-slate-800 truncate">{d.companyName}</h4>
                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">{d.picName} · {d.industry}</p>
                              </div>
                            </div>
                            {m.pic && (
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-600 bg-rose-50 w-fit px-2.5 py-1 rounded-lg border border-rose-100/50">
                                <UserIcon size={12} className="text-rose-400" />
                                {isEn ? "Rejected by:" : "거절 담당자:"} {isEn ? (m.pic.nameEn || m.pic.name) : m.pic.name}
                              </div>
                            )}
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                            <p className="text-[11px] font-bold text-slate-400 leading-relaxed italic">
                              "{m.rejectionReason || (isEn ? "No specific reason provided." : "별도의 거절 사유가 제공되지 않았습니다.")}"
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── [E] 오픈된 셀러 슬롯 탐색 및 신청 ── */}
        {expandedSection === 'available-seller-slots' && (
          <section className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">
                  {isEn ? "Available Seller Slots" : "오픈된 상주 셀러 슬롯"}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400 font-bold">
                    {isEn ? "Apply to open meeting times provided by sellers." : "셀러가 개설한 빈 시간에 미팅을 신청하세요."}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-lg shadow-slate-100 border border-slate-100 p-4 md:p-6">
              {availableSellerSlots.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <Calendar size={40} className="text-slate-200 mb-4" />
                  <p className="text-lg font-black text-slate-800">{isEn ? "No available slots" : "현재 신청할 수 있는 셀러 슬롯이 없습니다."}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableSellerSlots.map((slot: any) => (
                    <div key={slot.id} className="bg-slate-50 border border-slate-100 rounded-[20px] p-5 hover:border-indigo-200 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg shrink-0 border border-indigo-200">
                          {(slot.seller?.companyName || "S").charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-base text-slate-800 truncate">{slot.seller?.companyName}</p>
                          <p className="text-[11px] text-slate-400 font-bold truncate mt-0.5">{slot.seller?.name}</p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4 bg-white p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                          <Calendar size={14} className="text-slate-400" />
                          <span>{formatDateWithDay(slot.startTime)} {formatTime24And12(slot.startTime)}</span>
                        </div>
                        {slot.location && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <MapPin size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">{slot.location === TBA_VALUE ? 'TBA' : slot.location}</span>
                          </div>
                        )}
                        {slot.description && (
                          <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic mt-1 line-clamp-2">
                            "{slot.description}"
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setApplyingToSellerSlot(slot); setSellerProposal(""); }}
                        className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black hover:bg-indigo-600 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Handshake size={14} /> {isEn ? "Apply for Meeting" : "이 시간에 미팅 신청하기"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── [B] 신청 현황 (Status) ── */}
        {expandedSection === 'pending' && (
          <section className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">{t.buyer.pending.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-indigo-100">Status</span>
                  <span className="text-xs text-slate-400 font-bold">{filteredReservations.length} {isEn ? "Slots" : "슬롯"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0 shrink-0">
                <div className="flex bg-slate-100 p-1 rounded-[12px] shadow-inner shrink-0">
                  {['PENDING', 'MATCHED', 'EXPIRED', 'ALL'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setReservationFilter(f as any)}
                      className={`px-3 py-1.5 rounded-[9px] text-[10px] font-black transition-all whitespace-nowrap ${reservationFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                        }`}
                    >
                      {f === 'PENDING' ? (isEn ? 'Open' : '진행중') : f === 'MATCHED' ? (isEn ? 'Matched' : '매칭됨') : f === 'EXPIRED' ? (isEn ? 'Expired' : '만료됨') : (isEn ? 'All' : '전체')}
                    </button>
                  ))}
                </div>
                <ViewToggle mode={reservationViewMode} setMode={setReservationViewMode} iconOnly={true} />
              </div>
            </div>

            {filteredReservations.length === 0 ? (
              <div className="py-20 md:py-32 bg-white rounded-[40px] border border-dashed border-slate-200 flex flex-col items-center justify-center gap-5 md:gap-7 animate-in fade-in zoom-in duration-700 font-sans">
                <div className="w-20 md:w-28 h-20 md:h-28 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner group">
                  <Inbox size={40} className="text-slate-200 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg md:text-xl font-black text-slate-800">{t.buyer.pending.noReservations}</p>
                  <p className="text-xs md:text-sm text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">
                    {isEn ? "Create a new meeting slot to receive requests from sellers." : "새 미팅 슬롯을 생성하여 셀러로부터 미팅 신청을 받아보세요."}
                  </p>
                </div>
                <button onClick={() => setExpandedSection('generator')} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[12px] font-black hover:bg-indigo-600 shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center gap-2">
                  <Plus size={18} /> {t.buyer.generator.title}
                </button>
              </div>
            ) : reservationViewMode === 'table' ? (
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
                <div className="overflow-x-auto font-sans">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left w-24 whitespace-nowrap">Slot Status</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left w-48 whitespace-nowrap">Date & Time</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left w-32 whitespace-nowrap">{isEn ? "PIC" : "담당자"}</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left whitespace-nowrap">Location</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left whitespace-nowrap">Request Info</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32 whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReservations.map((slot: any) => {
                        const isMine = slot.buyerId === buyerId;
                        const activeRequests = slot.meetings.filter((m: any) => m.status !== 'REJECTED' || m.rejectionReason === 'EXPIRED_SCHEDULE');
                        const isSlotExpired = slot.status === 'OPEN' && new Date(slot.startTime) <= new Date();

                        if (activeRequests.length === 0) {
                          return (
                            <tr key={slot.id} className={`hover:bg-slate-50 transition-colors group ${isSlotExpired ? 'grayscale opacity-60 bg-slate-50/50' : ''} ${!isMine ? 'border-l-4 border-slate-200 bg-slate-50/30' : ''}`}>
                              <td className="px-6 py-6 font-sans">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${slot.status === 'CLOSED' ? 'bg-indigo-100 text-indigo-700' : isSlotExpired ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {slot.status === 'CLOSED' ? (isEn ? 'MATCHED' : '매칭됨') : isSlotExpired ? (isEn ? 'EXPIRED' : '만료됨') : (isEn ? 'OPEN' : '진행중')}
                                </span>
                              </td>
                              <td className="px-6 py-6 font-sans">
                                <div className="space-y-1">
                                  <p className="text-sm font-black text-slate-800 break-keep leading-tight">{formatDateWithDay(slot.startTime)}</p>
                                  <p className="text-[11px] font-bold text-indigo-500 leading-none">{formatTime24And12(slot.startTime)}</p>
                                </div>
                              </td>
                              <td className="px-6 py-6 font-sans">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${isMine ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'}`}>
                                    {isMine ? (isEn ? "ME" : "본인") : (isEn ? `BY ${slot.buyer?.name}` : `${slot.buyer?.name}`)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-6 font-sans">
                                {slot.location === TBA_VALUE ? (
                                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5 whitespace-nowrap"><Clock size={13} /> {isEn ? "Link TBA" : "링크 추후 공지"}</span>
                                ) : /^https?:\/\//i.test(slot.location || '') ? (
                                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><Video size={13} /> {isEn ? "Online" : "온라인"}</span>
                                ) : (
                                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><MapPin size={13} className="text-rose-400" /> {slot.location || t.buyer.confirmed.location}</span>
                                )}
                              </td>
                              <td className="px-6 py-6 font-sans">
                                <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5 italic opacity-70">
                                  <Inbox size={14} /> {t.buyer.pending.noRequests}
                                </span>
                              </td>
                              <td className="px-6 py-6 text-center font-sans">
                                {slot.status === 'OPEN' && isMine ? (
                                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingSlot(slot)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDeleteSlot(slot.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                                  </div>
                                ) : !isMine ? (
                                  <span className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest whitespace-nowrap">{isEn ? "READ ONLY" : "수정 제한"}</span>
                                ) : null}
                              </td>
                            </tr>
                          );
                        }

                        return activeRequests.map((m: any, idx: number) => {
                          const isMatched = m.status === 'CONFIRMED';
                          const hasNew = unreadMeetings.includes(m.id);
                          return (
                            <tr key={m.id} className={`hover:bg-slate-50/80 transition-colors group ${isSlotExpired ? 'grayscale opacity-60 bg-slate-50/50' : ''} ${!isMine ? 'border-l-4 border-slate-200' : ''}`}>
                              {idx === 0 && (
                                <>
                                  <td className="px-6 py-6 font-sans" rowSpan={activeRequests.length}>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${slot.status === 'CLOSED' ? 'bg-indigo-100 text-indigo-700' : isSlotExpired ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                      {slot.status === 'CLOSED' ? (isEn ? 'MATCHED' : '매칭됨') : isSlotExpired ? (isEn ? 'EXPIRED' : '만료됨') : (isEn ? 'OPEN' : '진행중')}
                                    </span>
                                  </td>
                                  <td className="px-6 py-6 font-sans" rowSpan={activeRequests.length}>
                                    <div className="space-y-1">
                                      <p className="text-sm font-black text-slate-800 break-keep leading-tight">{formatDateWithDay(slot.startTime)}</p>
                                      <p className="text-[11px] font-bold text-indigo-500 leading-none">{formatTime24And12(slot.startTime)}</p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-6 font-sans" rowSpan={activeRequests.length}>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${isMine ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'}`}>
                                        {isMine ? (isEn ? "ME" : "본인") : (isEn ? `BY ${slot.buyer?.name}` : `${slot.buyer?.name}`)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-6 font-sans" rowSpan={activeRequests.length}>
                                    {slot.location === TBA_VALUE ? (
                                      <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5 whitespace-nowrap"><Clock size={13} /> {isEn ? "Link TBA" : "링크 추후 공지"}</span>
                                    ) : /^https?:\/\//i.test(slot.location || '') ? (
                                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><Video size={13} /> {isEn ? "Online" : "온라인"}</span>
                                    ) : (
                                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><MapPin size={13} className="text-rose-400" /> {slot.location || t.buyer.confirmed.location}</span>
                                    )}
                                  </td>
                                </>
                              )}
                              <td className="px-6 py-6 font-sans">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center shrink-0 border border-slate-200/50"><Building2 size={16} /></div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-slate-700 truncate">{isEn ? (m.seller.companyNameEn || m.seller.companyName) : m.seller.companyName}</p>
                                        {isMatched && <span className="text-[8px] px-1.5 py-0.5 bg-emerald-600 text-white font-black rounded uppercase tracking-tighter shrink-0 pt-[2px]">{isEn ? 'MATCHED' : '매칭됨'}</span>}
                                      </div>
                                      <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{isEn ? (m.seller.nameEn || m.seller.name) : m.seller.name}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {slot.status !== 'CLOSED' && (
                                      <button onClick={() => setReviewingMeeting({ slot, meeting: m })} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black hover:bg-indigo-600 transition-all active:scale-95 pt-[6px]">
                                        {t.buyer.pending.detailReview}
                                      </button>
                                    )}
                                    {(isMine || user.isMaster) && (
                                      <button onClick={() => setSelectedChatMeeting(m)} className={`relative p-2 rounded-lg transition-all ${hasNew ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                                        <MessageCircle size={16} />
                                        {hasNew && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span></span>}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6 text-center font-sans">
                                {idx === 0 && (
                                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isMine ? (
                                      <>
                                        <button onClick={() => setEditingSlot(slot)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteSlot(slot.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                                      </>
                                    ) : (
                                      <span className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest whitespace-nowrap">{isEn ? "READ ONLY" : "수정 제한"}</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 font-sans">
                {filteredReservations.map((slot: any) => {
                  const isMine = slot.buyerId === buyerId;
                  const isSlotExpired = slot.status === 'OPEN' && new Date(slot.startTime) <= new Date();
                  const activeRequests = slot.meetings.filter((m: any) => m.status !== 'REJECTED' || m.rejectionReason === 'EXPIRED_SCHEDULE');

                  return (
                    <div key={slot.id} className={`group bg-white rounded-[32px] border transition-all duration-500 flex flex-col overflow-hidden hover:shadow-2xl hover:shadow-indigo-100/50 ${isSlotExpired ? 'grayscale opacity-60 bg-slate-50/50' : 'hover:border-indigo-200'} ${!isMine ? 'border-l-8 border-slate-100 bg-slate-50/30' : 'border-slate-100'}`}>
                      <div className="flex flex-col items-start p-7 md:p-8 gap-5 border-b border-slate-50 group-hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between w-full">
                           <div className={`p-4 rounded-2xl shadow-sm transition-transform duration-500 group-hover:scale-110 ${slot.status === 'CLOSED' ? 'bg-indigo-600 text-white shadow-indigo-200' : isSlotExpired ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-600'}`}>
                             <Calendar size={28} />
                           </div>
                           <div className="flex flex-col items-end gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${slot.status === 'CLOSED' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : isSlotExpired ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {slot.status === 'CLOSED' ? (isEn ? 'MATCHED' : '매칭됨') : isSlotExpired ? (isEn ? 'EXPIRED' : '만료됨') : (isEn ? 'OPEN' : '진행중')}
                              </span>
                              {!isMine ? (
                                <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                                  <UserIcon size={12} className="inline mr-1" /> {isEn ? `BY ${slot.buyer?.name}` : `${slot.buyer?.name} 담당`}
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                  {isEn ? "MY SLOT" : "내 슬롯"}
                                </span>
                              )}
                           </div>
                        </div>

                        <div className="w-full">
                          <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight break-keep leading-tight font-sans">{formatDateWithDay(slot.startTime)}</h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3">
                            <div className="flex items-center gap-1.5 text-indigo-600 font-black text-sm sm:text-base leading-none">
                              <Clock size={16} className="text-indigo-400 shrink-0" />
                              <span className="whitespace-nowrap">{formatTime24And12(slot.startTime)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] sm:text-xs sm:border-l sm:border-slate-200 sm:pl-4 leading-none text-sans">
                              <MapPin size={14} className="text-rose-400 shrink-0" />
                              <span className="truncate">{slot.location === TBA_VALUE ? (isEn ? "Link TBA" : "링크 추후 공지") : (slot.location || t.buyer.confirmed.location)}</span>
                            </div>
                          </div>
                        </div>

                        {slot.status === 'OPEN' && (
                          <div className="flex items-center gap-2 w-full mt-2">
                            {isMine ? (
                              <>
                                <button onClick={() => setEditingSlot(slot)} className="flex-1 py-3 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all gap-2 text-[11px] font-black"><Edit2 size={16} /> {isEn ? "EDIT" : "수정"}</button>
                                <button onClick={() => handleDeleteSlot(slot.id)} className="flex-1 py-3 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all gap-2 text-[11px] font-black"><Trash2 size={16} /> {isEn ? "DEL" : "삭제"}</button>
                              </>
                            ) : (
                               <div className="w-full bg-slate-100/50 py-3 rounded-2xl border border-slate-100 flex items-center justify-center gap-2">
                                  <ShieldCheck size={16} className="text-slate-300" />
                                  <span className="text-[11px] font-black text-slate-400 uppercase italic tracking-wider">{isEn ? "READ ONLY" : "수정 제한"}</span>
                               </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-7 flex-1 space-y-5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Users size={14} className="text-indigo-400" />
                            {isEn ? "Applications" : "신청 기업 정보"}
                          </h4>
                        </div>

                        {activeRequests.length === 0 ? (
                          <div className="py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 group-hover:bg-white transition-colors">
                            <Inbox size={32} className="text-slate-200 mb-1" />
                            <p className="text-xs text-slate-400 font-black">{t.buyer.pending.noRequests}</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {activeRequests.map((m: any) => {
                              const isMatched = m.status === 'CONFIRMED';
                              const hasNew = unreadMeetings.includes(m.id);
                              return (
                                <div key={m.id} className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col gap-4 ${isMatched ? 'bg-emerald-50/50 border-emerald-100 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-xl'}`}>
                                  <div className="flex items-center gap-4 min-w-0 font-sans">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${isMatched ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-400 border-slate-50'}`}>
                                      <Building2 size={24} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-black text-slate-800 text-sm sm:text-base break-keep line-clamp-2 leading-tight">
                                          {isEn ? (m.seller.companyNameEn || m.seller.companyName) : m.seller.companyName}
                                        </p>
                                        {isMatched && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-600 text-white font-black rounded uppercase tracking-tighter shrink-0 pt-[2px]">{isEn ? 'MATCHED' : '매칭됨'}</span>}
                                      </div>
                                      <p className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                                        {localizeIndustry(m.seller.onePager?.industrySector, isEn) || "N/A"}
                                        <span className="text-slate-300">|</span>
                                        {isEn ? (m.seller.nameEn || m.seller.name) : m.seller.name}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {slot.status !== 'CLOSED' ? (
                                       <button onClick={() => setReviewingMeeting({ slot, meeting: m })} className="flex-1 sm:w-auto px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black hover:bg-indigo-600 shadow-md shadow-slate-200 transition-all active:scale-95 pt-[8px]">
                                          {t.buyer.pending.detailReview}
                                       </button>
                                    ) : isMatched ? (
                                      <div className="flex-1 sm:w-auto flex items-center justify-end">
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border border-emerald-600 shadow-lg shadow-emerald-100 antialiased pt-[6px]"><CheckCircle2 size={14} /> {isEn ? 'MATCHED' : '매칭됨'}</span>
                                      </div>
                                    ) : null}
                                    {(isMine || user.isMaster) && (
                                      <button onClick={() => setSelectedChatMeeting(m)} className={`relative p-2.5 rounded-xl transition-all shrink-0 ${hasNew ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                                        <MessageCircle size={18} />
                                        {hasNew && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span></span>}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── [D] 슬롯 생성 ── */}
        {expandedSection === 'generator' && (
          <section className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-5 md:p-10 rounded-[28px] md:rounded-[40px] shadow-lg border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 opacity-60"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-[18px] flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0"><Plus size={24} /></div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900">{t.buyer.generator.title}</h2>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">{t.buyer.generator.subtitle}</p>
                </div>
              </div>

              {/* [CHANGE 1] 필수/선택 범례: 빨간 점으로 교체, 설명 문구 제거 */}
              <div className="flex items-center gap-2 mb-6 px-1">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  {isEn ? "Required" : "필수 항목"}
                </span>
              </div>

              <form action={onCreate} className="space-y-5 md:space-y-6">
                {/* ── 날짜 (필수) ── */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1 flex items-center">
                    {t.buyer.generator.dateLabel}
                    <RequiredDot />
                  </label>
                  <input
                    name="date"
                    type="date"
                    required
                    min={todayString}
                    lang={isEn ? "en-US" : "ko-KR"}
                    className="w-full p-4 md:p-5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[20px] text-sm font-bold outline-none transition-all cursor-pointer"
                  />
                </div>

                {/* ── 시/분 (필수) ── */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1 flex items-center">
                      {t.buyer.generator.hourLabel}
                      <RequiredDot />
                    </label>
                    <select name="hour" className="w-full p-4 md:p-5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[20px] text-sm font-bold outline-none appearance-none transition-all cursor-pointer">
                      {Array.from({ length: 24 }).map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{i}{isEn ? "" : "시"}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1 flex items-center">
                      {t.buyer.generator.minuteLabel}
                      <RequiredDot />
                    </label>
                    <select name="minute" className="w-full p-4 md:p-5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[20px] text-sm font-bold outline-none appearance-none transition-all cursor-pointer">
                      <option value="00">00{isEn ? "" : "분"}</option><option value="30">30{isEn ? "" : "분"}</option>
                    </select>
                  </div>
                </div>

                {/* ── 미팅 방식 (필수) ── */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1 flex items-center">
                    {isEn ? "Meeting Type" : "미팅 방식"}
                    <RequiredDot />
                  </label>
                  <MeetingTypeToggle
                    meetingType={createMeetingType}
                    setMeetingType={(t) => {
                      setCreateMeetingType(t);
                      setCreateLinkTba(false);
                      setCreateLocationValue("");
                    }}
                  />
                </div>

                {/* ── 장소 / 링크 입력 ── */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1 flex items-center">
                    {createMeetingType === 'online'
                      ? <><Video size={12} className="mr-1" /> {isEn ? "Meeting Link (Zoom, Meet, etc.)" : "화상회의 링크 (Zoom, Meet 등)"}</>
                      : <><MapPinned size={12} className="mr-1" /> {t.buyer.generator.locationLabel}</>
                    }
                    <RequiredDot />
                  </label>

                  {createMeetingType === 'online' && (
                    <label className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-[14px] cursor-pointer hover:bg-amber-100 transition-colors group">
                      <div className="relative shrink-0">
                        <input
                          type="checkbox"
                          checked={createLinkTba}
                          onChange={(e) => {
                            setCreateLinkTba(e.target.checked);
                            if (e.target.checked) setCreateLocationValue("");
                          }}
                          className="sr-only"
                        />
                        <div className={`w-9 h-5 rounded-full transition-colors ${createLinkTba ? 'bg-amber-500' : 'bg-slate-300'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${createLinkTba ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-black text-amber-700">{isEn ? "Announce link later (TBA)" : "링크 추후 공지 예정"}</p>
                        <p className="text-[10px] font-bold text-amber-500 mt-0.5">{isEn ? "You can update the link later when confirmed." : "링크가 확정되면 나중에 수정할 수 있습니다."}</p>
                      </div>
                    </label>
                  )}

                  {!(createMeetingType === 'online' && createLinkTba) && (
                    <div className="relative">
                      <input
                        name="location"
                        required
                        value={createLocationValue}
                        onChange={e => setCreateLocationValue(e.target.value)}
                        placeholder={
                          createMeetingType === 'online'
                            ? (isEn ? "zoom.us/j/... or meet.google.com/..." : "zoom.us/j/... 또는 meet.google.com/...")
                            : t.buyer.generator.locationPlaceholder
                        }
                        className={`w-full pl-5 pr-5 p-4 md:p-5 bg-slate-50 border-transparent focus:bg-white focus:ring-2 rounded-[20px] text-sm font-bold outline-none transition-all ${createMeetingType === 'online'
                          ? 'focus:border-emerald-400 focus:ring-emerald-100 border border-emerald-100'
                          : 'focus:border-indigo-500 focus:ring-indigo-100'
                          }`}
                      />
                    </div>
                  )}

                  {createMeetingType === 'online' && createLinkTba && (
                    <input type="hidden" name="location" value={TBA_VALUE} />
                  )}

                  {createMeetingType === 'online' && !createLinkTba && createLocationValue && !/^https?:\/\//i.test(createLocationValue) && (
                    <p className="text-[11px] text-emerald-500 font-bold ml-1 flex items-center gap-1">
                      <Info size={11} /> {isEn ? "https:// will be added automatically." : "저장 시 https://가 자동으로 추가됩니다."}
                    </p>
                  )}
                </div>

                {/* ── 추가 요청 및 안내사항 (선택) ── */}
                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1 flex items-center">
                    {isEn ? "Additional Notes / Instructions" : "추가 요청 및 안내사항"}
                    {/* [CHANGE 1] Optional 배지 제거 - 표시 안 함 */}
                  </label>
                  <div className="relative">
                    <textarea
                      name="note"
                      value={createNote}
                      onChange={e => setCreateNote(e.target.value)}
                      placeholder={
                        isEn
                          ? "e.g. Please bring business cards. Meeting room is on the 3rd floor, Room 301."
                          : "예) 명함을 지참해 주세요. 3층 301호 회의실에서 진행됩니다."
                      }
                      rows={3}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 rounded-[20px] text-sm font-bold outline-none transition-all resize-none leading-relaxed text-slate-600 placeholder:text-slate-300"
                    />
                    {createNote.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCreateNote("")}
                        className="absolute top-3 right-3 p-1 text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 ml-1 flex items-center gap-1">
                    <Info size={10} className="text-slate-300" />
                    {isEn ? "This message will be shown to sellers who apply for this slot." : "이 내용은 미팅 신청 기업들에게 안내됩니다."}
                  </p>
                </div>

                <button disabled={isPending} className="w-full py-5 md:py-6 bg-slate-900 text-white rounded-[20px] md:rounded-[25px] font-black text-base md:text-lg shadow-xl hover:bg-indigo-600 transition-all active:scale-[0.98] mt-4 flex justify-center items-center gap-2">
                  {isPending ? <Clock className="animate-spin" size={20} /> : <Plus size={20} />}
                  {isPending ? t.buyer.generator.creating : t.buyer.generator.submitBtn}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* ── [DIRECT] 받은 제안 ── */}
        {expandedSection === 'direct' && (
          <section className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0"><Sparkles size={20} /></div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-amber-600 leading-tight">
                  {isEn ? "Direct Proposals" : "받은 제안"}
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Direct Meeting Requests
                </p>
              </div>
            </div>

            {directRequests.length === 0 ? (
              <div className="p-12 md:p-20 bg-amber-50/20 rounded-[40px] border-2 border-dashed border-amber-200 text-center flex flex-col items-center">
                <Sparkles size={40} className="text-amber-200 mb-4" />
                <p className="text-amber-700 font-bold text-sm md:text-base">{isEn ? "No direct proposals yet." : "아직 받은 다이렉트 제안이 없습니다."}</p>
                <p className="text-xs text-amber-600/70 mt-2 font-bold max-w-md">
                  {isEn
                    ? "Sellers can send you direct meeting requests even without an open schedule."
                    : "셀러가 바이어님의 일정이 열려있지 않아도 직접 다이렉트로 미팅을 제안할 수 있습니다."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                {directRequests.map((req: any) => {
                  const d = getSellerDisplay(req.seller);
                  return (
                    <div key={req.id} className="group bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-amber-200 transition-all duration-300 overflow-hidden flex flex-col relative">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-amber-50 rounded-bl-full -z-10 opacity-40 group-hover:opacity-100 transition-opacity"></div>

                      <div className="p-6 pb-0">
                        <div className="flex justify-between items-start mb-5">
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-amber-200">
                            <Rocket size={10} /> DIRECT PROPOSE
                          </span>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{isEn ? "Suggested at" : "제안일"}</p>
                            <p className="text-[11px] font-black text-slate-700 mt-1">{formatDateWithDay(req.createdAt)}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5 mb-5">
                          <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:bg-amber-500 transition-colors">
                            <Building2 size={24} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-lg text-slate-800 truncate leading-tight">{d.companyName}</h4>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                <UserIcon size={12} className="text-slate-300" /> {d.picName}
                              </p>
                              <span className="w-0.5 h-0.5 bg-slate-200 rounded-full"></span>
                              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tight">
                                {d.industry}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 group-hover:bg-white transition-colors relative">
                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                            <FileText size={10} /> {isEn ? "Proposal Message" : "제안 메시지"}
                          </p>
                          <p className="text-[13px] text-slate-700 font-bold leading-relaxed line-clamp-3">
                            "{req.proposal}"
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto p-6 space-y-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            onClick={() => setSelectedOnePager({ ...req.seller.onePager, user: req.seller, members: req.seller.members })}
                            className="px-3 py-2.5 bg-white text-slate-800 text-[10px] font-black rounded-xl hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-1.5 border border-slate-200 shadow-sm active:scale-[0.97]"
                          >
                            <Search size={13} /> {isEn ? "Profile" : "프로필 보기"}
                          </button>
                          <button
                            onClick={() => setSelectedChatMeeting(req)}
                            className={`relative px-3 py-2.5 border text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.97] ${unreadMeetings.includes(req.id) ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'}`}
                          >
                            <MessageCircle size={13} />
                            {isEn ? "Chat" : "대화하기"}
                            {unreadMeetings.includes(req.id) && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white">N</span>}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            onClick={() => handleRejectDirect(req)}
                            className="px-3 py-2.5 bg-white text-rose-500 text-[10px] font-black rounded-xl border border-slate-200 hover:bg-rose-500 hover:text-white hover:border-rose-600 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.97]"
                          >
                            <XCircle size={14} /> {isEn ? "Decline" : "거절"}
                          </button>
                          <button
                            onClick={() => setAcceptingDirect(req)}
                            className="px-3 py-2.5 bg-white text-amber-500 text-[10px] font-black rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.97] border border-slate-200 hover:border-amber-600"
                          >
                            <CheckCircle2 size={14} /> {isEn ? "Accept" : "수락/일정"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── [E] 분석 정보 ── */}
        {expandedSection === 'analytics' && (
          <section className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">{t.buyer.analytics.title}</h2>
              <p className="text-xs text-slate-400 font-bold uppercase mt-0.5 tracking-widest">Market Insights</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="bg-white p-8 md:p-10 rounded-[30px] md:rounded-[45px] shadow-lg border border-slate-100">
                <div className="flex items-center gap-4 mb-8 md:mb-10">
                  <div className="p-3.5 md:p-4 bg-indigo-50 text-indigo-600 rounded-[18px] md:rounded-2xl shadow-sm"><PieChart size={28} /></div>
                  <h3 className="font-black text-lg md:text-xl text-slate-800">{t.buyer.analytics.industryTitle}</h3>
                </div>
                <div className="space-y-6 md:space-y-7">
                  {Object.entries(stats.industries).map(([name, count]: any) => (
                    <div key={name} className="space-y-2.5">
                      <div className="flex justify-between text-[11px] md:text-xs font-black">
                        <span className="text-slate-600">{localizeIndustry(name, isEn)}</span>
                        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{count}{isEn ? " cos" : "개사"} ({((count / uniqueSellers.length) * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${(count / uniqueSellers.length) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 p-8 md:p-10 rounded-[30px] md:rounded-[45px] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-bl-[100px] pointer-events-none"></div>
                <div className="flex items-center gap-4 mb-8 md:mb-10 relative z-10">
                  <div className="p-3.5 md:p-4 bg-white/10 text-indigo-300 rounded-[18px] md:rounded-2xl shadow-sm backdrop-blur-md"><TrendingUp size={28} /></div>
                  <h3 className="font-black text-lg md:text-xl">{t.buyer.analytics.stageTitle}</h3>
                </div>
                <div className="space-y-6 md:space-y-7 relative z-10">
                  {Object.entries(stats.stages).map(([name, count]: any) => (
                    <div key={name} className="space-y-2.5">
                      <div className="flex justify-between text-[11px] md:text-xs font-black">
                        <span className="text-slate-300">{name}</span>
                        <span className="text-indigo-300 bg-white/10 px-2 py-0.5 rounded-md">{count}{isEn ? " cos" : "개사"}</span>
                      </div>
                      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full transition-all duration-1000" style={{ width: `${(count / uniqueSellers.length) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── [F] 정보 수정 — 바이어 전용 (원페이저/회사공통정보 없음) ── */}
        {expandedSection === 'profile' && (
          <section className="animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-4 md:p-10 rounded-[24px] md:rounded-[36px] shadow-lg border border-slate-100">
              {/* 헤더 */}
              <div className="flex items-center gap-3 mb-6 md:mb-8 border-b border-slate-100 pb-5">
                <div className="w-12 h-12 shrink-0 bg-slate-900 rounded-[16px] flex items-center justify-center text-white shadow-lg"><UserIcon size={22} /></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base md:text-xl font-black text-slate-800 truncate">
                      {isEn
                        ? `${user.nameEn || user.name}`
                        : `${user.name} 님`
                      }
                    </h3>
                    {user.isMaster
                      ? <span className="shrink-0 px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded-md flex items-center gap-1"><ShieldCheck size={10} /> MASTER</span>
                      : <span className="shrink-0 px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md flex items-center gap-1"><Users size={10} /> MEMBER</span>
                    }
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">
                    {user.companyName}{user.jobTitle ? ` · ${isEn ? user.jobTitleEn || user.jobTitle : user.jobTitle}` : ''}
                  </p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-10">

                {/* ── 개인정보 (마스터/멤버 공통) ── */}
                <div>
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <UserIcon size={14} /> {isEn ? "Personal Info" : "개인 정보"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                    {/* 이메일 (고정) */}
                    <div className="flex flex-col space-y-2">
                      <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Mail size={12} /> {t.buyer.profile.emailFixed}</p>
                      <input defaultValue={user.email} disabled className="w-full p-3.5 md:p-4 rounded-[16px] md:rounded-2xl border text-sm font-bold bg-slate-100 border-transparent text-slate-400 cursor-not-allowed" />
                      <input type="hidden" name="email" value={user.email} />
                    </div>
                    {/* 성함 (한글) - [CHANGE 2] 영어 사용자에게는 "Full Name (KR)" 레이블로만 표시 */}
                    <div className="flex flex-col space-y-2">
                      <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><UserIcon size={12} /> {isEn ? "Full Name (KR)" : "성함 (한글)"}</p>
                      <input name="name" defaultValue={user.name} required className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all" />
                    </div>
                    {/* 영문 이름 */}
                    <div className="flex flex-col space-y-2">
                      <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><UserIcon size={12} /> {isEn ? "Full Name (EN)" : "영문 이름"}</p>
                      <input name="nameEn" defaultValue={user.nameEn} className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all" />
                    </div>
                    {/* 연락처 */}
                    <div className="flex flex-col space-y-2">
                      <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Phone size={12} /> {t.buyer.profile.phoneLabel}</p>
                      <input name="phone" value={editPhone} onChange={handlePhoneChange} maxLength={13} required className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all" />
                    </div>
                    {/* 직함 (한글) */}
                    <div className="flex flex-col space-y-2">
                      <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Check size={12} /> {isEn ? "Job Title (KR)" : "직함 (한글)"}</p>
                      <input name="jobTitle" defaultValue={user.jobTitle} required className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all" />
                    </div>
                    {/* 직함 (영문) */}
                    <div className="flex flex-col space-y-2">
                      <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Check size={12} /> {isEn ? "Job Title (EN)" : "직함 (영문)"}</p>
                      <input name="jobTitleEn" defaultValue={user.jobTitleEn} className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all" />
                    </div>
                    {/* 새 비밀번호 */}
                    <div className="flex flex-col space-y-2">
                      <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.buyer.profile.newPassword}</p>
                      <input name="password" type="password" placeholder="8+ characters" value={editPassword} onChange={e => setEditPassword(e.target.value)} className={`w-full p-3.5 md:p-4 bg-slate-50 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all ${editPassword.length > 0 && editPassword.length < 8 ? 'border-rose-400 focus:border-rose-500' : 'border-transparent focus:bg-white focus:border-indigo-500'}`} />
                    </div>
                    {/* 비밀번호 확인 */}
                    <div className="flex flex-col space-y-2">
                      <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.buyer.profile.confirmPassword}</p>
                      <input name="confirmPassword" type="password" placeholder="Re-enter password" value={editConfirmPassword} onChange={e => setEditConfirmPassword(e.target.value)} className={`w-full p-3.5 md:p-4 bg-slate-50 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all ${editConfirmPassword && editPassword !== editConfirmPassword ? 'border-rose-500 bg-rose-50' : 'border-transparent focus:bg-white focus:border-indigo-500'}`} />
                    </div>
                    {/* 회원 유형 */}
                    <div className="flex flex-col space-y-3 md:col-span-2 pt-2 border-t border-slate-100">
                      <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Target size={12} /> {t.buyer.profile.userTypeLabel}</p>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { val: "VC", label: "VC" },
                          { val: "AC", label: "AC" },
                          { val: "바이어", label: "Buyer" },
                          { val: "스타트업", label: "Startup" },
                          { val: "기타", label: "Other" }
                        ].map((opt) => (
                          <label key={opt.val} className={`flex-1 min-w-[72px] text-center px-1 py-3 md:py-4 rounded-[16px] cursor-pointer text-xs md:text-sm font-black transition-all border whitespace-nowrap break-keep shrink-0 ${editSelectedType === opt.val ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200" : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"}`}>
                            <input type="radio" name="userType" value={opt.val} className="hidden" checked={editSelectedType === opt.val} onChange={(e) => setEditSelectedType(e.target.value)} />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                      {(editSelectedType === "기타" || editSelectedType === "Other") && (
                        <input name="userTypeDetail" type="text" placeholder={t.register.userTypeOtherPlaceholder} required value={editUserTypeDetail} onChange={(e) => setEditUserTypeDetail(e.target.value)} className="w-full p-4 mt-2 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all" />
                      )}
                    </div>
                    {/* 관심 파트너 */}
                    <div className="flex flex-col space-y-2 md:col-span-2">
                      <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Lightbulb size={12} /> {t.buyer.profile.preferredLabel}</p>
                      <textarea name="preferredPartners" defaultValue={user.preferredPartners} placeholder={t.register.preferredPartnersPlaceholder} className="w-full p-4 md:p-5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[20px] md:rounded-3xl border h-28 md:h-32 text-sm md:text-base font-bold resize-none leading-relaxed transition-all" />
                    </div>
                    {/* [CHANGE 3] LinkedIn - http 자동 추가, www. 입력도 처리 */}
                    <div className="flex flex-col space-y-2 md:col-span-2">
                      <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Globe size={12} /> LinkedIn</p>
                      <div className="relative">
                        <input
                          name="linkedinUrl"
                          value={editLinkedinUrl}
                          onChange={e => setEditLinkedinUrl(e.target.value)}
                          onBlur={handleLinkedinBlur}
                          placeholder="https://linkedin.com/in/... or linkedin.com/in/..."
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all"
                        />
                        {editLinkedinUrl && !/^https?:\/\//i.test(editLinkedinUrl) && editLinkedinUrl.trim() !== '' && (
                          <p className="text-[10px] font-bold text-indigo-400 mt-1 flex items-center gap-1 ml-1">
                            <Info size={10} /> {isEn ? "https:// will be added automatically on save." : "포커스 이동 시 https://가 자동으로 추가됩니다."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 마스터 전용: 회사 공통 정보 ── */}
                {user.isMaster && (
                  <div>
                    <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-indigo-50 pb-3">
                      <Building2 size={14} /> {isEn ? "Company Info — Master Only" : "회사 공통 정보 (마스터 전용)"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                      {/* [CHANGE 2] 영어 사용자에게는 한글 회사명 필드를 숨기고 영문 회사명을 먼저 표시 */}
                      {isEn ? (
                        <>
                          <div className="flex flex-col space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isEn ? "Company (EN)" : "회사명 (영문)"}</p>
                            <input name="companyNameEn" defaultValue={user.companyNameEn} className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                          </div>
                          <div className="flex flex-col space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company (KR) <span className="text-slate-300 normal-case font-medium text-[9px]">— for Korean records</span></p>
                            <input name="companyName" defaultValue={user.companyName} required className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">회사명 (한글)</p>
                            <input name="companyName" defaultValue={user.companyName} required className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                          </div>
                          <div className="flex flex-col space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">회사명 (영문)</p>
                            <input name="companyNameEn" defaultValue={user.companyNameEn} className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                          </div>
                        </>
                      )}
                      {/* [CHANGE 2] CEO 이름 - 영어 사용자는 영문 CEO 먼저 */}
                      {isEn ? (
                        <>
                          <div className="flex flex-col space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CEO (EN)</p>
                            <input name="ceoNameEn" defaultValue={user.ceoNameEn} className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                          </div>
                          <div className="flex flex-col space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CEO (KR) <span className="text-slate-300 normal-case font-medium text-[9px]">— for Korean records</span></p>
                            <input name="ceoNameKo" defaultValue={user.ceoNameKo} className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">대표자 (한글)</p>
                            <input name="ceoNameKo" defaultValue={user.ceoNameKo} className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                          </div>
                          <div className="flex flex-col space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">대표자 (영문)</p>
                            <input name="ceoNameEn" defaultValue={user.ceoNameEn} className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                          </div>
                        </>
                      )}
                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isEn ? "Industry Sector" : "산업 분야"}</p>
                        <div className="relative group">
                          <select
                            name="industrySector"
                            defaultValue={user.industrySector || user.onePager?.industrySector || ""}
                            className="w-full p-3.5 md:p-4 pr-12 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none rounded-[16px] text-sm font-bold transition-all appearance-none cursor-pointer text-slate-700 hover:border-indigo-300">
                            <option value="" disabled>{isEn ? "Select industry" : "산업 분야 선택"}</option>
                            {industryOptions.map(opt => (
                              <option key={opt.ko} value={opt.ko}>{isEn ? opt.en : opt.ko}</option>
                            ))}
                          </select>
                          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isEn ? "Year Founded" : "설립연도"}</p>
                        <input name="yearFounded" defaultValue={user.yearFounded || user.onePager?.yearFounded} className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isEn ? "Investment Stage" : "투자 단계"}</p>
                        <input name="investmentStage" defaultValue={user.investmentStage || user.onePager?.investmentStage} className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isEn ? "Primary Tech" : "핵심 기술"}</p>
                        <input name="primaryTech" defaultValue={user.primaryTech || user.onePager?.primaryTech} className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                      </div>

                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isEn ? "Primary Activity Region" : "기본 활동 권역"}</p>
                        <div className="relative group">
                          <select
                            name="primaryRegion"
                            defaultValue={user.primaryRegion || ""}
                            className="w-full p-3.5 md:p-4 pr-12 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none rounded-[16px] text-sm font-bold transition-all appearance-none cursor-pointer text-slate-700 hover:border-indigo-300">
                            <option value="" disabled>{isEn ? "Select region" : "권역 선택"}</option>
                            {regionOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{isEn ? opt.en : opt.ko}</option>
                            ))}
                          </select>
                          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isEn ? "Secondary Activity Region" : "추가 활동 권역"}</p>
                        <div className="relative group">
                          <select
                            name="secondaryRegion"
                            defaultValue={user.secondaryRegion || ""}
                            className="w-full p-3.5 md:p-4 pr-12 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none rounded-[16px] text-sm font-bold transition-all appearance-none cursor-pointer text-slate-700 hover:border-indigo-300">
                            <option value="">{isEn ? "None" : "추가 권역 없음"}</option>
                            {regionOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{isEn ? opt.en : opt.ko}</option>
                            ))}
                          </select>
                          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 저장 버튼 */}
                <button
                  type="submit"
                  disabled={isPending || (editPassword.length > 0 && editPassword !== editConfirmPassword) || (editPassword.length > 0 && editPassword.length < 8)}
                  className="w-full py-4 md:py-6 bg-slate-900 text-white rounded-[20px] md:rounded-[30px] font-black text-base md:text-lg hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-xl mt-2 disabled:opacity-50 disabled:hover:bg-slate-900"
                >
                  {isPending ? <Clock className="animate-spin" size={20} /> : <Save size={20} />}
                  {t.buyer.profile.saveBtn}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* ── [G] 팀 관리 (마스터 전용) ── */}
        {expandedSection === 'team' && user.isMaster && (
          <section className="bg-white p-4 md:p-10 rounded-[24px] md:rounded-[36px] shadow-lg border border-slate-100 animate-in fade-in duration-300 text-left w-full">
            <div className="flex flex-col mb-8 md:mb-10 border-b border-slate-50 pb-6 md:pb-8">
              <h3 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 md:gap-3 flex-wrap">
                <ShieldCheck className="text-indigo-600" size={28} />
                {isEn ? "Team Management" : "팀 관리"}
                <span className="px-2 md:px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] md:text-[10px] font-black rounded-md md:rounded-lg">Master Console</span>
              </h3>
              <p className="text-xs md:text-sm font-bold text-slate-400 mt-2 ml-1 leading-relaxed break-keep">
                {isEn ? "Approve or reject members requesting to join the organization." : "조직에 합류를 요청한 멤버를 승인하거나, 반려하여 수정을 요청할 수 있습니다."}
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-12">

              {/* ── 왼쪽: 대기 중 + 거절된 멤버 ── */}
              <div className="space-y-4">

                {/* 대기 중 헤더 */}
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <p className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={16} />
                    {isEn ? "Pending Approval" : "승인 대기"}
                    <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md">{pendingMembers.length}</span>
                  </p>
                </div>

                {pendingMembers.length === 0 ? (
                  <div className="bg-slate-50 rounded-[20px] md:rounded-[30px] p-8 md:p-10 text-center border border-slate-100 border-dashed">
                    <p className="text-xs md:text-sm font-bold text-slate-400">
                      {isEn ? "No pending members." : "대기 중인 팀원이 없습니다."}
                    </p>
                  </div>
                ) : (
                  pendingMembers.map((m: any) => (
                    <div key={m.id} className="bg-white p-4 md:p-5 rounded-[20px] md:rounded-[25px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                      <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto overflow-hidden">
                        <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-base md:text-lg">
                          {(isEn ? (m.nameEn || m.name) : m.name)?.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-sm text-slate-800 truncate">
                            {isEn ? (m.nameEn || m.name) : m.name}
                            <span className="text-indigo-500 ml-1 text-xs">
                              ({isEn ? (m.jobTitleEn || m.jobTitle) : m.jobTitle})
                            </span>
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          disabled={processingMemberId !== null}
                          onClick={async () => {
                            const reason = window.prompt(
                              isEn ? "Please enter the rejection reason. (Optional)" : "거절 사유를 입력해주세요. (선택사항)"
                            );
                            if (reason !== null) {
                              setProcessingMemberId(m.id);
                              await handleMemberStatus(m.id, "REJECTED", reason);
                              setProcessingMemberId(null);
                            }
                          }}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-black hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {processingMemberId === m.id ? (isEn ? "Processing..." : "처리중") : (isEn ? "Reject" : "거절")}
                        </button>
                        <button
                          disabled={processingMemberId !== null}
                          onClick={async () => {
                            setProcessingMemberId(m.id);
                            await handleMemberStatus(m.id, "APPROVED");
                            setProcessingMemberId(null);
                          }}
                          className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-slate-900 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {processingMemberId === m.id && <RefreshCw size={14} className="animate-spin" />}
                          {processingMemberId === m.id ? (isEn ? "Processing..." : "승인 중...") : (isEn ? "Approve" : "승인")}
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* 거절된 멤버 섹션 */}
                {rejectedTeamMembers.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <p className="text-[11px] md:text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                        <Ban size={16} />
                        {isEn ? "Rejected Members" : "거절된 멤버"}
                        <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md">{rejectedTeamMembers.length}</span>
                      </p>
                    </div>
                    <div className="space-y-4">
                      {rejectedTeamMembers.map((m: any) => (
                        <div key={m.id} className="bg-white p-4 md:p-5 rounded-[20px] md:rounded-[25px] flex flex-col justify-between gap-3 border border-rose-100 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-3 md:gap-4 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 font-black text-base md:text-lg">
                              {(isEn ? (m.nameEn || m.name) : m.name)?.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-black text-sm text-slate-800 flex items-center flex-wrap gap-1">
                                <span className="truncate max-w-[120px] md:max-w-full">
                                  {isEn ? (m.nameEn || m.name) : m.name}
                                </span>
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{m.email}</p>
                            </div>
                          </div>
                          <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100/50">
                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">
                              {isEn ? "Rejection Reason" : "거절 사유"}
                            </p>
                            <p className="text-[11px] font-bold text-rose-600 italic">
                              "{m.rejectionReason || (isEn ? "No reason" : "사유 없음")}"
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── 오른쪽: 승인된 멤버 목록 ── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <p className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Users size={16} />
                    {isEn ? "Active Members" : "조직원"}
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{approvedMembers.length}</span>
                  </p>
                </div>

                {sortedApprovedMembers.map((m: any) => (
                  <div key={m.id} className="bg-white p-4 md:p-5 rounded-[20px] md:rounded-[25px] flex items-center justify-between gap-3 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full flex items-center justify-center font-black text-base md:text-lg ${m.id === user.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {(isEn ? (m.nameEn || m.name) : m.name)?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-slate-800 flex items-center flex-wrap gap-1">
                          <span className="truncate max-w-[120px] md:max-w-full">
                            {isEn ? (m.nameEn || m.name) : m.name}
                          </span>
                          {m.id === user.id && (
                            <span className="text-indigo-500 text-[9px] md:text-[10px] font-black uppercase bg-indigo-50 px-1.5 py-0.5 rounded-md">(YOU)</span>
                          )}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">
                          {isEn ? (m.jobTitleEn || m.jobTitle) : m.jobTitle}
                        </p>
                      </div>
                    </div>

                    {m.id !== user.id && (
                      <button
                        onClick={async () => {
                          if (confirm(isEn
                            ? `[Warning] Transfer master role to ${m.nameEn || m.name}?\nYou will be demoted to a regular member.`
                            : `[주의] ${m.name}님에게 마스터 권한을 넘기시겠습니까?\n권한을 위임하면 본인은 일반 조직원으로 강등됩니다.`
                          )) {
                            setIsPending(true);
                            await transferMasterRole(m.id);
                            setIsPending(false);
                          }
                        }}
                        className="shrink-0 px-3 md:px-4 py-2 border border-slate-200 text-slate-500 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
                      >
                        {isEn ? "Transfer Master" : "마스터 위임"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>

      {/* ── 예약 수정 모달 ── */}
      {editingSlot && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-lg rounded-[32px] md:rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border border-white/20 max-h-[92vh] overflow-y-auto">
            <div className="bg-indigo-600 px-6 md:px-8 py-5 md:py-6 flex justify-between items-center text-white relative overflow-hidden sticky top-0 z-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <h3 className="text-lg md:text-xl font-black flex items-center gap-2"><Edit2 size={20} /> {isEn ? "Edit Slot Date / Location" : "예약 일정/장소 수정"}</h3>
                <p className="text-[11px] text-indigo-200 font-bold mt-1 tracking-widest uppercase">Edit Reservation Slot</p>
              </div>
              <button onClick={() => setEditingSlot(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors relative z-10"><X size={20} /></button>
            </div>
            <div className="p-6 md:p-8">
              <form onSubmit={handleUpdateSlot} className="space-y-5">
                {(() => {
                  const d = new Date(editingSlot.startTime);
                  const offset = d.getTimezoneOffset() * 60000;
                  const defaultDate = new Date(d.getTime() - offset).toISOString().split('T')[0];
                  const defaultHour = String(d.getHours()).padStart(2, '0');
                  const defaultMinute = String(d.getMinutes()).padStart(2, '0');
                  const hasRequests = editingSlot.meetings?.filter((m: any) => m.status !== 'REJECTED').length > 0;
                  return (
                    <>
                      {hasRequests && (
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-[11px] text-amber-700 flex gap-2.5 items-start leading-relaxed shadow-sm">
                          <AlertCircle size={14} className="shrink-0 mt-0.5" />
                          <p>{isEn ? "Date and time cannot be changed because there is an accepted or pending meeting." : "확정 또는 신청 중인 미팅이 있어 장소/링크만 변경 가능합니다."}</p>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                          {t.buyer.generator.dateLabel}
                          {!hasRequests && <RequiredDot />}
                        </label>
                        <input name="date" type="date" required defaultValue={defaultDate} min={todayString} readOnly={hasRequests} lang={isEn ? "en-US" : "ko-KR"} className={`w-full p-4 rounded-[16px] text-sm font-bold outline-none transition-all ${hasRequests ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed focus:ring-0' : 'bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer'}`} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                            {t.buyer.generator.hourLabel}
                            {!hasRequests && <RequiredDot />}
                          </label>
                          <select name="hour" defaultValue={defaultHour} disabled={hasRequests} className={`w-full p-4 rounded-[16px] text-sm font-bold outline-none appearance-none transition-all ${hasRequests ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 cursor-pointer'}`}>
                            {Array.from({ length: 24 }).map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{i}{isEn ? "" : "시"}</option>)}
                          </select>
                          {hasRequests && <input type="hidden" name="hour" value={defaultHour} />}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                            {t.buyer.generator.minuteLabel}
                            {!hasRequests && <RequiredDot />}
                          </label>
                          <select name="minute" defaultValue={defaultMinute} disabled={hasRequests} className={`w-full p-4 rounded-[16px] text-sm font-bold outline-none appearance-none transition-all ${hasRequests ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 cursor-pointer'}`}>
                            <option value="00">00{isEn ? "" : "분"}</option><option value="30">30{isEn ? "" : "분"}</option>
                          </select>
                          {hasRequests && <input type="hidden" name="minute" value={defaultMinute} />}
                        </div>
                      </div>

                      {/* ── 온라인/오프라인 선택 (수정 모달) ── */}
                      <div className="space-y-2 pt-1">
                        <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1 flex items-center">
                          {isEn ? "Meeting Type" : "미팅 방식"}
                          <RequiredDot />
                        </label>
                        <MeetingTypeToggle
                          meetingType={editMeetingType}
                          setMeetingType={(t) => {
                            setEditMeetingType(t);
                            setEditLinkTba(false);
                            setEditLocationValue("");
                          }}
                        />
                      </div>

                      {/* ── 장소 / 링크 입력 (수정 모달) ── */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1 flex items-center">
                          {editMeetingType === 'online'
                            ? <><Video size={12} className="mr-1" /> {isEn ? "Meeting Link (Zoom, Meet, etc.)" : "화상회의 링크 (Zoom, Meet 등)"}</>
                            : <><MapPinned size={12} className="mr-1" /> {t.buyer.generator.locationLabel}</>
                          }
                          <RequiredDot />
                        </label>

                        {editMeetingType === 'online' && (
                          <label className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-[14px] cursor-pointer hover:bg-amber-100 transition-colors group">
                            <div className="relative shrink-0">
                              <input
                                type="checkbox"
                                checked={editLinkTba}
                                onChange={(e) => {
                                  setEditLinkTba(e.target.checked);
                                  if (e.target.checked) setEditLocationValue("");
                                }}
                                className="sr-only"
                              />
                              <div className={`w-9 h-5 rounded-full transition-colors ${editLinkTba ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editLinkTba ? 'translate-x-4' : 'translate-x-0.5'}`} />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-black text-amber-700">{isEn ? "Announce link later (TBA)" : "링크 추후 공지 예정"}</p>
                              <p className="text-[10px] font-bold text-amber-500 mt-0.5">{isEn ? "You can update the link later when confirmed." : "링크가 확정되면 나중에 수정할 수 있습니다."}</p>
                            </div>
                          </label>
                        )}

                        {!(editMeetingType === 'online' && editLinkTba) && (
                          <div className="relative">
                            <input
                              name="location"
                              required
                              value={editLocationValue}
                              onChange={e => setEditLocationValue(e.target.value)}
                              placeholder={
                                editMeetingType === 'online'
                                  ? (isEn ? "zoom.us/j/... or meet.google.com/..." : "zoom.us/j/... 또는 meet.google.com/...")
                                  : (isEn ? "Location or Online" : "장소 혹은 온라인 여부")
                              }
                              className={`w-full pl-4 pr-4 p-4 rounded-[16px] text-sm font-bold outline-none transition-all ${editMeetingType === 'online'
                                ? 'bg-emerald-50 border border-emerald-200 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                                : 'bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                                }`}
                            />
                          </div>
                        )}

                        {editMeetingType === 'online' && editLinkTba && (
                          <input type="hidden" name="location" value={TBA_VALUE} />
                        )}

                        {editMeetingType === 'online' && !editLinkTba && editLocationValue && !/^https?:\/\//i.test(editLocationValue) && (
                          <p className="text-[11px] text-emerald-500 font-bold ml-1 flex items-center gap-1">
                            <Info size={11} /> {isEn ? "https:// will be added automatically." : "저장 시 https://가 자동으로 추가됩니다."}
                          </p>
                        )}
                      </div>

                      {/* ── 추가 요청 및 안내사항 (수정 모달 / 선택) ── */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1 flex items-center">
                          {isEn ? "Additional Notes / Instructions" : "추가 요청 및 안내사항"}
                          {/* [CHANGE 1] Optional 배지 제거 */}
                        </label>
                        <div className="relative">
                          <textarea
                            name="note"
                            value={editNote}
                            onChange={e => setEditNote(e.target.value)}
                            placeholder={
                              isEn
                                ? "e.g. Please bring business cards. Meeting room is on the 3rd floor, Room 301."
                                : "예) 명함을 지참해 주세요. 3층 301호 회의실에서 진행됩니다."
                            }
                            rows={3}
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 rounded-[16px] text-sm font-bold outline-none transition-all resize-none leading-relaxed text-slate-600 placeholder:text-slate-300"
                          />
                          {editNote.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setEditNote("")}
                              className="absolute top-3 right-3 p-1 text-slate-300 hover:text-slate-500 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 ml-1 flex items-center gap-1">
                          <Info size={10} className="text-slate-300" />
                          {isEn ? "This message will be shown to sellers who apply for this slot." : "이 내용은 미팅 신청 기업들에게 안내됩니다."}
                        </p>
                      </div>

                      <button disabled={isPending} className="w-full py-4 bg-slate-900 text-white rounded-[16px] font-black text-base hover:bg-indigo-600 transition-all active:scale-[0.98] mt-4 flex justify-center items-center gap-2">
                        {isPending ? t.common.loading : <><Save size={18} /> {isEn ? "Update Changes" : "수정 완료"}</>}
                      </button>
                    </>
                  );
                })()}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── 매칭 검토 모달 ── */}
      {reviewingMeeting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-lg rounded-[32px] md:rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border border-white/20">
            <div className="bg-slate-900 px-6 md:px-8 py-5 md:py-6 flex justify-between items-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <h3 className="text-lg md:text-xl font-black flex items-center gap-2"><Search size={20} className="text-indigo-400" /> {t.buyer.pending.reviewBtn}</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">{isEn ? 'Review Meeting Request' : '미팅 요청 검토'}</p>
              </div>
              <button onClick={() => setReviewingMeeting(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors relative z-10"><X size={20} /></button>
            </div>
            <div className="p-6 md:p-8 space-y-5 md:space-y-6">
              <div className="bg-slate-50 rounded-[24px] md:rounded-[25px] p-5 md:p-6 border border-slate-100 flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-[16px] shadow-sm border border-slate-100 flex items-center justify-center text-indigo-500 shrink-0"><Building2 size={24} /></div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h4 className="text-lg font-black text-slate-900">
                      {isEn ? (reviewingMeeting.meeting.seller.companyNameEn || reviewingMeeting.meeting.seller.companyName) : reviewingMeeting.meeting.seller.companyName}
                    </h4>
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md flex items-center gap-1 border border-indigo-100">
                      <UserIcon size={12} />
                      {isEn ? (reviewingMeeting.meeting.seller.nameEn || reviewingMeeting.meeting.seller.name) : reviewingMeeting.meeting.seller.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md">{localizeIndustry(reviewingMeeting.meeting.seller.onePager?.industrySector, isEn) || "-"}</span>
                  <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed italic">"{reviewingMeeting.meeting.seller.onePager?.solutionSummary || t.buyer.directory.noResults}"</p>
                </div>
              </div>

              {reviewingMeeting.meeting.proposal && (
                <div className="bg-indigo-50/50 p-5 border border-indigo-100 rounded-[20px] shadow-sm flex flex-col gap-2">
                  <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 opacity-80">
                    <FileText size={14} /> {isEn ? "Pre-proposal Message" : "사전 제안 메시지"}
                  </p>
                  <p className="text-[13px] font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {reviewingMeeting.meeting.proposal}
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  const s = reviewingMeeting.meeting.seller;
                  setSelectedOnePager({ ...s.onePager, user: s, members: s.members || [s] });
                }}
                className="w-full py-4 bg-white border-2 border-indigo-100 text-indigo-600 font-black rounded-[20px] flex justify-center items-center gap-2 hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm"
              >
                <FileSearch size={18} /> {isEn ? "View Detailed One-Pager" : "기업 상세 프로필 확인 (One-Pager)"}
              </button>
              <div className="bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold p-4 rounded-2xl flex items-start gap-2 leading-relaxed">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                <p>{isEn ? "Approving this will automatically reject others in the same slot." : "승인 시 동일 슬롯 대기 중인 다른 기업들은 '타기업 매칭' 사유로 자동 거절됩니다."}</p>
              </div>
            </div>
            <div className="p-4 md:p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => handleRejectMatch(reviewingMeeting.meeting)} disabled={isPending} className="flex-1 py-4 bg-white text-rose-500 border border-slate-200 font-black rounded-[20px] flex justify-center items-center gap-2 hover:bg-rose-50 transition-colors disabled:opacity-50 shadow-sm">
                <XCircle size={18} /> {isEn ? "Reject" : "거절"}
              </button>
              <button onClick={() => handleApproveMatch(reviewingMeeting.slot, reviewingMeeting.meeting)} disabled={isPending} className="flex-[1.5] py-4 bg-emerald-500 text-white font-black rounded-[20px] shadow-lg shadow-emerald-200 flex justify-center items-center gap-2 hover:bg-emerald-600 transition-colors disabled:opacity-50">
                {isPending ? t.common.loading : <><Check size={18} /> {isEn ? "Confirm Match" : "매칭 확정"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 원페이저 모달 — LinkedIn 추가 + UX 개선 ── */}
      {selectedOnePager && (() => {
        const op = selectedOnePager;
        const displayCompany = isEn ? (op.companyNameEn || op.user?.companyNameEn || op.companyNameKr || op.user?.companyName) : (op.companyNameKr || op.user?.companyName);
        const displayCompanySub = isEn ? (op.companyNameKr || op.user?.companyName || "") : (op.companyNameEn || op.user?.companyNameEn || "N/A");
        const displayCeo = isEn ? (op.ceoNameEn || op.ceoName || "-") : (op.ceoName || "-");
        const displayIndustry = localizeIndustry(op.industrySector, isEn);

        return (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-200">
            {/* 모바일: 바텀시트 / 데스크탑: 센터 모달 */}
            <div
              className="bg-white w-full sm:max-w-5xl sm:mx-4 max-h-[96vh] sm:max-h-[92vh] overflow-y-auto 
                         rounded-t-[32px] sm:rounded-[40px] shadow-2xl relative 
                         animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300
                         scrollbar-hide border-t border-slate-100 sm:border"
            >
              {/* ── sticky 헤더 ── */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 md:px-8 md:py-5 border-b border-slate-100 flex justify-between items-center z-20">
                {/* 모바일 드래그 핸들 */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 rounded-full sm:hidden" />
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-2 md:p-2.5 bg-indigo-600 text-white rounded-[12px] md:rounded-[14px] shadow-md shadow-indigo-200"><Award size={20} className="md:w-6 md:h-6" /></div>
                  <div className="text-left">
                    <h3 className="text-base md:text-xl font-black text-slate-900 leading-none">Business One-Pager</h3>
                    <p className="text-[9px] md:text-[10px] font-black text-indigo-500 uppercase mt-1 tracking-widest">{isEn ? 'Detail View' : '상세 정보 조회'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOnePager(null)}
                  className="p-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all active:scale-90"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 md:p-10 space-y-8 md:space-y-10 bg-slate-50/30">

                {/* ── 회사 헤더 카드 ── */}
                <div className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 border border-slate-100 shadow-sm">
                  <div className="flex flex-col sm:flex-row gap-5 md:gap-8">
                    {/* 로고 자리 */}
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 rounded-[18px] md:rounded-[24px] flex items-center justify-center text-white shrink-0 shadow-xl">
                      <Building2 size={32} className="md:w-10 md:h-10" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight break-words">{displayCompany}</h2>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-tight mt-0.5 break-words">{displayCompanySub}</p>
                      </div>
                      {/* 배지 그룹 */}
                      <div className="flex flex-wrap gap-2">
                        {displayIndustry && (
                          <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-full text-[11px] font-black shadow-md shadow-indigo-100">{displayIndustry}</span>
                        )}
                        {op.investmentStage && (
                          <span className="px-3 py-1.5 bg-slate-900 text-white rounded-full text-[11px] font-black">{op.investmentStage}</span>
                        )}
                        {op.yearFounded && (
                          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black border border-emerald-100">
                            {isEn ? "Est." : "설립"} {op.yearFounded}{isEn ? "" : "년"}
                          </span>
                        )}
                        {displayCeo && displayCeo !== "-" && (
                          <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-[11px] font-black border border-amber-100">
                            {isEn ? "CEO" : "대표"}: {displayCeo}
                          </span>
                        )}
                      </div>
                      {/* 웹사이트 */}
                      {op.websiteUrl && (
                        <a
                          href={op.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-indigo-500 font-bold hover:text-indigo-700 text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Globe size={13} /> {op.websiteUrl}
                          <ExternalLink size={11} className="opacity-60" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── 본문 그리드 ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">

                  {/* 왼쪽 컬럼 */}
                  <div className="space-y-5">
                    {/* Key Product */}
                    <div className="bg-white p-5 md:p-7 rounded-[20px] md:rounded-[24px] shadow-sm border border-slate-100 space-y-3">
                      <h5 className="flex items-center gap-2 text-indigo-600 font-black text-[11px] uppercase tracking-widest">
                        <Sparkles size={15} /> {isEn ? "Key Product" : "주요 제품 및 서비스"}
                      </h5>
                      <p className="text-lg md:text-xl font-black text-slate-800 leading-snug">{op.productType || <span className="text-slate-300 font-medium text-sm">—</span>}</p>
                      {op.solutionSummary && (
                        <div className="bg-indigo-50/60 p-4 rounded-[14px] text-slate-600 text-sm leading-relaxed font-medium border-l-2 border-indigo-300">
                          {op.solutionSummary}
                        </div>
                      )}
                    </div>

                    {/* Problem */}
                    <div className="bg-white p-5 md:p-7 rounded-[20px] md:rounded-[24px] shadow-sm border border-slate-100 space-y-3">
                      <h5 className="flex items-center gap-2 text-rose-500 font-black text-[11px] uppercase tracking-widest">
                        <Target size={15} /> {isEn ? "Problem" : "마켓 문제점"}
                      </h5>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                        {op.problem || <span className="text-slate-300">—</span>}
                      </p>
                    </div>

                    {/* Traction */}
                    <div className="bg-white p-5 md:p-7 rounded-[20px] md:rounded-[24px] shadow-sm border border-slate-100 space-y-3">
                      <h5 className="flex items-center gap-2 text-emerald-600 font-black text-[11px] uppercase tracking-widest">
                        <TrendingUp size={15} /> {isEn ? "Traction" : "성과 및 지표"}
                      </h5>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                        {op.traction || <span className="text-slate-300">—</span>}
                      </p>
                    </div>
                  </div>

                  {/* 오른쪽 컬럼 */}
                  <div className="space-y-5">
                    {/* Solution */}
                    <div className="bg-white p-5 md:p-7 rounded-[20px] md:rounded-[24px] shadow-sm border border-slate-100 space-y-3">
                      <h5 className="flex items-center gap-2 text-amber-500 font-black text-[11px] uppercase tracking-widest">
                        <Lightbulb size={15} /> {isEn ? "Solution" : "해결 방안"}
                      </h5>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                        {op.solution || <span className="text-slate-300">—</span>}
                      </p>
                    </div>

                    {/* Biz Model */}
                    <div className="bg-white p-5 md:p-7 rounded-[20px] md:rounded-[24px] shadow-sm border border-slate-100 space-y-3">
                      <h5 className="flex items-center gap-2 text-blue-500 font-black text-[11px] uppercase tracking-widest">
                        <Briefcase size={15} /> {isEn ? "Biz Model" : "비즈니스 모델"}
                      </h5>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                        {op.bizModel || <span className="text-slate-300">—</span>}
                      </p>
                    </div>

                    {/* ── 비즈니스 연락처 카드 (LinkedIn 포함) ── */}
                    <div className="bg-slate-900 rounded-[20px] md:rounded-[24px] overflow-hidden shadow-xl">
                      {/* 헤더 */}
                      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
                        <Mail size={14} className="text-indigo-400" />
                        <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Business Contacts</h5>
                      </div>
                      {/* 멤버 목록 */}
                      <div className="divide-y divide-white/10 max-h-72 overflow-y-auto">
                        {op.members?.map((member: any, idx: number) => {
                          const mOp = member.onePager;
                          const mPicName = isEn
                            ? (mOp?.picNameEn || mOp?.picName || member.nameEn || member.name)
                            : (mOp?.picName || member.name);
                          const mPicTitle = isEn
                            ? (mOp?.picTitleEn || mOp?.picTitle || member.jobTitleEn || member.jobTitle)
                            : (mOp?.picTitle || member.jobTitle);
                          const memberEmail = mOp?.contactEmail || member.email;
                          const memberPhone = member.phone;
                          // LinkedIn: onePager > user 순으로 체크
                          const memberLinkedIn = mOp?.linkedinUrl || member.linkedinUrl;

                          return (
                            <div key={idx} className="p-5 space-y-3">
                              {/* 멤버 넘버 + 기술 뱃지 */}
                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-1 bg-white/10 rounded-md text-[9px] font-black tracking-wider uppercase text-slate-400">
                                  Member {idx + 1}
                                </span>
                                {(mOp?.primaryTech || member.primaryTech) && (
                                  <span className="font-black text-indigo-300 text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded-md">
                                    {mOp?.primaryTech || member.primaryTech}
                                  </span>
                                )}
                              </div>

                              {/* 이름 / 직함 */}
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-[10px] text-slate-500 font-bold shrink-0 pt-0.5">
                                  {isEn ? "Name / Title" : "이름 / 직함"}
                                </span>
                                <span className="font-black text-white text-sm text-right">
                                  {mPicName}
                                  {mPicTitle && <span className="text-indigo-300 text-xs font-bold ml-1">({mPicTitle})</span>}
                                </span>
                              </div>

                              {/* 이메일 */}
                              {memberEmail && (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[10px] text-slate-500 font-bold shrink-0">
                                    {isEn ? "Email" : "이메일"}
                                  </span>
                                  <a
                                    href={`mailto:${memberEmail}`}
                                    className="font-bold text-xs text-indigo-300 hover:text-indigo-200 underline decoration-indigo-500/40 underline-offset-3 transition-colors text-right truncate max-w-[180px]"
                                  >
                                    {memberEmail}
                                  </a>
                                </div>
                              )}

                              {/* 전화 */}
                              {memberPhone && (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[10px] text-slate-500 font-bold shrink-0">
                                    {isEn ? "Phone" : "연락처"}
                                  </span>
                                  <a
                                    href={`tel:${memberPhone}`}
                                    className="font-bold text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                                  >
                                    <Phone size={11} className="text-slate-500 shrink-0" />
                                    {memberPhone}
                                  </a>
                                </div>
                              )}

                              {/* LinkedIn ── 신규 추가 */}
                              {memberLinkedIn && (
                                <div className="pt-1">
                                  <a
                                    href={memberLinkedIn.startsWith('http') ? memberLinkedIn : `https://${memberLinkedIn}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0A66C2]/20 hover:bg-[#0A66C2]/40 border border-[#0A66C2]/30 hover:border-[#0A66C2]/60 rounded-xl text-[#70B5F9] hover:text-white text-[11px] font-black transition-all active:scale-95 group"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                    LinkedIn Profile
                                    <ExternalLink size={11} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 하단 액션 버튼 ── */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-safe">
                  {op.pitchDeckUrl && (
                    <a
                      href={op.pitchDeckUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-[2] flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-[16px] font-black text-sm shadow-lg hover:bg-indigo-600 transition-all active:scale-[0.98]"
                    >
                      <FileText size={18} />
                      {isEn ? "Download Pitch Deck" : "피치덱 다운로드"}
                      <ExternalLink size={13} className="opacity-60" />
                    </a>
                  )}
                  <button
                    onClick={() => { setSelectedOnePager(null); setApplyingToDirectSeller(op?.user); setSellerProposal(""); }}
                    className="flex-1 py-4 bg-indigo-50 border-2 border-indigo-100 text-indigo-700 rounded-[16px] font-black text-sm hover:bg-indigo-100 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
                  >
                    <Sparkles size={18} />
                    {isEn ? "Direct Proposal" : "다이렉트 미팅 제안"}
                  </button>
                  <button
                    onClick={() => setSelectedOnePager(null)}
                    className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-[16px] font-black text-sm hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm"
                  >
                    {isEn ? "Close" : "닫기"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 다이렉트 미팅 제안 매핑 모달 ── */}
      {acceptingDirect && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setAcceptingDirect(null)} />
          <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl relative w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="text-amber-500" size={24} />
                {isEn ? "Accept Direct Proposal" : "제안 수락 및 일정 선택"}
              </h3>
              <button onClick={() => setAcceptingDirect(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              <div>
                <p className="text-sm font-bold text-slate-500 mb-2">
                  {isEn ? "Select an open time slot to assign this meeting." : "비어있는 오픈 스케줄을 선택해 해당 미팅을 매핑해주세요."}
                </p>
                <div className="space-y-3 mt-4">
                  {mySlots.filter((slot: any) => slot.status === 'OPEN').length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center font-bold text-slate-500 text-sm">
                      {isEn ? "No open slots available. Please create a new slot." : "사용 가능한 빈 스케줄이 없습니다. 제너레이터 탭에서 스케줄을 먼저 생성해주세요."}
                    </div>
                  ) : (
                    mySlots.filter((slot: any) => slot.status === 'OPEN').map((slot: any) => (
                      <label key={slot.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${acceptMappingSlotId === String(slot.id) ? 'border-amber-500 bg-amber-50' : 'border-slate-100 hover:border-amber-200'}`}>
                        <input
                          type="radio"
                          name="slotMapping"
                          value={String(slot.id)}
                          checked={acceptMappingSlotId === String(slot.id)}
                          onChange={e => setAcceptMappingSlotId(e.target.value)}
                          className="w-5 h-5 accent-amber-500"
                        />
                        <div className="flex flex-col">
                          <span className="font-black text-slate-700">
                            {formatDateWithDay(slot.startTime)} {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {slot.location && slot.location !== TBA_VALUE && <span className="text-[10px] text-slate-500 font-bold">{slot.location}</span>}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 pt-0 bg-slate-50/50 flex flex-col gap-3 mt-4">
              <button
                onClick={() => {
                  setAcceptingDirect(null);
                  handleTabClick('generator');
                }}
                className="w-full py-4 bg-white border-2 border-indigo-100 text-indigo-600 rounded-[16px] font-black text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus size={18} /> {isEn ? "Create New Slot First" : "새로운 오픈 상담 일정 생성하기"}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setAcceptingDirect(null)}
                  className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-[16px] font-black text-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleConfirmDirectMapping}
                  disabled={!acceptMappingSlotId || isPending}
                  className="flex-[2] py-4 bg-gradient-to-tr from-amber-500 to-amber-400 text-white rounded-[16px] font-black text-sm hover:from-amber-600 hover:to-amber-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
                >
                  {isPending ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  {isEn ? "Assign & Confirm" : "선택 스케줄에 매핑 확정"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Meeting Chat Modal ── */}
      {selectedChatMeeting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedChatMeeting(null)} />
          <div className="bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl relative w-full max-w-[450px] max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <MessageCircle className="text-indigo-500" size={24} />
                {isEn ? "Meeting Chat" : "대화방"}
              </h3>
              <button onClick={() => setSelectedChatMeeting(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors active:scale-95">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-3 sm:p-6 bg-white">
              <MeetingChat meetingId={selectedChatMeeting.id} currentUser={user} isEn={isEn} meeting={selectedChatMeeting} />
            </div>
          </div>
        </div>
      )}

      {/* ── [E] 셀러 슬롯 신청 모달 ── */}
      {applyingToSellerSlot && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setApplyingToSellerSlot(null)} />
          <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl relative w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Handshake className="text-indigo-500" size={24} />
                {isEn ? "Apply for Meeting" : "이 시간에 신청하기"}
              </h3>
              <button onClick={() => setApplyingToSellerSlot(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-sm font-bold text-slate-500">
                {isEn ? "Provide a brief description of your proposal. This helps the seller understand why they should accept this meeting." : "셀러가 제안을 수락할 수 있도록, 왜 미팅이 필요한지 간략한 설명을 남겨주세요."}
              </p>
              <textarea
                value={sellerProposal}
                onChange={e => setSellerProposal(e.target.value)}
                placeholder={isEn ? "e.g., We are interested in your solution for our new project..." : "예) 귀사의 솔루션을 저희의 신규 프로젝트에 도입하고자..."}
                className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors custom-scrollbar"
              />
            </div>
            <div className="p-8 pt-0 flex gap-3">
              <button onClick={() => setApplyingToSellerSlot(null)} className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-[16px] font-black text-sm hover:bg-slate-50 transition-all active:scale-[0.98]">
                {t.common.cancel}
              </button>
              <button onClick={handleApplyToSellerSlot} disabled={isPending || !sellerProposal.trim()} className="flex-[2] py-4 bg-indigo-600 text-white rounded-[16px] font-black text-sm hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                {isPending ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                {isEn ? "Submit Application" : "신청서 제출"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── [E] 다이렉트 제안 모달 (슬롯 없음) ── */}
      {applyingToDirectSeller && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setApplyingToDirectSeller(null)} />
          <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl relative w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="text-amber-500" size={24} />
                {isEn ? "Direct Proposal" : "다이렉트 미팅 제안"}
              </h3>
              <button onClick={() => setApplyingToDirectSeller(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl mb-2 border border-slate-200">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 flex items-center justify-center rounded-lg font-black shrink-0 uppercase">
                  {((isEn && applyingToDirectSeller?.companyNameEn ? applyingToDirectSeller.companyNameEn : applyingToDirectSeller?.companyName) || "S").charAt(0)}
                </div>
                <div>
                  <p className="font-black text-slate-700">
                    {isEn && applyingToDirectSeller?.companyNameEn ? applyingToDirectSeller.companyNameEn : applyingToDirectSeller?.companyName}
                  </p>
                  <p className="text-xs font-bold text-slate-400">To: {isEn && applyingToDirectSeller?.nameEn ? applyingToDirectSeller.nameEn : applyingToDirectSeller?.name}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-500">
                {isEn ? "Write your direct proposal details. If accepted, the seller maps it to their schedule." : "이 기업에게 다이렉트로 제안할 미팅 내용과 목적을 적어주세요. 수락 시 셀러가 스케줄을 선택하여 확정합니다."}
              </p>
              <textarea
                value={sellerProposal}
                onChange={e => setSellerProposal(e.target.value)}
                placeholder={isEn ? "e.g., We are looking for a tech partner like you..." : "예) 귀사의 XX 기술에 많은 관심을 갖고 있어, 도입 논의를 위해 만남을 요청드립니다..."}
                className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:border-amber-500 focus:bg-white transition-colors custom-scrollbar"
              />
            </div>
            <div className="p-8 pt-0 flex gap-3">
              <button onClick={() => setApplyingToDirectSeller(null)} className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-[16px] font-black text-sm hover:bg-slate-50 transition-all active:scale-[0.98]">
                {t.common.cancel}
              </button>
              <button onClick={handleSendDirectToSeller} disabled={isPending || !sellerProposal.trim()} className="flex-[2] py-4 bg-gradient-to-tr from-amber-500 to-amber-400 text-white rounded-[16px] font-black text-sm hover:from-amber-600 hover:to-amber-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-amber-200">
                {isPending ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                {isEn ? "Send Proposal" : "제안 보내기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 스크롤바 CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 16px); }

        @keyframes pulse-red {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(244, 63, 94, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
        }
        .animate-pulse-red {
          animation: pulse-red 2s infinite;
        }
      `}} />
    </div>
  );
}