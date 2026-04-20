import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { io, Socket } from 'socket.io-client';
import { 
  Inbox, Star, Archive, Mail, Search, Filter, 
  ChevronDown, MessageSquare, Send, CheckCircle2, 
  Clock, Hash, BadgeCheck, Zap, Paperclip, MoreVertical,
  Orbit, Layers, Cpu, Fingerprint, Activity, Info,
  Power, Target, RefreshCw, Smartphone,
  MoreHorizontal, ShieldCheck, UserCircle, SendHorizontal, Terminal
} from 'lucide-react';
import { toast } from '../components/Toast';

const PLATFORM_ICONS: Record<string, JSX.Element> = {
  WHATSAPP: <Zap className="w-4 h-4" />,
  TELEGRAM: <Send className="w-4 h-4" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  WHATSAPP: 'bg-emerald-500 text-white',
  TELEGRAM: 'bg-sky-500 text-white',
};

const SENTIMENT_STYLE: Record<string, { emoji: string; color: string; bg: string }> = {
  POSITIVE: { emoji: '😊', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  NEGATIVE: { emoji: '😠', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
  NEUTRAL: { emoji: '😐', color: 'text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  MIXED: { emoji: '🤔', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' }
};

export default function UnifiedInbox() {
  const [messages, setMessages] = useState<Array<Record<string, any>>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<'all' | 'unread' | 'starred' | 'archived'>('all');
  const [platformFilter, setPlatformFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const socketsRef = useRef<Record<string, Socket>>({});
  const [activeSockets, setActiveSockets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const STREAMS = [
      { id: 'whatsapp', port: 4005 },
      { id: 'telegram', port: 4006 }
    ];
    STREAMS.forEach(stream => {
      const hostname = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
      const socket = io(`http://${hostname}:${stream.port}`);
      socketsRef.current[stream.id] = socket;
      socket.on('connect', () => setActiveSockets(prev => ({ ...prev, [stream.id]: true })));
      socket.on('disconnect', () => setActiveSockets(prev => ({ ...prev, [stream.id]: false })));
    });

    return () => {
      Object.values(socketsRef.current).forEach(s => s.disconnect());
    };
  }, []);

  const load = async () => {
    setLoading(true);
    const filters: Record<string, string> = {};
    if (platformFilter) filters.platform = platformFilter;
    if (search) filters.search = search;
    if (tab === 'unread') filters.isRead = 'false';
    if (tab === 'starred') filters.isStarred = 'true';
    if (tab === 'archived') filters.isArchived = 'true';
    try {
      const res = await api.getInbox(1, filters);
      setMessages(res.data);
      setUnreadCount(res.unreadCount);
      setTotal(res.pagination.total);
    } catch { 
      toast({ type: 'error', title: 'REPOSITORY_SYNC_FAILURE', message: 'Failed to synchronize unified command ledgers.' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab, platformFilter, search]);

  const handleToggleRead = async (msg: Record<string, any>) => {
    try {
       await api.updateInboxMessage(msg.id as string, { isRead: !msg.isRead });
       load();
    } catch (err) {
       toast({ type: 'error', title: 'READ_STATUS_FAILURE', message: 'Failed to update message resolution state.' });
    }
  };

  const handleToggleStar = async (msg: Record<string, any>) => {
    try {
       await api.updateInboxMessage(msg.id as string, { isStarred: !msg.isStarred });
       load();
    } catch (err) {
       toast({ type: 'error', title: 'FLAG_UPDATE_FAILURE', message: 'Failed to modify message priority marker.' });
    }
  };

  const handleArchive = async (msg: Record<string, any>) => {
    try {
       await api.updateInboxMessage(msg.id as string, { isArchived: true });
       if (selected?.id === msg.id) setSelected(null);
       toast({ type: 'success', title: 'SIGNAL_ARCHIVED', message: 'Transmission has been committed to persistent storage.' });
       load();
    } catch (err) {
       toast({ type: 'error', title: 'ARCHIVE_FAILURE', message: 'Failed to commit transmission to archive.' });
    }
  };

  const handleMarkAllRead = async () => {
    try {
       await api.markAllInboxRead();
       toast({ type: 'info', title: 'PROTOCOL_EXECUTED', message: 'All pending signals transitioned to resolved state.' });
       load();
    } catch (err) {
       toast({ type: 'error', title: 'BATCH_ACTION_FAILURE', message: 'Resolution protocol was interrupted.' });
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selected) return;
    
    // Default fallback JID pattern for whatsapp if fromUserId/fromNumber missing
    let targetUserId = selected.fromUserId as string;
    if (!targetUserId && selected.fromNumber) {
      targetUserId = `${(selected.fromNumber as string).replace('+', '')}@s.whatsapp.net`;
    }

    if (!targetUserId) {
      toast({ type: 'error', title: 'TARGET_UNKNOWN', message: 'Missing target User ID or Pointer.' });
      return;
    }

    const platformKey = (selected.platform as string).toLowerCase();
    const socket = socketsRef.current[platformKey];

    if (socket && activeSockets[platformKey]) {
      setIsReplying(true);
      socket.emit('agent:takeover', {
        platform: platformKey,
        userId: targetUserId,
        text: replyText
      });
      
      // Assume success since we rely on event stream
      setTimeout(() => {
         toast({ type: 'success', title: 'TRANSMISSION_SENT', message: 'Reply payload dispatched to target node successfully.' });
         setReplyText('');
         setIsReplying(false);
         // Auto-mark as read, optionally
         if (!selected.isRead) handleToggleRead(selected);
      }, 800);
    } else {
      toast({ type: 'error', title: 'NODE_DISCONNECTED', message: `Target platform socket (${platformKey}) is currently unavailable.` });
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Orbit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Omni-Channel Command Subsystem</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Unified Command</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Intercept real-time communication signals from all connected platform endpoints.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {unreadCount > 0 && (
             <div className="px-8 py-4 bg-rose-600 text-white rounded-[28px] flex items-center gap-4 shadow-2xl shadow-rose-600/40 animate-pulse border-2 border-rose-400/20">
                <BadgeCheck className="w-6 h-6" />
                <span className="text-[11px] font-black uppercase tracking-widest">{unreadCount} UNRESOLVED_SIGNALS</span>
             </div>
          )}
          <button 
             onClick={handleMarkAllRead} 
             className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-all bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[28px] flex items-center gap-3 shadow-sm hover:border-indigo-500/30 active:scale-95"
          >
             <CheckCircle2 className="w-4 h-4" /> BATCH_RESOLVE
          </button>
          <button 
             onClick={load} 
             className="p-5 bg-indigo-600 text-white rounded-[24px] shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 border-2 border-indigo-400/20"
          >
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-5">
        <div className="flex bg-white dark:bg-slate-950/40 p-2 rounded-[36px] border border-slate-100 dark:border-slate-800/80 shadow-sm backdrop-blur-3xl">
          {[
            { key: 'all', icon: <Hash className="w-4 h-4" />, label: `ALL_SIGNALS (${total})` },
            { key: 'unread', icon: <Clock className="w-4 h-4" />, label: `PENDING (${unreadCount})` },
            { key: 'starred', icon: <Star className="w-4 h-4" />, label: 'FLAGGED' },
            { key: 'archived', icon: <Archive className="w-4 h-4" />, label: 'PERSISTENT' },
          ].map(t => (
            <button 
              key={t.key} 
              onClick={() => setTab(t.key as any)}
              className={`px-8 py-4 rounded-[28px] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${
                tab === t.key 
                  ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 active:scale-95 translate-y-[-2px]' 
                  : 'text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-white'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        
        <div className="relative min-w-[240px] group">
          <select 
             className="w-full pl-8 pr-12 py-5 bg-white dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white rounded-[32px] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 outline-none appearance-none transition-all font-black text-[10px] uppercase tracking-widest shadow-sm cursor-pointer"
             value={platformFilter} 
             onChange={e => setPlatformFilter(e.target.value)}
          >
            <option value="">OMNI_DIRECTIONAL</option>
            <option value="WHATSAPP">WHATSAPP_NODE</option>
            <option value="TELEGRAM">TELEGRAM_NODE</option>
          </select>
          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-700 pointer-events-none group-hover:text-indigo-500 transition-colors" />
        </div>

        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 dark:text-slate-700 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            className="w-full pl-16 pr-8 py-5 bg-white dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white rounded-[32px] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800 font-bold text-sm tracking-tight shadow-sm" 
            placeholder="Interrogate signal content or identity handle..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10" style={{ minHeight: '70vh' }}>
        {/* Signal Stream Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950/40 rounded-[56px] border border-slate-100 dark:border-slate-800/80 overflow-hidden backdrop-blur-3xl shadow-sm flex flex-col transition-all hover:border-indigo-500/20">
          <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-slate-950">
             <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest italic">{messages.length} ACTIVE_CHANNELS</span>
             </div>
             <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <MoreHorizontal className="w-4 h-4 text-slate-400" />
             </div>
          </div>
          {loading && messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20">
               <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mb-4" />
               <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest animate-pulse font-mono">SYNCHRONIZING_BUFFER...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-24 text-center opacity-20 grayscale transition-all hover:opacity-100">
               <Mail className="w-24 h-24 text-slate-300 dark:text-slate-700 mb-8" />
               <p className="text-[12px] font-black uppercase tracking-[0.6em] text-slate-400 dark:text-slate-500 leading-relaxed italic">EMPTY_SIGNAL_STREAM</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-white/5 custom-scrollbar bg-white dark:bg-transparent">
              {messages.map(msg => {
                const isSelected = selected?.id === msg.id;
                const sentiment = SENTIMENT_STYLE[msg.sentiment as string];
                return (
                  <div 
                    key={msg.id as string} 
                    onClick={() => { setSelected(msg); if (!msg.isRead) handleToggleRead(msg); }}
                    className={`p-8 cursor-pointer transition-all relative overflow-hidden group ${
                      isSelected ? 'bg-indigo-600 shadow-2xl z-20 scale-[1.02] rounded-[32px] mx-4 my-2 translate-x-1 border border-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-indigo-500/5'
                    } ${!msg.isRead && !isSelected ? 'bg-indigo-50/40 dark:bg-indigo-500/5' : ''}`}
                  >
                    {!msg.isRead && !isSelected && (
                       <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-indigo-600 shadow-[2px_0_10px_rgba(79,70,229,0.5)]" />
                    )}
                    
                    <div className="flex items-center gap-4 mb-4 relative z-10">
                      <div className={`w-10 h-10 rounded-2xl ${isSelected ? 'bg-white/20 text-white animate-pulse' : PLATFORM_COLORS[msg.platform as string]} flex items-center justify-center shadow-xl border border-white/10 group-hover:rotate-6 transition-transform`}>
                        {PLATFORM_ICONS[msg.platform as string]}
                      </div>
                      <div className="overflow-hidden">
                        <span className={`text-base font-black tracking-tighter uppercase italic truncate block ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors'}`}>
                          {msg.fromName as string}
                        </span>
                        <div className="flex items-center gap-2">
                           <span className={`text-[9px] font-black font-mono tracking-widest ${isSelected ? 'text-indigo-100 shadow-black/20' : 'text-slate-400 dark:text-slate-600'}`}>
                             NODE_INTERCEPT: {new Date(msg.createdAt as string).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                           {!!msg.isStarred && <Star className={`w-3.5 h-3.5 fill-current ${isSelected ? 'text-amber-300' : 'text-amber-500'}`} />}
                        </div>
                      </div>
                    </div>

                    <p className={`text-[13px] leading-relaxed line-clamp-2 italic font-black uppercase tracking-tight ${
                      isSelected ? 'text-indigo-50 drop-shadow-sm' : !msg.isRead ? 'text-slate-800 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'
                    }`}>
                      "{msg.content as string}"
                    </p>

                    <div className="mt-5 flex items-center justify-between relative z-10">
                       <div className="flex items-center gap-3">
                          {!!msg.groupName && (
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border-2 transition-all ${
                              isSelected ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                            }`}>
                               {msg.groupName as string}
                            </span>
                          )}
                          {!!msg.mediaType && <Paperclip className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-indigo-500 animate-bounce'}`} />}
                       </div>
                       {sentiment && (
                          <div className={`px-4 py-1 rounded-xl flex items-center gap-2 border shadow-inner transition-all ${isSelected ? 'bg-white/10 border-white/20 text-white' : sentiment.bg + ' ' + sentiment.color + ' border-current opacity-70'}`}>
                             <span className="text-sm">{sentiment.emoji}</span>
                             <span className="text-[9px] font-black uppercase tracking-widest">{msg.sentiment as string}</span>
                          </div>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Command Detail Terminal Panel */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-950/40 rounded-[56px] border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col relative overflow-hidden backdrop-blur-3xl transition-all hover:border-indigo-500/20">
          <div className="absolute top-0 right-0 p-16 opacity-[0.05] dark:opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
             <Fingerprint className="w-80 h-80 text-indigo-500" />
          </div>

          {selected ? (
            <>
              <div className="p-12 border-b border-slate-100 dark:border-white/5 relative z-20 bg-white/50 dark:bg-slate-950/50 backdrop-blur-3xl">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                  <div className="flex items-center gap-8">
                    <div className={`w-20 h-20 rounded-[32px] ${PLATFORM_COLORS[selected.platform as string]} flex items-center justify-center text-4xl shadow-2xl border-4 border-white/20 group-hover:rotate-6 transition-transform`}>
                      {PLATFORM_ICONS[selected.platform as string]}
                    </div>
                    <div>
                      <h3 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none underline decoration-indigo-600/30 underline-offset-[16px] decoration-4 mb-4">{selected.fromName as string}</h3>
                      <div className="flex flex-wrap items-center gap-4 mt-6">
                         <div className="flex items-center gap-3 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black font-mono tracking-widest uppercase">
                            NODE: {selected.platform as string}
                         </div>
                         {!!selected.fromNumber && (
                           <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-600 rounded-xl text-[10px] font-black font-mono tracking-widest uppercase">
                              PTR: {selected.fromNumber as string}
                           </div>
                         )}
                         <div className="flex items-center gap-3 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black font-mono tracking-widest uppercase italic">
                            SIGNAL_SECURED
                         </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <button 
                       onClick={() => handleToggleStar(selected)} 
                       className={`w-16 h-16 rounded-[28px] transition-all active:scale-95 border-2 flex items-center justify-center ${
                         selected.isStarred 
                           ? 'bg-amber-500 text-white border-amber-400 shadow-2xl shadow-amber-500/40' 
                           : 'bg-white dark:bg-slate-950 text-slate-300 dark:text-slate-800 border-slate-100 dark:border-slate-800 hover:border-amber-400/50 hover:text-amber-500 shadow-sm'
                       }`}
                    >
                      <Star className={`w-7 h-7 ${selected.isStarred ? 'fill-current' : ''}`} />
                    </button>
                    <button onClick={() => handleArchive(selected)} className="w-16 h-16 bg-white dark:bg-slate-950 text-slate-300 dark:text-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-[28px] hover:bg-rose-600 hover:text-white hover:border-rose-400 transition-all active:scale-95 shadow-sm flex items-center justify-center">
                       <Archive className="w-7 h-7" />
                    </button>
                    <button 
                       onClick={() => handleToggleRead(selected)} 
                       className={`px-10 h-16 rounded-[28px] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-95 border-2 ${
                         selected.isRead 
                         ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-800' 
                         : 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/40 hover:bg-indigo-700'
                       }`}
                    >
                      {selected.isRead ? 'RE_ACTIVATE_SIGNAL' : 'MARK_AS_RESOLVED'}
                    </button>
                  </div>
                </div>
                {!!selected.groupName && (
                   <div className="inline-flex items-center gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl mt-12 transition-all hover:border-indigo-500/30">
                      <Hash className="w-5 h-5 text-indigo-500" />
                      <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest italic">SOURCE_LEDGER: <span className="text-slate-900 dark:text-white font-mono">{selected.groupName as string}</span></span>
                   </div>
                )}
                <div className="flex items-center gap-6 mt-10">
                   <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.2em] italic font-mono">
                      <Clock className="w-4 h-4 text-indigo-500" /> NODAL_HANDSHAKE: {new Date(selected.createdAt as string).toLocaleString()}
                   </div>
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                   <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.2em] italic font-mono">
                      <Target className="w-4 h-4 text-emerald-500" /> SIGNAL_HEALTH: 100%
                   </div>
                </div>
              </div>

              <div className="flex-1 p-12 overflow-y-auto custom-scrollbar relative z-20">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-[56px] p-12 border-2 border-slate-100 dark:border-white/5 shadow-inner relative group/msg">
                  <div className="absolute left-0 top-12 bottom-12 w-2 bg-indigo-600/30 group-hover/msg:bg-indigo-600 transition-all rounded-r-full" />
                  <p className="text-2xl text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed font-black transition-all animate-in fade-in slide-in-from-bottom-4 duration-700 italic tracking-tighter uppercase drop-shadow-sm">
                    "{selected.content as string}"
                  </p>
                </div>

                {!!selected.mediaUrl && (
                  <div className="mt-10 p-10 bg-indigo-600 text-white rounded-[56px] flex flex-col md:flex-row items-center justify-between gap-8 group/media transition-all hover:bg-indigo-700 shadow-2xl shadow-indigo-600/30 relative overflow-hidden">
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover/media:opacity-30 transition-opacity">
                       <Smartphone className="w-40 h-40" />
                    </div>
                    <div className="flex items-center gap-8 relative z-10">
                       <div className="w-20 h-20 bg-white/20 rounded-[32px] flex items-center justify-center border-2 border-white/20 shadow-xl group-hover/media:rotate-12 transition-transform">
                          <Paperclip className="w-10 h-10" />
                       </div>
                       <div>
                          <p className="text-sm font-black uppercase tracking-[0.3em] mb-2 leading-none">Transmission Payload Attached</p>
                          <p className="text-[11px] text-indigo-100 font-mono font-bold uppercase tracking-widest opacity-80">BUFFER_TYPE: {selected.mediaType as string} // STATE: READY</p>
                       </div>
                    </div>
                    <button className="px-10 py-5 bg-white text-indigo-600 rounded-[28px] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.05] active:scale-95 transition-all relative z-10">
                       EXTRACT_PAYLOAD
                    </button>
                  </div>
                )}
                
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                   {!!selected.sentiment && (
                      <div className={`p-8 rounded-[48px] border-2 ${SENTIMENT_STYLE[selected.sentiment as string].bg} ${SENTIMENT_STYLE[selected.sentiment as string].color} border-current opacity-80 flex flex-col items-center justify-center text-center shadow-inner group/sent transition-all hover:opacity-100`}>
                         <div className="w-20 h-20 bg-white/20 rounded-[32px] flex items-center justify-center mb-6 text-5xl shadow-lg border border-white/10 group-hover/sent:scale-110 transition-transform">{SENTIMENT_STYLE[selected.sentiment as string].emoji}</div>
                         <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 font-mono italic">AFFECTIVE_RESONANCE</span>
                         <span className="text-3xl font-black italic uppercase tracking-tighter">{selected.sentiment as string}</span>
                      </div>
                   )}
                   {!!selected.tags && (selected.tags as string[]).length > 0 && (
                      <div className="space-y-6 bg-slate-50 dark:bg-slate-900 p-8 rounded-[48px] border-2 border-slate-100 dark:border-white/5 shadow-inner">
                         <div className="flex items-center gap-4 px-2">
                             <Cpu className="w-5 h-5 text-indigo-500" />
                             <span className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] italic font-mono">SEMANTIC_LEXICON</span>
                         </div>
                         <div className="flex gap-3 flex-wrap">
                            {(selected.tags as string[]).map((tag, i) => (
                              <span key={i} className="px-5 py-2.5 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-indigo-500/10 transition-all cursor-default shadow-sm italic">
                                # {tag}
                              </span>
                            ))}
                         </div>
                      </div>
                   )}
                 </div>

                 <div className="mt-12 w-full">
                    <div className="relative">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Draft response payload here..."
                        className="w-full h-32 p-6 pr-24 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all resize-none shadow-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                        onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleReply();
                           }
                        }}
                      />
                      <button
                        onClick={handleReply}
                        disabled={!replyText.trim() || isReplying}
                        className="absolute right-4 bottom-4 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
                      >
                        <SendHorizontal className={`w-5 h-5 ${isReplying ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3 px-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono italic flex items-center gap-2">
                        <Terminal className="w-3 h-3" /> Press Enter to send, Shift+Enter for newline
                      </span>
                      {activeSockets[(selected.platform as string).toLowerCase()] ? (
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest font-mono italic flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> NODE_CONNECTED</span>
                      ) : (
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest font-mono italic flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> NODE_DISCONNECTED</span>
                      )}
                    </div>
                 </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-24 text-center">
              <div className="w-40 h-40 rounded-[64px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center mb-10 border-4 border-slate-100 dark:border-white/5 shadow-2xl animate-pulse group">
                 <Power className="w-16 h-16 text-slate-200 dark:text-slate-800 group-hover:text-indigo-500 transition-colors" />
              </div>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-4 uppercase italic tracking-tighter underline decoration-indigo-600/30 decoration-8 underline-offset-[16px]">Command Standby</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm text-sm uppercase tracking-widest leading-relaxed mt-4 italic">Pilih transmisi dari feed taktis di kiri untuk melakukan dekripsi sinyal & analisis heuristik metadata.</p>
            </div>
          )}
        </div>
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Command Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Unified Signal Intelligence Matrices Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Omni-channel command engineering ensures 100% precision in signal interception across all connected platform nodes.</span>
         </div>
      </div>
    </div>
  );
}
