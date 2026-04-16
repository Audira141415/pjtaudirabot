import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal, Shield, Zap, Send, User, Bot, AlertCircle, Info, Activity, BarChart2, X } from 'lucide-react';

interface LiveMessage {
  platform: 'whatsapp' | 'telegram';
  userId: string;
  userName?: string;
  text: string;
  timestamp: number;
  imageUrl?: string;
  type?: 'received' | 'sent';
}

const LiveTerminal: React.FC = () => {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [takeoverId, setTakeoverId] = useState<string | null>(null);
  const [takeoverPlatform, setTakeoverPlatform] = useState<string | null>(null);
  const [takeoverText, setTakeoverText] = useState('');
  const [takeoverUser, setTakeoverUser] = useState('');
  
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Port 4005 as initialized in LiveChatService
    const socket = io('http://localhost:4005');
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setMessages(prev => [...prev, {
        platform: 'whatsapp',
        userId: 'system',
        text: 'SIGNAL BRIDGE ESTABLISHED — ENCRYPTED STREAM ACTIVE',
        timestamp: Date.now(),
        type: 'received'
      }]);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('chat:message', (data: any) => {
      setMessages(prev => [...prev, { ...data, type: 'received' }]);
    });

    socket.on('bot:event', (event: any) => {
       if (event.type === 'message.sent') {
         setMessages(prev => [...prev, { ...event.data, userName: 'AudiraBot V2.0', type: 'sent' }]);
       }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleTakeover = (msg: LiveMessage) => {
    setTakeoverId(msg.userId);
    setTakeoverPlatform(msg.platform);
    setTakeoverUser(msg.userName || msg.userId);
  };

  const sendTakeoverResponse = () => {
    if (!takeoverText.trim() || !takeoverId || !takeoverPlatform || !socketRef.current) return;

    socketRef.current.emit('agent:takeover', {
      platform: takeoverPlatform,
      userId: takeoverId,
      text: takeoverText
    });

    setTakeoverText('');
    setTakeoverId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tight flex items-center gap-2">
            <Terminal className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            LIVE <span className="text-indigo-600 dark:text-indigo-400">TERMINAL</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Strategic Signal Bridge — Alpha Stream</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-sm ${connected ? 'border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-600'}`}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-[10px] font-black tracking-widest uppercase">{connected ? 'Stream Connected' : 'Seeking Signal...'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[70vh]">
        {/* Terminal Main View */}
        <div className="lg:col-span-3 bg-slate-950 rounded-[32px] border border-slate-900 dark:border-indigo-500/20 flex flex-col overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="p-4 border-b border-indigo-500/10 bg-black/40 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 px-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="ml-4 text-[10px] font-black font-mono text-indigo-400/40 uppercase tracking-widest italic">AUDIRA_NOC_TERMINAL_V3.log</span>
            </div>
            <Shield className="w-4 h-4 text-indigo-500/20" />
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-8 space-y-6 font-mono text-xs custom-scrollbar"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-indigo-500/10 gap-4">
                <Zap className="w-16 h-16 animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.6em]">AWAITING SYSTEM TRANSMISSIONS</p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.type === 'sent' ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className="flex items-center gap-2 mb-2 px-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${msg.type === 'sent' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                    {msg.type === 'sent' ? 'SYSTEM_OUTPUT' : 'INPUT_STREAM'}
                  </span>
                  <span className="text-[9px] text-slate-700 tracking-tighter font-black">
                    [{new Date(msg.timestamp).toLocaleTimeString([], { hour12: false })}]
                  </span>
                </div>
                
                <div className={`relative max-w-[85%] p-5 rounded-2xl border transition-all ${
                  msg.type === 'sent' 
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-100 shadow-[0_0_20px_rgba(99,102,241,0.05)]' 
                    : 'bg-white/5 border-white/10 text-slate-300'
                }`}>
                  <div className="flex items-start gap-4">
                    {msg.type === 'sent' ? (
                      <div className="shrink-0 mt-1 p-2 bg-indigo-500/20 rounded-lg"><Bot className="w-4 h-4 text-indigo-400" /></div>
                    ) : (
                      <div className="shrink-0 mt-1 p-2 bg-emerald-500/10 rounded-lg"><User className="w-4 h-4 text-emerald-400" /></div>
                    )}
                    <div className="space-y-2">
                      {msg.userName && <p className="text-[10px] font-black text-indigo-400/40 uppercase tracking-widest mb-1 italic">{msg.userName} @ {msg.platform.toUpperCase()}</p>}
                      <p className="leading-relaxed whitespace-pre-wrap break-all font-medium">{msg.text}</p>
                      {msg.imageUrl && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-white/10 max-w-sm shadow-2xl">
                          <img src={msg.imageUrl} alt="Stream Evidence" className="w-full h-auto" />
                          <div className="bg-black/80 p-2 text-[8px] font-black text-center text-indigo-400/40 uppercase tracking-widest italic">VISUAL_EXTRACTION_ACK</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {msg.type !== 'sent' && msg.userId !== 'system' && (
                    <button 
                      onClick={() => handleTakeover(msg)}
                      className="absolute -right-3 -bottom-3 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-2xl shadow-indigo-600/50"
                    >
                      <Zap className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Takeover Input Bar */}
          {takeoverId && (
            <div className="p-6 bg-indigo-600/10 border-t border-indigo-500/30 animate-in slide-in-from-bottom duration-300 backdrop-blur-md">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3 text-indigo-400">
                    <div className="p-2 bg-indigo-500/20 rounded-lg animate-pulse"><AlertCircle className="w-4 h-4" /></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Agent Takeover Mode: Intercepting {takeoverUser}</span>
                 </div>
                 <button onClick={() => setTakeoverId(null)} className="p-2 text-indigo-400/50 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
               </div>
               <div className="flex gap-4">
                  <input 
                    type="text"
                    value={takeoverText}
                    onChange={(e) => setTakeoverText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendTakeoverResponse()}
                    placeholder={`TYPE COGNITIVE OVERRIDE FOR ${takeoverPlatform?.toUpperCase() ?? 'PLATFORM'}...`}
                    className="flex-1 bg-black/60 border border-indigo-500/50 rounded-xl px-6 py-4 text-sm text-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono placeholder:text-indigo-900 shadow-inner"
                    autoFocus
                  />
                  <button 
                    onClick={sendTakeoverResponse}
                    disabled={!takeoverText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-xl text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50 shadow-xl shadow-indigo-600/30 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    Transmit
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none transition-all hover:shadow-xl">
             <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-6">
               <Info className="w-4 h-4 text-indigo-500" />
               Bridge Intel
             </h3>
             <div className="space-y-4">
                {[
                  { label: 'SESSION_UPTIME', value: '02:24:15:10', color: 'text-indigo-600 dark:text-indigo-400' },
                  { label: 'THROUGHPUT', value: '4.2 KB/s', color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'ACTIVE_HOOKS', value: '2 [WA_TG]', color: 'text-amber-600 dark:text-amber-400' }
                ].map((stat, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-700 uppercase">{stat.label}</span>
                    <span className={`text-[10px] font-black font-mono shadow-sm ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none transition-all hover:shadow-xl">
             <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-6">
               <Activity className="w-4 h-4 text-emerald-500" />
               Predictive Analytics
             </h3>
             <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] uppercase font-black tracking-widest">
                    <span className="text-slate-400 dark:text-slate-700">Current Risk Index</span>
                    <span className="text-slate-900 dark:text-white">42%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 w-[42%] shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                   <div className="flex items-center gap-2 mb-4">
                      <BarChart2 className="w-4 h-4 text-indigo-500" />
                      <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-700 tracking-widest">Next 6H Forecast</span>
                   </div>
                   <div className="flex items-end gap-1.5 h-16">
                      {[15, 20, 45, 80, 70, 40].map((h, idx) => (
                        <div key={idx} className="flex-1 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-t-lg hover:bg-indigo-600 dark:hover:bg-indigo-400 transition-all cursor-pointer relative group" style={{ height: `${h}%` }}>
                           <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-xl">+{idx}H</div>
                        </div>
                      ))}
                   </div>
                   <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-4 italic">Peak at T+3H (Shift Change)</p>
                </div>
             </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-950/40 rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 border-dashed">
             <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-4">
               <Shield className="w-4 h-4 text-slate-600" />
               Security Context
             </h3>
             <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-500 italic font-medium">
               All transmissions are captured via strategic signal bridge. Data is sanitized before reflection to the NOC dashboard. Vision analysis automatically extracts metadata from image streams.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTerminal;
