import { motion } from 'framer-motion';
import { Mic, Zap, Brain, Home, Cloud, Music } from 'lucide-react';

export default function DefaultWidget() {
  const features = [
    {
      icon: Cloud,
      title: 'Weather',
      description: 'Get real-time weather updates and forecasts',
      color: 'electric-teal',
    },
    {
      icon: Home,
      title: 'Smart Home',
      description: 'Control lights, temperature, and security',
      color: 'magenta-glow',
    },
    {
      icon: Music,
      title: 'Music',
      description: 'Play your favorite songs and playlists',
      color: 'secondary',
    },
    {
      icon: Brain,
      title: 'AI Assistant',
      description: 'Ask questions and get intelligent responses',
      color: 'electric-teal',
    },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 text-center">
      {/* Central Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-electric-teal/20 blur-2xl"
        />
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-electric-teal/20 to-magenta-glow/20 border-2 border-electric-teal/30 flex items-center justify-center">
          <Mic className="w-16 h-16 text-electric-teal" />
        </div>
      </motion.div>

      {/* Welcome Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-2xl"
      >
        <h3 className="text-4xl font-heading font-bold text-foreground mb-4">
          Voice Command Center
        </h3>
        <p className="text-lg text-foreground/70 mb-2">
          Ready to receive your commands
        </p>
        <p className="text-sm text-foreground/50">
          Click the microphone to start speaking. Your commands will be processed instantly.
        </p>
      </motion.div>

      {/* Feature Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-4 w-full max-w-3xl"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="bg-deep-space-blue/40 rounded-2xl p-6 border border-white/10 hover:border-electric-teal/30 transition-all duration-300 group"
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-glassmorphism-overlay backdrop-blur-sm border border-${feature.color}/30 flex items-center justify-center group-hover:border-${feature.color}/50 transition-all duration-300`}>
                <feature.icon className={`w-6 h-6 text-${feature.color}`} />
              </div>
              <div>
                <h4 className="text-lg font-heading font-semibold text-foreground mb-1">
                  {feature.title}
                </h4>
                <p className="text-sm text-foreground/60">
                  {feature.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Status Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center gap-3 bg-glassmorphism-overlay backdrop-blur-sm rounded-full px-6 py-3 border border-white/10"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="w-3 h-3 rounded-full bg-electric-teal shadow-[0_0_10px_rgba(0,255,255,0.6)]"
        />
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-electric-teal" />
          <span className="text-sm text-foreground/70">System Ready</span>
        </div>
      </motion.div>
    </div>
  );
}
