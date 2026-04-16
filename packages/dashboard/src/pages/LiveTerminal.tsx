import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal, Shield, Zap, Send, User, Bot, AlertCircle, Info, Activity, BarChart2 } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white italic tracking-tight flex items-center gap-2">
            <Terminal className="w-8 h-8 text-indigo-400" />
            LIVE <span className="text-indigo-400">TERMINAL</span>
          </h1>
          <p className="text-white/50 text-sm mt-1 uppercase tracking-widest font-medium">Strategic Signal Bridge — Alpha Stream</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${connected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs font-bold tracking-tighter uppercase">{connected ? 'Stream Connected' : 'Seeking Signal...'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[70vh]">
        {/* Terminal Main View */}
        <div className="lg:col-span-3 glass-dark rounded-2xl border border-white/5 flex flex-col overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
              </div>
              <span className="ml-4 text-xs font-mono text-white/40">AUDIRA_NOC_TERMINAL_V3.log</span>
            </div>
            <Shield className="w-4 h-4 text-white/20" />
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-sm custom-scrollbar"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-white/20 gap-4 opacity-50">
                <Zap className="w-12 h-12" />
                <p className="animate-pulse">AWAITING SYSTEM TRANSMISSIONS...</p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.type === 'sent' ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className={`text-[10px] font-bold uppercase ${msg.type === 'sent' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                    {msg.type === 'sent' ? 'System_Output' : 'Input_Stream'}
                  </span>
                  <span className="text-[10px] text-white/20 tracking-tighter">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false })}
                  </span>
                </div>
                
                <div className={`relative max-w-[80%] p-3 rounded-xl border ${
                  msg.type === 'sent' 
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-100' 
                    : 'bg-white/5 border-white/10 text-white/90'
                }`}>
                  <div className="flex items-start gap-3">
                    {msg.type === 'sent' ? (
                      <div className="shrink-0 mt-1"><Bot className="w-4 h-4 text-indigo-400" /></div>
                    ) : (
                      <div className="shrink-0 mt-1"><User className="w-4 h-4 text-emerald-400" /></div>
                    )}
                    <div className="space-y-1">
                      {msg.userName && <p className="text-[10px] font-bold opacity-40 mb-1">{msg.userName} @ {msg.platform.toUpperCase()}</p>}
                      <p className="leading-relaxed whitespace-pre-wrap break-all">{msg.text}</p>
                      {msg.imageUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-white/10 max-w-xs">
                          <img src={msg.imageUrl} alt="Stream Evidence" className="w-full h-auto" />
                          <div className="bg-black/50 p-1 text-[8px] text-center text-white/40 italic">VISUAL_EXTRACTION_SUCCESS</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {msg.type !== 'sent' && msg.userId !== 'system' && (
                    <button 
                      onClick={() => handleTakeover(msg)}
                      className="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Takeover Input Bar */}
          {takeoverId && (
            <div className="p-4 bg-indigo-500/10 border-t border-indigo-500/30 animate-in slide-in-from-bottom duration-300">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2 text-indigo-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase italic italic">Agent Takeover Mode: Intercepting {takeoverUser}</span>
                 </div>
                 <button onClick={() => setTakeoverId(null)} className="text-[10px] text-white/40 hover:text-white uppercase underline">Cancel</button>
               </div>
               <div className="flex gap-2">
                  <input 
                    type="text"
                    value={takeoverText}
                    onChange={(e) => setTakeoverText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendTakeoverResponse()}
                    placeholder={`TYPE COGNITIVE OVERRIDE FOR ${takeoverPlatform?.toUpperCase() ?? 'PLATFORM'}...`}
                    className="flex-1 bg-black/60 border border-indigo-500/30 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                    autoFocus
                  />
                  <button 
                    onClick={sendTakeoverResponse}
                    disabled={!takeoverText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-white font-bold text-xs uppercase flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    Transmit
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
             <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
               <Info className="w-4 h-4" />
               Bridge Intel
             </h3>
             <div className="space-y-3">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                  <span className="text-[10px] text-white/60">SESSION_UPTIME</span>
                  <span className="text-[10px] font-mono text-indigo-400">02:24:15:10</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                  <span className="text-[10px] text-white/60">THROUGHPUT</span>
                  <span className="text-[10px] font-mono text-emerald-400">4.2 KB/s</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                  <span className="text-[10px] text-white/60">ACTIVE_HOOKS</span>
                  <span className="text-[10px] font-mono text-amber-400">2 [WA_TG]</span>
                </div>
             </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
             <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
               <Activity className="w-4 h-4 text-emerald-400" />
               Predictive Analytics
             </h3>
             <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-bold">
                    <span className="text-white/40">Current Risk Index</span>
                    <span className="text-white">42%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 w-[42%]" />
                  </div>
                </div>

                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                   <div className="flex items-center gap-2 mb-2">
                      <BarChart2 className="w-3 h-3 text-indigo-400" />
                      <span className="text-[9px] font-black uppercase text-white/40">Next 6H Forecast</span>
                   </div>
                   <div className="flex items-end gap-1 h-12">
                      {[15, 20, 45, 80, 70, 40].map((h, idx) => (
                        <div key={idx} className="flex-1 bg-indigo-500/20 rounded-t-sm hover:bg-indigo-500/40 transition-colors relative group" style={{ height: `${h}%` }}>
                           <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-[8px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">+{idx}H</div>
                        </div>
                      ))}
                   </div>
                   <p className="text-[8px] text-white/20 mt-2 italic italic">Peak detected at T+3H (Shift Change)</p>
                </div>
             </div>
          </div>
          
          <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
             <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
               <Shield className="w-4 h-4" />
               Security Context
             </h3>
             <p className="text-[10px] leading-relaxed text-white/40 italic">
               All transmissions are captured via strategic signal bridge. Data is sanitized before reflection to the NOC dashboard. Vision analysis automatically extracts metadata from image streams.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTerminal;
