// HPI 1.7-V
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Activity, Terminal } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import Header from '@/components/Header';
import TranscriptFeed from '@/components/TranscriptFeed';
import ActionZone from '@/components/ActionZone';
import { useVoiceStore } from '@/store/index';
import { cn } from '@/lib/utils';


// --- Components ---

const TechDivider = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-4 py-8 opacity-30", className)}>
    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-electric-teal to-transparent" />
    <div className="flex gap-1">
      <div className="w-1 h-1 bg-electric-teal rounded-full" />
      <div className="w-1 h-1 bg-electric-teal rounded-full" />
      <div className="w-1 h-1 bg-electric-teal rounded-full" />
    </div>
    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-electric-teal to-transparent" />
  </div>
);

export default function HomePage() {
  // 1. Data Fidelity Protocol: Canonize Data Sources
  const { 
    isListening, 
    currentTranscript, 
    detectedIntent,
    startListening, 
    stopListening,
    processCommand 
  } = useVoiceStore();

  // Local UI State
  const [showPulse, setShowPulse] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const smoothScroll = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  
  // Parallax Transforms
  const gridY = useTransform(smoothScroll, [0, 1], [0, -50]);

  useEffect(() => {
    if (isListening) {
      setShowPulse(true);
    } else {
      const timer = setTimeout(() => setShowPulse(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isListening]);

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
      if (currentTranscript) {
        processCommand(currentTranscript);
      }
    } else {
      startListening();
    }
  };

  return (
    <div ref={containerRef} className="relative min-h-screen bg-background text-foreground font-paragraph selection:bg-electric-teal/30 selection:text-electric-teal overflow-clip">
      
      {/* Global Styles for Custom Scrollbar & Effects */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .glass-panel {
          background: rgba(10, 10, 10, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .scanline {
          background: linear-gradient(to bottom, transparent 50%, rgba(0, 255, 255, 0.02) 51%);
          background-size: 100% 4px;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
      `}</style>

      {/* Background Architecture */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-deep-space-blue" />
        <motion.div 
          style={{ y: gridY }}
          className="absolute inset-0 opacity-[0.03]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-deep-space-blue/50 to-deep-space-blue pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-electric-teal/5 to-transparent opacity-50" />
        <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
      </div>

      <Header />

      <main className="relative z-10 w-full max-w-[120rem] mx-auto px-4 sm:px-8 pt-24 py-8">
        
        {/* Main Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-6 min-h-[calc(100vh-140px)] items-start">
          
          {/* LEFT PANEL: INPUT ZONE (Sticky) */}
          <aside className="relative flex flex-col gap-6 lg:sticky lg:top-28 lg:h-[calc(100vh-9rem)]">
            
            {/* Voice Command Module */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex-shrink-0"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-b from-electric-teal/20 to-magenta-glow/20 rounded-2xl blur opacity-30" />
              <div className="relative bg-glassmorphism-overlay backdrop-blur-xl rounded-2xl border border-white/10 p-8 overflow-hidden">
                
                {/* Decorative Corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-electric-teal/50 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-electric-teal/50 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-electric-teal/50 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-electric-teal/50 rounded-br-lg" />

                <div className="flex flex-col items-center justify-center gap-8">
                  <div className="text-center space-y-1">
                    <h2 className="text-2xl font-heading font-bold text-white tracking-wide">
                      NEURAL INPUT
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-[10px] text-electric-teal/60 uppercase tracking-[0.2em]">
                      <span className="w-1.5 h-1.5 rounded-full bg-electric-teal animate-pulse" />
                      System Ready
                    </div>
                  </div>
                  
                  {/* Mic Interaction Core */}
                  <div className="relative group">
                    {/* Ambient Glow */}
                    <div className={cn(
                      "absolute inset-0 rounded-full blur-2xl transition-all duration-500",
                      isListening ? "bg-magenta-glow/30 scale-150" : "bg-electric-teal/10 scale-100"
                    )} />
                    
                    {/* Pulse Rings */}
                    {showPulse && (
                      <>
                        <div className="absolute inset-0 rounded-full border border-magenta-glow/30 animate-pulse-ring" />
                        <div className="absolute inset-0 rounded-full border border-magenta-glow/20 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
                      </>
                    )}
                    
                    <motion.button
                      onClick={handleMicToggle}
                      className={cn(
                        "relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                        isListening
                          ? "bg-deep-space-blue border-magenta-glow text-magenta-glow shadow-[0_0_50px_rgba(255,0,255,0.4)]"
                          : "bg-deep-space-blue border-electric-teal/30 text-electric-teal hover:border-electric-teal hover:shadow-[0_0_30px_rgba(0,255,255,0.2)]"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <AnimatePresence mode="wait">
                        {isListening ? (
                          <motion.div
                            key="mic-off"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                          >
                            <MicOff className="w-12 h-12" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="mic-on"
                            initial={{ scale: 0, rotate: 180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: -180 }}
                          >
                            <Mic className="w-12 h-12" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>

                  <div className="h-8 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {isListening ? (
                        <motion.div
                          key="listening-text"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="flex items-center gap-2 text-magenta-glow font-mono text-xs"
                        >
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-magenta-glow opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-magenta-glow"></span>
                          </span>
                          LISTENING_MODE_ACTIVE
                        </motion.div>
                      ) : (
                        <motion.div
                          key="idle-text"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-white/40 font-mono text-xs tracking-wider"
                        >
                          TAP_TO_INITIALIZE
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Live Transcript Area */}
                <div className="mt-8 min-h-[120px] relative">
                  <div className="absolute top-0 left-0 text-[10px] text-electric-teal/40 font-mono mb-2">
                    // LIVE_TRANSCRIPT_BUFFER
                  </div>
                  <div className="pt-6">
                    <AnimatePresence mode="wait">
                      {currentTranscript ? (
                        <motion.div
                          key="transcript"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="font-paragraph text-lg leading-relaxed text-white/90"
                        >
                          <span className="text-electric-teal mr-2">{'>'}</span>
                          {currentTranscript}
                          <span className="inline-block w-2 h-5 ml-1 bg-electric-teal/50 animate-pulse align-middle" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="placeholder"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-white/20 font-paragraph text-sm italic"
                        >
                          Awaiting vocal input stream...
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Intent Detection */}
                <AnimatePresence>
                  {detectedIntent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="w-full p-4 bg-magenta-glow/5 rounded border border-magenta-glow/20 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-magenta-glow/60 font-mono uppercase">Intent Detected</span>
                          <span className="text-magenta-glow font-heading font-bold tracking-wide uppercase">{detectedIntent}</span>
                        </div>
                        <Activity className="w-5 h-5 text-magenta-glow animate-pulse" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* History Feed - Sticky Container */}
            <motion.div 
              className="flex-1 min-h-0 bg-glassmorphism-overlay backdrop-blur-md rounded-2xl border border-white/5 p-6 overflow-hidden flex flex-col"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5 flex-shrink-0">
                <h3 className="text-sm font-heading text-white/70 uppercase tracking-wider">Command Log</h3>
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-white/30" />
                  <span className="text-[10px] text-white/40 font-mono">
                    {/* Command count will be shown by TranscriptFeed */}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
                <TranscriptFeed />
              </div>
            </motion.div>

          </aside>

          {/* RIGHT PANEL: ACTION ZONE */}
          <div className="flex flex-col gap-8 h-full">
            
            {/* Primary Action Zone */}
            <motion.div
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                opacity: { duration: 0.6, delay: 0.1 },
                x: { duration: 0.6, delay: 0.1 },
                layout: { type: "spring", stiffness: 40, damping: 15 }
              }}
              className="min-h-[600px] w-full bg-deep-space-blue/30 rounded-3xl border border-white/10 overflow-hidden relative flex flex-col"
            >
              
                {/* Header Bar */}
                <div className="flex-shrink-0 h-12 bg-white/5 border-b border-white/5 flex items-center px-6 justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-electric-teal" />
                    <span className="text-xs font-mono text-white/60">MAIN_VIEWPORT</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-white/20" />
                    <div className="w-1 h-1 bg-white/20" />
                    <div className="w-1 h-1 bg-white/20" />
                  </div>
                </div>
                
                {/* Content Area */}
                <div className="flex-1 p-6 relative z-10">
                  <ActionZone />
                </div>

                {/* Decorative Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />
            </motion.div>
            </div>
        </div>
        {/* Page Ends */}
        <motion.div 
          layout 
          className="relative z-10 mt-12 mb-8"
        >
          <TechDivider />
        </motion.div>
      </main>
    </div>
  );
}