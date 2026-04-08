"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Send, RefreshCw, ChevronDown } from "lucide-react";

export default function MeetingChat({ meetingId, currentUser, isEn, meeting }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const updateLastRead = (latestMsgTime?: number) => {
    if (!meetingId || !currentUser?.id) return;
    const timeToSave = latestMsgTime ? Math.max(Date.now(), latestMsgTime + 1000) : Date.now() + 5000;
    localStorage.setItem(`lastRead_${currentUser.id}_${meetingId}`, timeToSave.toString());
    window.dispatchEvent(new Event('messagesRead'));
  };

  const fetchMessages = async (isInitial = false) => {
    try {
      const res = await fetch(`/api/messages?meetingId=${meetingId}`);
      if (res.ok) {
        const data = await res.json();
        
        // 새 메시지 감지 로직
        if (!isInitial && data.length > messages.length) {
          if (!isAtBottom) {
            setHasNewMessage(true);
          }
        }
        setMessages(data);
        if (data.length > 0) {
          const latestMsgTime = new Date(data[data.length - 1].createdAt).getTime();
          updateLastRead(latestMsgTime);
        }
      }
    } catch(e) {
      console.error(e);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(true);
    updateLastRead();
    const interval = setInterval(() => fetchMessages(false), 5000); // 5초로 폴링 간격 단축
    return () => clearInterval(interval);
  }, [meetingId]);

  // 스크롤 동기화
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessage(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    setIsAtBottom(isBottom);
    if (isBottom) setHasNewMessage(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    const content = input;
    setInput(""); // 낙관적 업데이트를 위해 비움
    
    try {
      const res = await fetch(`/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, content })
      });
      if (res.ok) {
        await fetchMessages(false);
        scrollToBottom();
      } else {
        setInput(content); // 실패 시 복구
      }
    } catch(err) {
      console.error(err);
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const displayCompanyName = (entity: any) => {
    if (!entity) return "-";
    return (isEn && entity.companyNameEn) ? entity.companyNameEn : (entity.companyName || "-");
  };

  // 메시지 그룹화 로직 (동일 발신자, 5분 이내 연속 메시지)
  const groupedMessages = useMemo(() => {
    return messages.map((msg, index) => {
      const prevMsg = messages[index - 1];
      const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
      
      const prevTime = prevMsg ? new Date(prevMsg.createdAt).getTime() : 0;
      const currTime = new Date(msg.createdAt).getTime();
      const isWithinTime = (currTime - prevTime) < 1000 * 60 * 5; // 5분 이내
      
      return {
        ...msg,
        isGrouped: isSameSender && isWithinTime
      };
    });
  }, [messages]);

  if (loading) return (
    <div className="h-[500px] flex items-center justify-center bg-slate-50/50 rounded-[32px] border border-slate-100 italic font-bold text-slate-300">
      <RefreshCw className="animate-spin mr-2" size={18}/> {isEn ? "Loading..." : "불러오는 중..."}
    </div>
  );

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 flex-1 relative group/chat transition-all duration-500 hover:shadow-indigo-100/50">
      
      {/* 헤더 */}
      <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-50 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-inner">
            <Send size={14} className="rotate-[-20deg]" />
          </div>
          <div>
            <h4 className="text-[13px] font-black text-slate-800 tracking-tight">
              {isEn ? "Match Connect" : "미팅 다이렉트 챗"}
              {meeting?.pic && (
                <span className="ml-2 text-[10px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100 uppercase">
                  PIC: {(isEn && meeting.pic.nameEn) ? meeting.pic.nameEn : meeting.pic.name}
                </span>
              )}
            </h4>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                {isEn ? "Live" : "실시간 연결됨"} 
                {meeting?.buyer && meeting?.seller && (
                  <span className="ml-1 opacity-60">
                    ({displayCompanyName(meeting.buyer)} ↔ {displayCompanyName(meeting.seller)})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => fetchMessages(false)} 
          className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
          title={isEn ? "Refresh" : "새로고침"}
        >
          <RefreshCw size={14} className={sending ? "animate-spin" : ""}/>
        </button>
      </div>

      {/* 메시지 영역 */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-1 custom-scrollbar scroll-smooth bg-slate-50/30"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300">
              <Send size={28} className="translate-x-1" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black">{isEn ? "Start a conversation" : "대화를 시작해보세요"}</p>
              <p className="text-[11px] font-bold mt-1">{isEn ? "Messages are encrypted & secure" : "모든 대화는 안전하게 암호화됩니다"}</p>
            </div>
          </div>
        ) : (
          groupedMessages.map((msg, i) => {
            const isMe = msg.senderId === currentUser?.id;
            const senderName = isEn ? (msg.sender.nameEn || msg.sender.name) : msg.sender.name;
            const showMetadata = !msg.isGrouped;
            const msgDate = new Date(msg.createdAt);
            
            return (
              <div key={msg.id} className={`flex flex-col ${showMetadata ? 'mt-5' : 'mt-0.5'} ${isMe ? "items-end" : "items-start"}`}>
                
                {/* 발신자 정보 (그룹화 안된 경우에만) */}
                {showMetadata && !isMe && (
                  <div className="flex items-center gap-2 mb-1.5 ml-1">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 font-black text-[10px] text-indigo-600 shadow-sm uppercase">
                      {msg.sender.companyName?.[0] || 'S'}
                    </div>
                    <span className="text-[11px] font-black text-slate-600">{msg.sender.companyName} <span className="text-slate-400 font-bold opacity-70">· {senderName}</span></span>
                  </div>
                )}

                {/* 메시지 본문 */}
                <div className="group relative max-w-[85%] flex items-end gap-2">
                  {isMe && <span className="text-[9px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1">{msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                  
                  <div className={`px-4 py-2.5 rounded-[20px] text-[13px] font-bold leading-relaxed shadow-sm transition-all duration-300 ${
                    isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-[4px] hover:shadow-lg hover:shadow-indigo-200' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-[4px] hover:shadow-md hover:border-slate-200'
                  } ${msg.isGrouped && !isMe ? 'rounded-tl-[20px]' : ''} ${msg.isGrouped && isMe ? 'rounded-tr-[20px]' : ''}`}>
                    {msg.content}
                  </div>

                  {!isMe && <span className="text-[9px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1">{msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* 새 메시지 알림 토스트 (스크롤 위로 올렸을 때만) */}
      {hasNewMessage && (
        <button 
          onClick={scrollToBottom}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-slate-900 text-white rounded-full text-[11px] font-black shadow-2xl flex items-center gap-2 animate-bounce z-20 hover:bg-indigo-600 transition-colors"
        >
          <ChevronDown size={14} />
          {isEn ? "New Message Below" : "새로 도착한 메시지"}
        </button>
      )}

      {/* 입력창 */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-50 z-10 shrink-0">
        <div className="relative flex items-end gap-2 bg-slate-50 p-1.5 rounded-[24px] border border-slate-100 focus-within:bg-white focus-within:border-indigo-200 focus-within:ring-4 focus-within:ring-indigo-50 transition-all duration-300">
          <textarea 
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as any);
              }
            }}
            placeholder={isEn ? "Type a secret match message..." : "매칭 메시지를 입력하세요..."}
            className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-[13px] font-bold text-slate-800 outline-none resize-none max-h-32 custom-scrollbar placeholder:text-slate-400"
          />
          <button 
            disabled={!input.trim() || sending} 
            className="w-11 h-11 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-100 hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-indigo-600 flex items-center justify-center shrink-0 transition-all duration-300 active:scale-90"
          >
            {sending ? <RefreshCw size={16} className="animate-spin"/> : <Send size={18} className="translate-x-0.5 -translate-y-0.5" />}
          </button>
        </div>
      </form>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
