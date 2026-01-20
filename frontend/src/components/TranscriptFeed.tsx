import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useVoiceStore } from '@/store/index';
import { format } from 'date-fns';

export default function TranscriptFeed() {
  const { commandHistory, isLoadingHistory, loadCommandHistory } = useVoiceStore();

  useEffect(() => {
    loadCommandHistory();
  }, [loadCommandHistory]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-electric-teal" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-magenta-glow animate-pulse" />;
      default:
        return <AlertCircle className="w-4 h-4 text-foreground/40" />;
    }
  };

  const getIntentColor = (intent?: string) => {
    switch (intent) {
      case 'weather':
        return 'text-electric-teal';
      case 'smart_home':
        return 'text-magenta-glow';
      case 'music':
        return 'text-secondary';
      case 'ai_response':
        return 'text-foreground';
      default:
        return 'text-foreground/60';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {isLoadingHistory ? null : commandHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <Clock className="w-12 h-12 text-foreground/20" />
            <p className="text-sm text-foreground/50">No commands yet</p>
            <p className="text-xs text-foreground/30">Start speaking to see your history</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {commandHistory.map((command, index) => (
              <motion.div
                key={command._id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-deep-space-blue/30 rounded-lg p-3 border border-white/5 hover:border-electric-teal/30 transition-all duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getStatusIcon(command.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground mb-1.5 break-words leading-relaxed">
                      {command.commandText}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {command.detectedIntent && (
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${getIntentColor(command.detectedIntent)}`}>
                          {command.detectedIntent}
                        </span>
                      )}
                      {command.processedAt && (
                        <span className="text-[10px] text-foreground/40">
                          {format(new Date(command.processedAt), 'HH:mm:ss')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
