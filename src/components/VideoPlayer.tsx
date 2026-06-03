/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { PlaybackQuality, EnhancedChannel } from '../types.ts';
import { playBeep } from '../utils/beep.ts';
import { Play, Pause, Volume2, VolumeX, Settings, Maximize2, Minimize2, Lock, Unlock, Tv } from 'lucide-react';
import { FullscreenChannelPanel } from './FullscreenChannelPanel.tsx';

interface VideoPlayerProps {
  url: string | null;
  channelName: string;
  onVideoRef: (el: HTMLVideoElement | null) => void;
  playbackQuality: PlaybackQuality;
  setPlaybackQuality: (q: PlaybackQuality) => void;
  viewerCount: number;
  filteredChannels: EnhancedChannel[];
  activeChannelUrl: string | null;
  onSelectChannel: (url: string, name: string) => void;
  isFullscreenPanelOpen: boolean;
  setIsFullscreenPanelOpen: (open: boolean) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  channelName,
  onVideoRef,
  playbackQuality,
  setPlaybackQuality,
  viewerCount,
  filteredChannels,
  activeChannelUrl,
  onSelectChannel,
  isFullscreenPanelOpen,
  setIsFullscreenPanelOpen,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasQualityLevels, setHasQualityLevels] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isBuffering, setIsBuffering] = useState(true);
  const MAX_RETRIES = 3;

  // Custom controller states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [fsCategory, setFsCategory] = useState<string>('all');
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);
  const hasPushedFsStateRef = useRef(false);

  // Reset category to 'all' only when entering fullscreen for the first time
  const isCurrentlyFS = isFullscreen || isPseudoFullscreen;
  const prevIsFSRef = useRef(false);

  useEffect(() => {
    if (isCurrentlyFS && !prevIsFSRef.current) {
      setFsCategory('all');
    }
    prevIsFSRef.current = isCurrentlyFS;
  }, [isCurrentlyFS]);

  // Screen lock states
  const [isLocked, setIsLocked] = useState(false);
  const [showLockFeedback, setShowLockFeedback] = useState(false);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const triggerLockNotice = useCallback(() => {
    setShowLockFeedback(true);
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setShowLockFeedback(false);
    }, 2000) as unknown as number;
  }, []);

  // Cleanup feedback timeout on component unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Swipe controls for full screen mobile/tablet view
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const changeChannel = useCallback((direction: 'next' | 'prev') => {
    if (!filteredChannels || filteredChannels.length === 0) return;
    
    const currentIndex = filteredChannels.findIndex(ch => ch.url === activeChannelUrl);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (direction === 'next') {
      targetIndex = (currentIndex + 1) % filteredChannels.length;
    } else {
      targetIndex = (currentIndex - 1 + filteredChannels.length) % filteredChannels.length;
    }

    const nextChannel = filteredChannels[targetIndex];
    if (nextChannel) {
      playBeep('select');
      onSelectChannel(nextChannel.url, nextChannel.name);
    }
  }, [filteredChannels, activeChannelUrl, onSelectChannel]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLocked) {
      e.stopPropagation();
      triggerLockNotice();
      return;
    }
    if (isFullscreenPanelOpen) return; // Prevent interference when drawer list/categories are being scrolled

    const firstTouch = e.touches[0];
    touchStartX.current = firstTouch.clientX;
    touchStartY.current = firstTouch.clientY;
    touchEndX.current = firstTouch.clientX;
    touchEndY.current = firstTouch.clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLocked) {
      e.stopPropagation();
      return;
    }
    if (isFullscreenPanelOpen) return;

    const touch = e.touches[0];
    touchEndX.current = touch.clientX;
    touchEndY.current = touch.clientY;
  };

  const handleTouchEnd = () => {
    if (isLocked) return;
    if (isFullscreenPanelOpen) return;

    if (
      touchStartX.current === null || 
      touchStartY.current === null || 
      touchEndX.current === null || 
      touchEndY.current === null
    ) {
      return;
    }

    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;

    let visualDiffX = diffX; // positive means swipe left (finger right to left)
    let visualDiffY = diffY; // positive means swipe up (finger bottom to top)

    const isRotated = (isFullscreen || isPseudoFullscreen) && isMobilePortrait;
    if (isRotated) {
      // Rotate 90deg clockwise swaps and/or inverses the axis vectors
      // Physical swipe left (moving from physical right to physical left) visualizes as SWIPE UP
      // Physical swipe up (moving from physical bottom to physical top) visualizes as SWIPE LEFT
      visualDiffX = diffY;
      visualDiffY = diffX;
    }

    const minSwipeDistance = 45; // trigger distance in pixels

    if (Math.abs(visualDiffX) > Math.abs(visualDiffY)) {
      // Horizontal action
      if (Math.abs(visualDiffX) > minSwipeDistance) {
        if (visualDiffX > 0) {
          // Changed channel to next (swipe left)
          changeChannel('next');
        } else {
          // Changed channel to prev (swipe right)
          changeChannel('prev');
        }
      }
    } else {
      // Vertical action -> only intercept if in fullscreen/pseudo-fullscreen
      if (isFullscreen || isPseudoFullscreen) {
        if (Math.abs(visualDiffY) > minSwipeDistance) {
          if (visualDiffY > 0) {
            // Swiped up -> Open All Channels Panel
            playBeep('select');
            setIsFullscreenPanelOpen(true);
          }
        }
      }
    }

    // Reset touch variables
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth < 1024 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsMobilePortrait(isMobile && isPortrait);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Listen to first physical user interaction to unmute the video player
  useEffect(() => {
    const handleFirstInteraction = () => {
      setIsMuted(false);
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.muted = false;
        videoEl.play().catch(() => {});
      }
    };
    document.body.addEventListener('click', handleFirstInteraction, { once: true, passive: true });
    document.body.addEventListener('keydown', handleFirstInteraction, { once: true, passive: true });
    document.body.addEventListener('pointerdown', handleFirstInteraction, { once: true, passive: true });
    return () => {
      document.body.removeEventListener('click', handleFirstInteraction);
      document.body.removeEventListener('keydown', handleFirstInteraction);
      document.body.removeEventListener('pointerdown', handleFirstInteraction);
    };
  }, []);

  const triggerControlsActivity = useCallback(() => {
    if (isLocked) {
      triggerLockNotice();
      return;
    }
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      const activeEl = document.activeElement;
      const isControlFocused = activeEl && (
        activeEl.id === 'playPauseBtn' || 
        activeEl.id === 'qualityBtn' || 
        activeEl.id === 'fsToggleBtn' || 
        activeEl.classList.contains('quality-opt-btn')
      );
      if (videoRef.current && !videoRef.current.paused && !showQualityMenu && !isControlFocused) {
        setShowControls(false);
      }
    }, 3500) as unknown as number;
  }, [showQualityMenu]);

  useEffect(() => {
    triggerControlsActivity();
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, showQualityMenu, triggerControlsActivity]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeFS = !!document.fullscreenElement;
      setIsFullscreen(activeFS);
      if (!activeFS) {
        setIsPseudoFullscreen(false);
        if (screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
          try {
            (screen.orientation as any).unlock();
          } catch (e) {
            console.log("Orientation unlock failed:", e);
          }
        }
      } else {
        if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
          try {
            (screen.orientation as any).lock('landscape').catch((e: any) => {
              console.log("Orientation lock failed:", e);
            });
          } catch (e) {
            console.log("Orientation lock failed:", e);
          }
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Sync state with browser history to intercept the device/browser back button
  useEffect(() => {
    const isAnyFsActive = isFullscreen || isPseudoFullscreen || isFullscreenPanelOpen;

    if (isAnyFsActive) {
      if (!hasPushedFsStateRef.current) {
        window.history.pushState({ fullscreenActive: true }, "");
        hasPushedFsStateRef.current = true;
      }
    } else {
      if (hasPushedFsStateRef.current) {
        hasPushedFsStateRef.current = false;
        if (window.history.state && window.history.state.fullscreenActive) {
          window.history.back();
        }
      }
    }
  }, [isFullscreen, isPseudoFullscreen, isFullscreenPanelOpen]);

  // Handle popstate event (device back button navigation)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const isAnyFsActive = isFullscreen || isPseudoFullscreen || isFullscreenPanelOpen;
      
      if (isAnyFsActive) {
        // We intercepted back button, close all active fullscreen states!
        playBeep('select');
        
        if (isFullscreenPanelOpen) {
          setIsFullscreenPanelOpen(false);
        }
        
        if (isFullscreen) {
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
          }
          setIsFullscreen(false);
        }
        
        if (isPseudoFullscreen) {
          setIsPseudoFullscreen(false);
        }
        
        hasPushedFsStateRef.current = false;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isFullscreen, isPseudoFullscreen, isFullscreenPanelOpen, setIsFullscreenPanelOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

      // Wake up the player controls on arrow keys, enter, space, escape, backspace
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape', 'Backspace'].includes(e.key)) {
        triggerControlsActivity();
      }

      // Back action via Backspace or Escape
      if ((e.key === 'Backspace' && !isInput) || e.key === 'Escape') {
        if (isFullscreenPanelOpen) {
          e.preventDefault();
          playBeep('select');
          setIsFullscreenPanelOpen(false);
          return;
        }

        if (isFullscreen || isPseudoFullscreen) {
          e.preventDefault();
          playBeep('select');
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
          }
          setIsFullscreen(false);
          setIsPseudoFullscreen(false);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, isPseudoFullscreen, isFullscreenPanelOpen, setIsFullscreenPanelOpen, triggerControlsActivity]);

  useEffect(() => {
    onVideoRef(videoRef.current);
    return () => {
      onVideoRef(null);
    };
  }, [onVideoRef]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.volume = volume;
      videoEl.muted = isMuted;
    }
  }, [volume, isMuted, url]);

  // Clean and start streaming whenever channel url changes
  useEffect(() => {
    if (!url) return;
    
    // Resolve HTTP stream unencrypted URL to bypass browser Mixed Content blocker over HTTPS secure network
    const isHttp = url.startsWith('http://');
    const playbackUrl = isHttp 
      ? `${window.location.origin}/api/stream-proxy?url=${encodeURIComponent(url)}` 
      : url;

    // Reset previous states
    setRetryCount(0);
    setStatusMessage('');
    setHasQualityLevels(false);
    setIsBuffering(true);

    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Destroy duplicate/old hls logic with advanced memory-leak prevention
    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch (err) {
        console.warn("Hls cleanup error:", err);
      }
      hlsRef.current = null;
    }

    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();

    const loadStream = () => {
      // 1. Native HLS support check (mainly Safari or iPhone)
      if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = playbackUrl;
        videoEl.play().catch(err => {
          if (err.name !== "NotAllowedError" && err.name !== "AbortError") {
            console.warn("Playback interrupted or delayed:", err);
          }
        });
      } 
      // 2. Play using hls.js (standard browser)
      else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          startFragPrefetch: true,
          testBandwidth: true,
          fragLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 6,
          liveSyncDurationCount: 3,
        });

        hlsRef.current = hls;
        hls.loadSource(playbackUrl);
        hls.attachMedia(videoEl);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const levels = hls.levels;
          if (levels && levels.length > 1) {
            setHasQualityLevels(true);
            applyQualityToHls(hls, playbackQuality, levels.length);
          } else {
            setHasQualityLevels(false);
          }
          videoEl.play().catch(() => {
            // Mute and overlay play trigger if browser blocks autoplay
            videoEl.muted = true;
            videoEl.play().catch(err => console.warn("Muted autoplay blocked:", err));
          });
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              setRetryCount(prev => {
                const updated = prev + 1;
                if (updated <= MAX_RETRIES) {
                  setStatusMessage(`⚠️ Connection error. Retry ${updated}/${MAX_RETRIES}...`);
                  setTimeout(() => {
                    loadStream();
                  }, 2500);
                } else {
                  setStatusMessage(`❌ Live feed offline. Please try another channel.`);
                }
                return updated;
              });
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              // Silently recover standard audio/video sync anomalies without warning overlays
              hls.recoverMediaError();
            } else {
              setStatusMessage(`❌ Error streaming channel. Please select another.`);
              if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
              }
            }
          }
        });
      } else {
        // Fallback natively to source element
        videoEl.src = playbackUrl;
        videoEl.play().catch(() => {
          setStatusMessage("❌ HLS is not supported in this browser.");
        });
      }
    };

    loadStream();

    return () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch (err) {
          console.warn("Hls unmount cleanup error:", err);
        }
        hlsRef.current = null;
      }
    };
  }, [url]);

  // Apply playback quality changes to active HLS container
  useEffect(() => {
    const hls = hlsRef.current;
    if (hls && hls.levels && hls.levels.length > 1) {
      applyQualityToHls(hls, playbackQuality, hls.levels.length);
    }
  }, [playbackQuality]);

  const applyQualityToHls = (hls: Hls, quality: PlaybackQuality, levelsCount: number) => {
    try {
      if (quality === 'auto') {
        hls.autoLevelCapping = -1;
        hls.currentLevel = -1;
        hls.nextLevel = -1;
        hls.loadLevel = -1;
      } else {
        let targetLevel = -1;
        if (quality === 'high') {
          targetLevel = levelsCount - 1;
        } else if (quality === 'medium') {
          targetLevel = Math.max(0, Math.floor(levelsCount * 0.6));
        } else if (quality === 'low') {
          targetLevel = Math.max(0, Math.floor(levelsCount * 0.3));
        }

        if (targetLevel >= 0 && targetLevel < levelsCount) {
          // Force override on all level controls to switch immediately and lock the quality
          hls.currentLevel = targetLevel;
          hls.nextLevel = targetLevel;
          hls.loadLevel = targetLevel;
        }
      }
    } catch (err) {
      console.error("Error applying quality level:", err);
    }
  };

  const selectQuality = (q: PlaybackQuality) => {
    playBeep('select');
    setPlaybackQuality(q);
    setShowQualityMenu(false);
  };

  const togglePlay = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    playBeep('select');
    if (videoEl.paused) {
      videoEl.play().catch(err => console.warn("Play trigger delayed:", err));
      setIsPlaying(true);
    } else {
      videoEl.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    playBeep('select');
    const nextMuted = !isMuted;
    videoEl.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleFullscreen = () => {
    playBeep('select');
    const container = document.getElementById('videoPlayerOuterContainer');
    if (!container) return;

    if (!document.fullscreenElement && !isPseudoFullscreen) {
      container.requestFullscreen?.()
        .then(() => {
          setIsFullscreen(true);
          if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
            try {
              (screen.orientation as any).lock('landscape').catch(() => {});
            } catch (e) {}
          }
        })
        .catch(() => {
          const videoEl = videoRef.current;
          if (videoEl) {
            (videoEl as any).webkitRequestFullscreen?.() || videoEl.requestFullscreen?.();
          }
        });
      setIsPseudoFullscreen(true);

      // Attempt immediate lock for devices supporting orientation locks
      if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
        try {
          (screen.orientation as any).lock('landscape').catch(() => {});
        } catch (e) {}
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      if (screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
        try {
          (screen.orientation as any).unlock();
        } catch (e) {}
      }
      setIsFullscreen(false);
      setIsPseudoFullscreen(false);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const targetTime = parseFloat(e.target.value);
    videoEl.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const isLive = !isFinite(duration) || duration === 0;
  const percent = duration > 0 ? (currentTime / duration) * 100 : 100;

  return (
    <section className="bg-transparent flex justify-center py-1.5 px-4 select-none">
      <div 
        id="videoPlayerOuterContainer"
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-[640px] bg-slate-950/85 rounded-2xl p-1 shadow-2xl relative border border-slate-800/50 transition-all duration-300 ${
          isFullscreen || isPseudoFullscreen 
            ? isMobilePortrait
              ? 'fixed z-[100] top-1/2 left-1/2 origin-center shadow-2xl overflow-hidden'
              : '!max-w-none !p-0 !border-0 !rounded-none fixed inset-0 z-[100] w-screen h-screen' 
            : ''
        }`}
        style={
          (isFullscreen || isPseudoFullscreen) && isMobilePortrait
            ? {
                width: '100vh',
                height: '100vw',
                transform: 'translate(-50%, -50%) rotate(90deg)',
              }
            : undefined
        }
      >
        <div 
          id="videoContainer" 
          onContextMenu={(e) => e.preventDefault()}
          className={`rounded-xl overflow-hidden aspect-video bg-black relative group/player w-full h-full transition-all duration-300 ${
            isFullscreen || isPseudoFullscreen ? '!rounded-none !aspect-none' : ''
          }`}
          onMouseMove={triggerControlsActivity}
          onMouseLeave={() => isPlaying && setShowControls(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main Video Element */}
          <video
            id="liveVideo"
            ref={videoRef}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            controls={false}
            autoPlay
            playsInline
            muted={isMuted}
            onClick={triggerControlsActivity}
            onPlay={() => {
              setIsPlaying(true);
              setIsBuffering(false);
            }}
            onPause={() => setIsPlaying(false)}
            onPlaying={() => setIsBuffering(false)}
            onWaiting={() => setIsBuffering(true)}
            onSeeking={() => setIsBuffering(true)}
            onSeeked={() => setIsBuffering(false)}
            onLoadStart={() => setIsBuffering(true)}
            onLoadedData={() => setIsBuffering(false)}
            onCanPlay={() => setIsBuffering(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
            onVolumeChange={(e) => setIsMuted(e.currentTarget.muted)}
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration || 0);
              setIsMuted(e.currentTarget.muted);
              setIsPlaying(!e.currentTarget.paused);
              setIsBuffering(false);
            }}
            className="w-full h-full object-contain block"
            poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='100%25' height='100%25' fill='%23000'/%3E%3C/svg%3E"
          />

          {/* Centered Buffering/Loading Overlay with "TV" display */}
          {url && isBuffering && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 pointer-events-none select-none z-20 transition-opacity duration-300">
              <div className="relative flex flex-col items-center justify-center">
                {/* Double ring effects */}
                <div className="absolute w-24 h-24 rounded-full border border-blue-500/20 animate-ping opacity-60" />
                <div className="absolute w-20 h-20 rounded-full border-4 border-t-blue-400 border-r-transparent border-b-blue-400 border-l-transparent animate-spin duration-1000 opacity-80" />
                
                {/* Beautiful container with Tv icon */}
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <Tv className="w-8 h-8 text-blue-400 animate-pulse" strokeWidth={2.5} />
                </div>
              </div>
            </div>
          )}

          {/* Centered Play Button when paused */}
          {!isPlaying && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer transition-all duration-300 z-10"
            >
              <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-xl transform transition-transform duration-300 hover:scale-110">
                <Play className="w-5 h-5 text-black fill-black ml-1" />
              </div>
            </div>
          )}

          {/* Custom Controls Bar matching image */}
          <div 
            className={`absolute bottom-0 inset-x-0 bg-transparent px-3.5 py-2 flex items-center justify-between gap-3 md:gap-4 transition-all duration-300 z-20 ${
              showControls ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0 pointer-events-none'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Play/Pause control option */}
            <button
              id="playPauseBtn"
              onClick={togglePlay}
              onFocus={() => {
                setShowControls(true);
                if (controlsTimeoutRef.current) {
                  window.clearTimeout(controlsTimeoutRef.current);
                  controlsTimeoutRef.current = null;
                }
              }}
              onBlur={() => {
                triggerControlsActivity();
              }}
              className="text-white hover:text-slate-200 cursor-pointer p-1 transition-colors outline-hidden flex-none"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white text-white hover:fill-slate-200 hover:text-slate-200 transition-colors" />
              ) : (
                <Play className="w-4 h-4 fill-white text-white hover:fill-slate-200 hover:text-slate-200 transition-colors" />
              )}
            </button>

            {/* Premium Lock Button replacing the Live Stream text indicator */}
            <div className="flex-1 flex items-center justify-start pl-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playBeep('select');
                  setIsLocked(true);
                  setShowControls(false);
                }}
                className="flex items-center justify-center p-2 rounded-xl bg-transparent hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all text-white cursor-pointer border border-transparent"
                title="Lock Display Controls"
              >
                <Lock className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Right side group icons: Volume, Gear settings, Fullscreen */}
            <div className="flex items-center gap-2.5 md:gap-3 flex-none relative">
              {/* Volume Controller with interactive sound slider */}
              <div className="flex items-center gap-1 bg-transparent px-1 py-0.5 rounded-lg border border-transparent">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-slate-200 cursor-pointer p-1 transition-colors outline-hidden flex justify-center items-center"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    if (val > 0) {
                      setIsMuted(false);
                    } else {
                      setIsMuted(true);
                    }
                  }}
                  className="w-12 sm:w-16 h-1 accent-white bg-slate-850 rounded-full appearance-none cursor-pointer focus:outline-hidden"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${(isMuted ? 0 : volume) * 100}%, #334155 ${(isMuted ? 0 : volume) * 100}%, #334155 100%)`,
                  }}
                  title="Volume"
                />
              </div>

              {/* Quality Settings (Using qualityBtn trigger for TV Spatial System compatibility) */}
              <div className="relative">
                <button
                  id="qualityBtn"
                  onClick={(e) => {
                    e.stopPropagation();
                    playBeep('select');
                    setShowQualityMenu(!showQualityMenu);
                  }}
                  onFocus={() => {
                    setShowControls(true);
                    if (controlsTimeoutRef.current) {
                      window.clearTimeout(controlsTimeoutRef.current);
                      controlsTimeoutRef.current = null;
                    }
                  }}
                  onBlur={() => {
                    triggerControlsActivity();
                  }}
                  className={`text-white hover:text-slate-200 cursor-pointer p-1 transition-colors outline-hidden flex justify-center items-center ${
                    showQualityMenu ? 'text-slate-200' : ''
                  }`}
                  title="Quality Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Popover options list */}
                {showQualityMenu && (
                  <div 
                    id="qualityMenu"
                    className="absolute bottom-9 right-0 bg-slate-900 border border-white/20 rounded-xl py-1 min-w-[100px] shadow-2xl flex flex-col z-50 animate-fade-in"
                  >
                    <div className="px-2.5 py-1 text-[9px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                      Quality
                    </div>
                    {(['auto', 'high', 'medium', 'low'] as PlaybackQuality[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => selectQuality(q)}
                        tabIndex={0}
                        onFocus={() => {
                          setShowControls(true);
                          if (controlsTimeoutRef.current) {
                            window.clearTimeout(controlsTimeoutRef.current);
                            controlsTimeoutRef.current = null;
                          }
                        }}
                        onBlur={() => {
                          triggerControlsActivity();
                        }}
                        className={`quality-opt-btn px-3 py-1.5 text-left text-[11px] hover:bg-white hover:text-slate-950 transition-colors cursor-pointer outline-hidden flex justify-between items-center ${
                          playbackQuality === q ? 'bg-white/10 text-white font-bold' : 'text-slate-300'
                        }`}
                      >
                        <span>{q.toUpperCase()}</span>
                        {playbackQuality === q && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggle fullscreen */}
              <button
                id="fsToggleBtn"
                onClick={toggleFullscreen}
                onFocus={() => {
                  setShowControls(true);
                  if (controlsTimeoutRef.current) {
                    window.clearTimeout(controlsTimeoutRef.current);
                    controlsTimeoutRef.current = null;
                  }
                }}
                onBlur={() => {
                  triggerControlsActivity();
                }}
                className="text-white hover:text-slate-200 hover:scale-115 active:scale-95 transition-all cursor-pointer p-1.5 flex justify-center items-center rounded-lg bg-transparent hover:bg-white/10 select-none border border-transparent"
                title="Toggle Fullscreen"
              >
                {isFullscreen || isPseudoFullscreen ? (
                  <svg className="w-5.5 h-5.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 4v4H4" />
                    <path d="M16 4v4h4" />
                    <path d="M16 20v-4h4" />
                    <path d="M8 20v-4H4" />
                  </svg>
                ) : (
                  <svg className="w-5.5 h-5.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 8V4h4" />
                    <path d="M16 4h4v4" />
                    <path d="M16 20h4v-4" />
                    <path d="M4 16v4h4" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Dynamic Status Display Overlay */}
          {statusMessage && (
            <div className="absolute bottom-12 inset-x-0 mx-auto max-w-xs text-center bg-black/95 text-white text-xs py-2 px-4 rounded-xl border-l-4 border-white shadow-lg pointer-events-none z-10 select-none">
              {statusMessage}
            </div>
          )}

          {/* Lock Screen Overlay (Only shown when screen is locked) */}
          {isLocked && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                triggerLockNotice();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                triggerLockNotice();
              }}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="absolute inset-0 bg-transparent z-50 pointer-events-auto select-none flex items-end justify-start p-4 sm:p-6"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playBeep('select');
                  setIsLocked(false);
                  setShowControls(true);
                }}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-900/90 text-white flex items-center justify-center shadow-2xl border border-white/20 hover:border-white active:scale-90 transition-all duration-300 pointer-events-auto cursor-pointer focus-visible:outline-hidden ${
                  showLockFeedback ? 'scale-115 bg-slate-850 ring-4 ring-white/30 border-white rotate-12' : 'scale-100'
                }`}
                title="Tap to Unlock display"
              >
                <Lock className="w-5.5 h-5.5 text-white fill-white/10 animate-pulse" />
              </button>
            </div>
          )}

          {/* Embedded FullscreenChannelPanel that is DOM-scoped inside #videoContainer */}
          <FullscreenChannelPanel
            isOpen={isFullscreenPanelOpen}
            onClose={() => setIsFullscreenPanelOpen(false)}
            filteredChannels={filteredChannels}
            activeChannelUrl={activeChannelUrl}
            onSelectChannel={onSelectChannel}
            fsCategory={fsCategory}
            setFsCategory={setFsCategory}
          />
        </div>
      </div>
    </section>
  );
};
