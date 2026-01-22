import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, MessageSquare, Zap } from 'lucide-react';
import { Image } from '@/components/ui/image';
import type { ActionWidgets } from '@/entities';

interface AIResponseWidgetProps {
  data?: ActionWidgets;
}

export default function AIResponseWidget({ data }: AIResponseWidgetProps) {
  const config = data?.configurationJson ? JSON.parse(data.configurationJson) : null;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const aiResponse = config?.response || "I'm your AI assistant, powered by advanced neural networks. I can help you with weather information, control your smart home devices, play music, answer questions, and much more. My responses are generated in real-time based on your voice commands. How can I assist you today?";

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let currentIndex = 0;

    const typingInterval = setInterval(() => {
      if (currentIndex < aiResponse.length) {
        setDisplayedText(aiResponse.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 30);

    return () => clearInterval(typingInterval);
  }, [aiResponse]);

  const suggestions = config?.suggestions || [
    "What's the weather forecast?",
    "Turn on the lights",
    "Play some music",
    "Tell me more about AI",
  ];

  return (
    <div className="h-full flex flex-col gap-6">
      {/* AI Response Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-deep-space-blue/40 rounded-2xl p-8 border border-secondary/20 relative overflow-hidden flex-1"
      >
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-0 left-0 w-64 h-64 bg-electric-teal/5 rounded-full blur-3xl"
        />

        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <motion.div
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/20 to-electric-teal/20 border border-secondary/30 flex items-center justify-center"
            >
              <Brain className="w-7 h-7 text-secondary" />
            </motion.div>
            <div>
              <h3 className="text-2xl font-heading font-bold text-foreground">
                {data?.displayName || 'AI Assistant'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <motion.div
                  animate={{
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="w-2 h-2 rounded-full bg-secondary"
                />
                <span className="text-xs text-foreground/60">Neural Network Active</span>
              </div>
            </div>
          </div>

          {/* Visual Asset */}
          {data?.visualAsset && (
            <div className="mb-6">
              <Image
                src={data.visualAsset}
                alt="AI visualization"
                className="w-full h-32 object-cover rounded-xl opacity-40"
                width={600}
              />
            </div>
          )}

          {/* AI Response Text */}
          <div className="flex-1 overflow-y-auto custom-scrollbar mb-6">
            <div className="bg-glassmorphism-overlay backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-start gap-3 mb-4">
                <MessageSquare className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-base text-foreground leading-relaxed">
                    {displayedText}
                    {isTyping && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="inline-block w-2 h-4 bg-secondary ml-1"
                      />
                    )}
                  </p>
                </div>
              </div>

              {!isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-xs text-foreground/50 mt-4 pt-4 border-t border-white/10"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Response generated in {config?.responseTime || '0.0'}s</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <h4 className="text-sm font-heading font-semibold text-foreground/70 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-secondary" />
              Suggested Commands
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {suggestions.map((suggestion: string, index: number) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-deep-space-blue/50 rounded-xl p-3 border border-white/10 hover:border-secondary/30 transition-all duration-300 text-left group"
                >
                  <p className="text-sm text-foreground/80 group-hover:text-foreground transition-colors duration-300">
                    {suggestion}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>



      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(138, 43, 226, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(138, 43, 226, 0.5);
        }
      `}</style>
    </div>
  );
}
