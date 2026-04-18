import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal as TerminalIcon, Shield, Zap, Send, User, Bot, AlertCircle, Info, Activity, BarChart2, X, Globe, Lock, MessageSquare, SendHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveMessage {
  platform: 'whatsapp' | 'telegram';
  userId: string;
  userName?: string;
  text: string;
  timestamp: number;
  imageUrl?: string;
  type?: 'received' | 'sent';
}

const STREAMS = [
  { id: 'whatsapp', port: 4005, label: 'WhatsApp Stream', color: 'emerald' },
  { id: 'telegram', port: 4006, label: 'Telegram Stream', color: 'sky' }
];

const LiveTerminal: React.FC = () => {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [activeStream, setActiveStream] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [connections, setConnections] = useState<Record<string, boolean>>({
    whatsapp: false,
    telegram: false
  });
  
  const [takeoverId, setTakeoverId] = useState<string | null>(null);
  const [takeoverPlatform, setTakeoverPlatform] = useState<string | null>(null);
  const [takeoverText, setTakeoverText] = useState('');
  const [takeoverUser, setTakeoverUser] = useState('');
  
  const socketsRef = useRef<Record<string, Socket>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Determine hostname dynamically (localhost or current IP)
    const hostname = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
    
    STREAMS.forEach(stream => {
      const socket = io(`http://${hostname}:${stream.port}`);
      socketsRef.current[stream.id] = socket;

      socket.on('connect', () => {
        setConnections(prev => ({ ...prev, [stream.id]: true }));
        setMessages(prev => [...prev.filter(m => m.userId !== `system-${stream.id}`), {
          platform: stream.id as any,
          userId: `system-${stream.id}`,
          text: `SIGNAL BRIDGE ESTABLISHED — [${stream.label.toUpperCase()}] ACTIVE`,
          timestamp: Date.now(),
          type: 'received'
        }]);
      });

      socket.on('disconnect', () => {
        setConnections(prev => ({ ...prev, [stream.id]: false }));
      });

      socket.on('chat:message', (data: any) => {
        setMessages(prev => [...prev, { ...data, platform: stream.id, type: 'received' }]);
      });

      socket.on('bot:event', (event: any) => {
         if (event.type === 'message.sent') {
           setMessages(prev => [...prev, { ...event.data, platform: stream.id, userName: 'AudiraBot V2.0', type: 'sent' }]);
         }
      });
    });

    return () => {
      Object.values(socketsRef.current).forEach(s => s.disconnect());
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeStream]);

  const handleTakeover = (msg: LiveMessage) => {
    setTakeoverId(msg.userId);
    setTakeoverPlatform(msg.platform);
    setTakeoverUser(msg.userName || msg.userId);
  };

  const sendTakeoverResponse = () => {
    if (!takeoverText.trim() || !takeoverId || !takeoverPlatform) return;
    
    const targetSocket = socketsRef.current[takeoverPlatform];
    if (!targetSocket) return;

    targetSocket.emit('agent:takeover', {
      platform: takeoverPlatform,
      userId: takeoverId,
      text: takeoverText
    });

    setTakeoverText('');
    setTakeoverId(null);
  };

  // Filter messages for the current view, but system messages carry the platform info
  const filteredMessages = messages.filter(m => m.platform === activeStream);
  const isSelectedConnected = connections[activeStream];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 relative">
      <div className="premium-glow -left-40 top-0 w-[400px] h-[400px] bg-indigo-500/10" />

      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 relative z-10">
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
             <div className="p-3 bg-indigo-600 rounded-xl shadow-2xl shadow-indigo-600/40">
                <TerminalIcon className="w-6 h-6 text-white" />
             </div>
             <span className="text-indigo-500 font-black text-[10px] uppercase tracking-[0.5em] font-mono italic">SIGNAL_BRIDGE: ALPHA_STREAM_v3</span>
          </div>
          <h1 className="text-7xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
            Live Terminal
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-6">
           {STREAMS.map(stream => (
             <button
               key={stream.id}
               onClick={() => setActiveStream(stream.id as any)}
               className={`relative flex items-center gap-5 px-10 py-6 rounded-[32px] border-2 transition-all shadow-2xl backdrop-blur-3xl overflow-hidden group ${
                 activeStream === stream.id 
                  ? connections[stream.id] ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'
                  : 'border-white/5 bg-white/5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100'
               }`}
             >
                <div className={`w-3 h-3 rounded-full ${connections[stream.id] ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]' : 'bg-rose-500 animate-pulse'}`} />
                <div className="text-left">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{stream.id.toUpperCase()}_LINK</p>
                   <p className={`text-[12px] font-black uppercase tracking-tighter italic ${activeStream === stream.id ? 'text-white' : 'text-slate-500'}`}>{stream.label}</p>
                </div>
                {activeStream === stream.id && (
                  <motion.div layoutId="active-pill" className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-500" />
                )}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 min-h-[75vh] relative z-10">
        {/* Terminal Main View */}
        <div className="lg:col-span-3 glass-ultimate rounded-[48px] flex flex-col overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)] border-2 border-white/5 relative bg-black/40">
          <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="p-8 border-b border-white/5 flex items-center justify-between backdrop-blur-3xl bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="flex gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-rose-500/40 border border-rose-500/20" />
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500/40 border border-amber-500/20" />
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/40 border border-emerald-500/20" />
              </div>
              <div className="h-6 w-[2px] bg-white/5 mx-4" />
              <div className="flex items-center gap-3">
                 <Shield className="w-4 h-4 text-indigo-500/40" />
                 <span className="text-[11px] font-black font-mono text-indigo-400/60 uppercase tracking-widest italic">{activeStream.toUpperCase()}_RELAY_BRIDGE.log</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${isSelectedConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono italic">
                      {isSelectedConnected ? 'ENCRYPTED' : 'UNSTABLE'}
                   </span>
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <Globe className="w-4 h-4 text-white/10" />
                <Lock className="w-4 h-4 text-white/10" />
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-12 space-y-8 font-mono text-sm custom-scrollbar"
          >
            {filteredMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center gap-8 opacity-20">
                <Zap className={`w-16 h-16 ${isSelectedConnected ? 'animate-pulse' : 'animate-bounce'} text-indigo-500`} />
                <div className="text-center">
                   <p className="text-[14px] font-black uppercase tracking-[0.8em] italic text-indigo-300 mb-4">AWAITING_TRANSMISSIONS</p>
                   <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">LISTENING_ON_PORT_{STREAMS.find(s => s.id === activeStream)?.port}</p>
                </div>
              </div>
            )}
            
            {filteredMessages.map((msg, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: msg.type === 'sent' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex flex-col ${msg.type === 'sent' ? 'items-end' : 'items-start'} group`}
              >
                <div className="flex items-center gap-3 mb-4 px-4">
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] font-mono ${msg.type === 'sent' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                    {msg.type === 'sent' ? '>> SYSTEM_OUTPUT' : '<< INPUT_STREAM'}
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-700 tracking-tighter font-black">
                    [{new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                  </span>
                </div>
                
                <div className={`relative max-w-[85%] p-8 rounded-[32px] border-2 transition-all ${
                  msg.type === 'sent' 
                    ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-100 shadow-[0_0_40px_rgba(99,102,241,0.1)]' 
                    : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                }`}>
                  <div className="flex items-start gap-6">
                    {msg.type === 'sent' ? (
                      <div className="shrink-0 p-4 bg-indigo-500/20 rounded-2xl shadow-inner border border-white/5"><Bot className="w-5 h-5 text-indigo-400" /></div>
                    ) : (
                      <div className="shrink-0 p-4 bg-emerald-500/10 rounded-2xl shadow-inner border border-white/5"><User className="w-5 h-5 text-emerald-400" /></div>
                    )}
                    <div className="space-y-4 flex-1">
                      {msg.userName && (
                        <div className="flex items-center gap-3 mb-2">
                           <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest italic">{msg.userName}</p>
                           <span className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black text-slate-600 uppercase tracking-widest">{msg.platform.toUpperCase()}</span>
                        </div>
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap break-all font-medium text-lg italic tracking-tight font-mono uppercase">
                         {msg.text}
                      </p>
                      {msg.imageUrl && (
                        <div className="mt-8 rounded-[32px] overflow-hidden border-2 border-white/10 max-w-lg shadow-[0_40px_80px_rgba(0,0,0,0.6)] group/img relative">
                          <img src={msg.imageUrl} alt="Stream Evidence" className="w-full h-auto transition-transform duration-1000 group-hover/img:scale-110" />
                          <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover/img:opacity-20 transition-opacity pointer-events-none" />
                          <div className="bg-black/90 p-4 text-[10px] font-black text-center text-indigo-400 uppercase tracking-[0.4em] italic backdrop-blur-md">VISUAL_EXTRACTION: DATA_RETAINED</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {msg.type !== 'sent' && msg.userId !== `system-${activeStream}` && (
                    <button 
                      onClick={() => handleTakeover(msg)}
                      className="absolute -right-6 -bottom-6 w-16 h-16 rounded-[24px] bg-indigo-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-[0_20px_50px_rgba(79,70,229,0.5)] z-20 active:scale-95 group-hover:-translate-y-2 group-hover:-translate-x-2"
                    >
                      <Zap className="w-8 h-8" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
            {takeoverId && (
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="p-10 glass-ultimate border-t border-indigo-500/40 backdrop-blur-[60px] z-30"
              >
                 <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-6 text-indigo-400">
                      <div className="p-4 bg-indigo-500/20 rounded-2xl animate-pulse shadow-inner"><AlertCircle className="w-6 h-6" /></div>
                      <div>
                         <span className="text-[12px] font-black uppercase tracking-[0.4em] italic mb-1 block underline decoration-indigo-500/30 underline-offset-8">AGENT_TAKEOVER_ACTIVE</span>
                         <span className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Intercepting Signal: {takeoverUser}</span>
                      </div>
                   </div>
                   <button onClick={() => setTakeoverId(null)} className="p-4 glass rounded-2xl text-white/40 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                 </div>
                 <div className="flex gap-6">
                    <div className="flex-1 relative">
                       <input 
                         type="text"
                         value={takeoverText}
                         onChange={(e) => setTakeoverText(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && sendTakeoverResponse()}
                         placeholder={`TYPE COGNITIVE OVERRIDE PROTOCOL...`}
                         className="w-full bg-black/60 border-2 border-indigo-500/30 rounded-[28px] px-10 py-6 text-lg text-indigo-100 focus:outline-none focus:border-indigo-500 transition-all font-mono placeholder:text-indigo-950/40 shadow-inner italic uppercase"
                         autoFocus
                       />
                       <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                          <span className="text-[9px] font-black text-indigo-900 uppercase italic">AWAIT_INPUT</span>
                       </div>
                    </div>
                    <button 
                      onClick={sendTakeoverResponse}
                      disabled={!takeoverText.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 px-14 py-6 rounded-[28px] text-white font-black text-[12px] uppercase tracking-[0.4em] flex items-center gap-4 transition-all disabled:opacity-20 shadow-[0_20px_60px_rgba(79,70,229,0.4)] active:scale-95 group/btn"
                    >
                      <SendHorizontal className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      Transmit
                    </button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-10">
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card group"
          >
             <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] flex items-center gap-4 mb-8 italic">
               <Info className="w-5 h-5 text-indigo-500" />
               Bridge Intel
             </h3>
             <div className="space-y-6">
                {[
                  { label: 'UOW_CAPACITY', value: isSelectedConnected ? '4.8 GB/S' : '0.0 KB/S', color: isSelectedConnected ? 'text-indigo-500' : 'text-slate-700' },
                  { label: 'ACTIVE_RELAYS', value: Object.values(connections).filter(Boolean).length + '/2', color: 'text-amber-500' },
                  { label: 'CRYPTO_KEY', value: 'ECC_384_SIG_v3', color: 'text-emerald-500' }
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col bg-black/20 p-6 rounded-[24px] border border-white/5 transition-all group-hover:bg-indigo-500/5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 font-mono">{stat.label}</span>
                    <span className={`text-xl font-black font-mono tracking-tighter ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
             </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card group"
          >
             <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] flex items-center gap-4 mb-10 italic">
               <Activity className="w-5 h-5 text-emerald-500" />
               Diagnostics
             </h3>
             <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 font-mono">Stream Integrity</span>
                    <span className="text-3xl font-black text-white italic tracking-tighter">{isSelectedConnected ? '98%' : '0%'}</span>
                  </div>
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: isSelectedConnected ? '98%' : '0%' }}
                      transition={{ duration: 2, ease: "circOut" }}
                      className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-indigo-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                    />
                  </div>
                </div>

                <div className="p-8 glass rounded-[32px] border border-white/5 bg-emerald-500/5">
                   <div className="flex items-center gap-4 mb-6">
                      <Lock className="w-5 h-5 text-indigo-500" />
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">Secure_Link</span>
                   </div>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                      Bridge for {activeStream} is currently {isSelectedConnected ? 'active and verified' : 'unavailable or seeking signal'}. 
                      Metadata extraction is operational.
                   </p>
                </div>
             </div>
          </motion.div>
          
          <div className="glass-card border-dashed opacity-50">
             <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.5em] flex items-center gap-4 mb-6 italic">
               <Shield className="w-5 h-5" />
               Protocols
             </h3>
             <p className="text-[11px] leading-relaxed text-slate-700 italic font-medium uppercase tracking-tight">
               SIGNAL_BRIDGE uses AES-GCM-256 for all socket transmissions. Log retention: 24h. Manual override enabled for L2 agents.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTerminal;
;
