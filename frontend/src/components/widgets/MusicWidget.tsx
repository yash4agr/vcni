import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Volume2, Heart, VolumeX } from 'lucide-react';
import { Image } from '@/components/ui/image';
import type { ActionWidgets } from '@/entities';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';

interface MusicWidgetProps {
  data?: ActionWidgets;
}

interface Track {
  id: number;
  title: string;
  artist: string;
  videoId?: string;
}

export default function MusicWidget({ data }: MusicWidgetProps) {
  const config = data?.configurationJson ? JSON.parse(data.configurationJson) : null;

  // Player state
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const defaultData = {
    title: 'Neon Dreams',
    artist: 'Synthwave Collective',
    album: 'Cyberpunk Nights',
    duration: 245,
    videoId: null as string | null,
    playlist: [] as Track[]
  };

  const musicData = {
    ...defaultData,
    ...config,
    playlist: config?.playlist || defaultData.playlist
  };

  // Get current track's videoId
  const currentVideoId = currentIndex === 0
    ? musicData.videoId
    : musicData.playlist[currentIndex - 1]?.videoId;

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // Auto-play when new track data arrives
  useEffect(() => {
    console.log('[MusicWidget] Config changed, videoId:', musicData.videoId);
    if (player && isPlayerReady && currentVideoId) {
      // Small delay to ensure player is ready
      setTimeout(() => {
        player.playVideo();
      }, 100);
    }
  }, [config?.videoId, currentVideoId, player, isPlayerReady]);

  // Update progress bar while playing
  useEffect(() => {
    if (isPlaying && player) {
      progressInterval.current = setInterval(() => {
        const time = player.getCurrentTime?.() || 0;
        setCurrentTime(Math.floor(time as number));
      }, 1000);
    } else if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, player]);

  // Player event handlers
  const onPlayerReady = useCallback((event: YouTubeEvent) => {
    console.log('[MusicWidget] Player ready');
    setPlayer(event.target);
    setIsPlayerReady(true);
    const dur = event.target.getDuration?.() || 0;
    setDuration(Math.floor(dur as number));
    // Auto-play when ready
    event.target.playVideo();
  }, []);

  const onPlayerStateChange = useCallback((event: YouTubeEvent) => {
    const state = event.data;
    // YouTube states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    console.log('[MusicWidget] State change:', state);

    if (state === 1) {
      setIsPlaying(true);
      const dur = event.target.getDuration?.() || 0;
      setDuration(Math.floor(dur as number));
    } else if (state === 2) {
      setIsPlaying(false);
    } else if (state === 0) {
      // Video ended - play next
      handleSkipForward();
    }
  }, []);

  const onPlayerError = useCallback((event: YouTubeEvent) => {
    console.error('[MusicWidget] Player error:', event.data);
  }, []);

  // Control handlers
  const handlePlayPause = () => {
    if (!player) return;

    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const handleSkipForward = () => {
    const totalTracks = musicData.playlist.length + 1; // +1 for main track
    const nextIndex = (currentIndex + 1) % totalTracks;
    setCurrentIndex(nextIndex);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleSkipBack = () => {
    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      player?.seekTo(0, true);
      setCurrentTime(0);
      return;
    }

    const totalTracks = musicData.playlist.length + 1;
    const prevIndex = (currentIndex - 1 + totalTracks) % totalTracks;
    setCurrentIndex(prevIndex);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!player || !duration) return;

    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = percent * duration;

    player.seekTo(seekTime, true);
    setCurrentTime(Math.floor(seekTime));
  };

  const handleTrackClick = (index: number) => {
    setCurrentIndex(index + 1); // +1 because main track is index 0
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleMuteToggle = () => {
    if (!player) return;

    if (isMuted) {
      player.unMute();
    } else {
      player.mute();
    }
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Get current track info
  const currentTrack = currentIndex === 0
    ? { title: musicData.title, artist: musicData.artist }
    : musicData.playlist[currentIndex - 1] || { title: 'Unknown', artist: 'Unknown' };

  // YouTube player options
  const playerOpts = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
    },
  } as const;

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Hidden YouTube Player */}
      {currentVideoId && (
        <div className="hidden">
          <YouTube
            videoId={currentVideoId}
            opts={playerOpts}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            onError={onPlayerError}
          />
        </div>
      )}

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
                alt={currentTrack.title}
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
                {currentTrack.title}
              </h3>
              <p className="text-lg text-foreground/70">{currentTrack.artist}</p>
              {currentIndex === 0 && musicData.album && (
                <p className="text-sm text-foreground/50">{musicData.album}</p>
              )}
              {!currentVideoId && (
                <p className="text-xs text-red-400 mt-2">No video ID available for playback</p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div
                className="h-2 bg-white/10 rounded-full overflow-hidden mb-2 cursor-pointer hover:bg-white/20 transition-colors"
                onClick={handleSeek}
              >
                <motion.div
                  style={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-magenta-glow to-electric-teal"
                />
              </div>
              <div className="flex justify-between text-xs text-foreground/50">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSkipBack}
                className="w-10 h-10 rounded-full bg-glassmorphism-overlay backdrop-blur-sm border border-white/10 flex items-center justify-center hover:border-magenta-glow/30 transition-all duration-300"
              >
                <SkipBack className="w-5 h-5 text-foreground" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayPause}
                disabled={!currentVideoId}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${currentVideoId
                  ? 'bg-magenta-glow shadow-[0_0_30px_rgba(255,0,255,0.4)] hover:shadow-[0_0_40px_rgba(255,0,255,0.6)]'
                  : 'bg-gray-600 cursor-not-allowed'
                  }`}
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
                onClick={handleSkipForward}
                className="w-10 h-10 rounded-full bg-glassmorphism-overlay backdrop-blur-sm border border-white/10 flex items-center justify-center hover:border-magenta-glow/30 transition-all duration-300"
              >
                <SkipForward className="w-5 h-5 text-foreground" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMuteToggle}
                className="w-10 h-10 rounded-full bg-glassmorphism-overlay backdrop-blur-sm border border-white/10 flex items-center justify-center hover:border-magenta-glow/30 transition-all duration-300"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-foreground" />
                ) : (
                  <Volume2 className="w-5 h-5 text-foreground" />
                )}
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
      {musicData.playlist?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h4 className="text-sm font-heading font-semibold text-foreground/70 uppercase tracking-wider mb-4">
            Up Next
          </h4>
          <div className="space-y-2">
            {musicData.playlist?.map((track: Track, index: number) => (
              <motion.div
                key={track.id || index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                onClick={() => handleTrackClick(index)}
                className={`rounded-xl p-4 border transition-all duration-300 cursor-pointer flex items-center justify-between group ${currentIndex === index + 1
                  ? 'bg-magenta-glow/20 border-magenta-glow/40'
                  : 'bg-deep-space-blue/30 border-white/5 hover:border-magenta-glow/30'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg backdrop-blur-sm border flex items-center justify-center text-xs transition-all duration-300 ${currentIndex === index + 1
                    ? 'bg-magenta-glow/30 border-magenta-glow/50 text-foreground'
                    : 'bg-glassmorphism-overlay border-white/10 text-foreground/50 group-hover:border-magenta-glow/30'
                    }`}>
                    {currentIndex === index + 1 && isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{track.title}</p>
                    <p className="text-xs text-foreground/60">{track.artist}</p>
                  </div>
                </div>
                <Play className={`w-4 h-4 transition-colors duration-300 ${currentIndex === index + 1 ? 'text-magenta-glow' : 'text-foreground/40 group-hover:text-magenta-glow'
                  }`} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

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
