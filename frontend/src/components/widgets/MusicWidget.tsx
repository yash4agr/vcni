import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Volume2, Heart } from 'lucide-react';
import { Image } from '@/components/ui/image';
import type { ActionWidgets } from '@/entities';

interface MusicWidgetProps {
  data?: ActionWidgets;
}

export default function MusicWidget({ data }: MusicWidgetProps) {
  const config = data?.configurationJson ? JSON.parse(data.configurationJson) : null;
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(125);
  const [isLiked, setIsLiked] = useState(false);
  
  const defaultData = {
    title: 'Neon Dreams',
    artist: 'Synthwave Collective',
    album: 'Cyberpunk Nights',
    duration: 245,
    playlist: [
      { id: 1, title: 'Neon Dreams', artist: 'Synthwave Collective' },
      { id: 2, title: 'Digital Horizon', artist: 'Future Beats' },
      { id: 3, title: 'Electric Pulse', artist: 'Cyber Sound' },
      { id: 4, title: 'Midnight Drive', artist: 'Retro Wave' },
    ]
  };

  const musicData = {
    ...defaultData,
    ...config,
    playlist: config?.playlist || defaultData.playlist
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (currentTime / musicData.duration) * 100;

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Now Playing Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-deep-space-blue/40 rounded-2xl p-8 border border-magenta-glow/20 relative overflow-hidden"
      >
        {/* Background Glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-magenta-glow/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex items-center gap-8">
          {/* Album Art */}
          <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-48 h-48 rounded-2xl overflow-hidden border-4 border-magenta-glow/30 shadow-[0_0_30px_rgba(255,0,255,0.3)] flex-shrink-0"
          >
            {data?.visualAsset ? (
              <Image 
                src={data.visualAsset} 
                alt={musicData.title}
                className="w-full h-full object-cover"
                width={192}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-magenta-glow/20 to-electric-teal/20 flex items-center justify-center">
                <Volume2 className="w-20 h-20 text-magenta-glow/40" />
              </div>
            )}
          </motion.div>

          {/* Track Info & Controls */}
          <div className="flex-1">
            <div className="mb-6">
              <h3 className="text-3xl font-heading font-bold text-foreground mb-2">
                {musicData.title}
              </h3>
              <p className="text-lg text-foreground/70">{musicData.artist}</p>
              <p className="text-sm text-foreground/50">{musicData.album}</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <motion.div
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-magenta-glow to-electric-teal"
                />
              </div>
              <div className="flex justify-between text-xs text-foreground/50">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(musicData.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full bg-glassmorphism-overlay backdrop-blur-sm border border-white/10 flex items-center justify-center hover:border-magenta-glow/30 transition-all duration-300"
              >
                <SkipBack className="w-5 h-5 text-foreground" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 rounded-full bg-magenta-glow flex items-center justify-center shadow-[0_0_30px_rgba(255,0,255,0.4)] hover:shadow-[0_0_40px_rgba(255,0,255,0.6)] transition-all duration-300"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 text-deep-space-blue" />
                ) : (
                  <Play className="w-7 h-7 text-deep-space-blue ml-1" />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full bg-glassmorphism-overlay backdrop-blur-sm border border-white/10 flex items-center justify-center hover:border-magenta-glow/30 transition-all duration-300"
              >
                <SkipForward className="w-5 h-5 text-foreground" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsLiked(!isLiked)}
                className="w-10 h-10 rounded-full bg-glassmorphism-overlay backdrop-blur-sm border border-white/10 flex items-center justify-center hover:border-magenta-glow/30 transition-all duration-300"
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-magenta-glow text-magenta-glow' : 'text-foreground'}`} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Playlist */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h4 className="text-sm font-heading font-semibold text-foreground/70 uppercase tracking-wider mb-4">
          Up Next
        </h4>
        <div className="space-y-2">
          {musicData.playlist?.map((track: any, index: number) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="bg-deep-space-blue/30 rounded-xl p-4 border border-white/5 hover:border-magenta-glow/30 transition-all duration-300 cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-glassmorphism-overlay backdrop-blur-sm border border-white/10 flex items-center justify-center text-xs text-foreground/50 group-hover:border-magenta-glow/30 transition-all duration-300">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{track.title}</p>
                  <p className="text-xs text-foreground/60">{track.artist}</p>
                </div>
              </div>
              <Play className="w-4 h-4 text-foreground/40 group-hover:text-magenta-glow transition-colors duration-300" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {data?.description && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-foreground/60 italic"
        >
          {data.description}
        </motion.div>
      )}
    </div>
  );
}
