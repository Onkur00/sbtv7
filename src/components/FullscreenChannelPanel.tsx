/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { EnhancedChannel } from '../types.ts';
import { enhancedChannels } from '../data.ts';
import { playBeep } from '../utils/beep.ts';

interface FullscreenChannelPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filteredChannels: EnhancedChannel[]; // Kept for type compatibility
  activeChannelUrl: string | null;
  onSelectChannel: (url: string, name: string) => void;
  fsCategory: string;
  setFsCategory: (category: string) => void;
}

export const FullscreenChannelPanel: React.FC<FullscreenChannelPanelProps> = ({
  isOpen,
  onClose,
  activeChannelUrl,
  onSelectChannel,
  fsCategory,
  setFsCategory,
}) => {
  const listRef = useRef<HTMLDivElement | null>(null);

  // Dynamically filter all channels based on the overlay's selected category
  const channelsToRender = useMemo(() => {
    if (fsCategory === 'all') return enhancedChannels;
    return enhancedChannels.filter(ch => ch.category === fsCategory);
  }, [fsCategory]);

  // Find the active channel index in channelsToRender
  const activeIdx = useMemo(() => {
    if (!activeChannelUrl) return -1;
    return channelsToRender.findIndex(ch => ch.url === activeChannelUrl);
  }, [channelsToRender, activeChannelUrl]);

  // Infinite scroll logic for Fullscreen channels screen overlay
  const [fsVisibleCount, setFsVisibleCount] = useState(60);
  const fsTriggerRef = useRef<HTMLDivElement | null>(null);
  const fsObserverRef = useRef<IntersectionObserver | null>(null);

  // Adjust rendering slice count dynamically to ensure active channel and its neighboring channels are fully rendered
  useEffect(() => {
    if (isOpen) {
      if (activeIdx !== -1) {
        setFsVisibleCount(prev => Math.max(prev, activeIdx + 30));
      } else {
        setFsVisibleCount(60);
      }
    }
  }, [isOpen, activeIdx, fsCategory]);

  // Reset slice limit when category changes manually
  useEffect(() => {
    setFsVisibleCount(60);
  }, [fsCategory]);

  // Set up intersection observer based on scroll trigger item in fullscreen
  useEffect(() => {
    if (!isOpen) return;

    const fsTriggerEl = fsTriggerRef.current;
    if (!fsTriggerEl) return;

    if (fsObserverRef.current) fsObserverRef.current.disconnect();

    fsObserverRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setFsVisibleCount((prev) => Math.min(prev + 40, channelsToRender.length));
        }
      },
      { 
        root: listRef.current, // Observe intersection relative to scrollable grid container itself! 
        rootMargin: '200px' 
      }
    );

    fsObserverRef.current.observe(fsTriggerEl);

    return () => {
      if (fsObserverRef.current) fsObserverRef.current.disconnect();
    };
  }, [channelsToRender, isOpen]);

  const categories = [
    { id: 'all', label: 'All Channels' },
    { id: 'sports', label: 'Sports' },
    { id: 'news', label: 'News' },
    { id: 'kids', label: 'Kids' },
    { id: 'bangla', label: 'Bangla' },
    { id: 'hindi', label: 'Hindi' },
    { id: 'english', label: 'English' },
    { id: 'sonatoni', label: 'Sonatoni' },
    { id: 'islamic', label: 'Islamic' },
    { id: 'youtube', label: 'Youtube' },
  ];

  // Auto focus the active channel or category button when panel is opened
  useEffect(() => {
    if (isOpen && listRef.current) {
      const timer = setTimeout(() => {
        if (!listRef.current) return;
        const activeCard = listRef.current.querySelector(`.fs-channel-card[data-url="${activeChannelUrl}"]`) as HTMLElement;
        if (activeCard) {
          activeCard.focus();
          try {
            activeCard.scrollIntoView({ block: 'center', behavior: 'instant' } as any);
          } catch (e) {
            activeCard.scrollIntoView({ block: 'center', behavior: 'auto' });
          }
        } else {
          const activeBtn = listRef.current.querySelector('.fs-cat-btn.bg-white') as HTMLElement;
          if (activeBtn) {
            activeBtn.focus();
          } else {
            const firstItem = listRef.current.querySelector('.fs-channel-item') as HTMLElement;
            if (firstItem) {
              firstItem.focus();
            }
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeChannelUrl, fsCategory]);

  if (!isOpen) return null;

  const handleCategoryClick = (catId: string) => {
    playBeep('select');
    setFsCategory(catId);
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, catId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playBeep('select');
      setFsCategory(catId);
    }
  };

  const handleItemClick = (ch: EnhancedChannel, e: React.MouseEvent<HTMLDivElement>) => {
    playBeep('select');
    e.currentTarget.focus();
    onSelectChannel(ch.url, ch.name, e.currentTarget);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, ch: EnhancedChannel) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playBeep('select');
      e.currentTarget.focus();
      onSelectChannel(ch.url, ch.name, e.currentTarget);
      onClose();
    }
  };

  return (
    <div 
      id="fullscreenPanel" 
      className="absolute inset-0 bg-slate-950/25 backdrop-blur-[3px] p-5 z-50 flex flex-col justify-end gap-3 select-none transition-all duration-300 animate-slide-up"
    >
      {/* Panel Header */}
      <div className="panel-header flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10 mt-auto">
        <div className="flex items-center justify-between md:justify-start gap-4">
          {/* Title and Badge removed as per user request */}
        </div>

        {/* Categories Bar inside the overlay for complete accessibility */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full scrollbar-none whitespace-nowrap">
          {categories.map((cat) => {
            const isActive = fsCategory === cat.id;
            return (
              <button
                key={`fscat-${cat.id}`}
                onClick={() => handleCategoryClick(cat.id)}
                onKeyDown={(e) => handleCategoryKeyDown(e, cat.id)}
                className={`fs-channel-item fs-cat-btn px-4 py-1.5 rounded-full font-bold text-xs cursor-pointer transition-all shrink-0 outline-hidden focus-visible:outline-2 focus-visible:outline-white/40 focus-visible:scale-105 ${
                  isActive 
                    ? 'bg-white text-slate-950 shadow-md ring-1 ring-white/50 font-extrabold' 
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-white/5'
                }`}
                tabIndex={0}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          id="closePanelBtn"
          onClick={() => {
            playBeep('select');
            onClose();
          }}
          className="absolute top-4 right-4 text-white bg-slate-900 hover:bg-slate-800/80 h-8 w-8 text-sm flex items-center justify-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-white/40 focus-visible:outline-offset-2 outline-hidden transition-colors border border-white/5"
          tabIndex={0}
          title="Close guide"
        >
          ✕
        </button>
      </div>

      {/* Channel Grid matching the premium dashboard */}
      <div 
        ref={listRef}
        id="fullscreenChannelList" 
        className="grid grid-cols-[repeat(auto-fill,minmax(74px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(86px,1fr))] gap-2 max-h-[50vh] overflow-y-auto py-2 pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20"
      >
        {channelsToRender.length === 0 ? (
          <div className="text-center text-slate-400 text-[12px] py-10 w-full col-span-full">
            ⚠️ No channels available under this match.
          </div>
        ) : (
          <>
            {channelsToRender.slice(0, fsVisibleCount).map((ch) => {
              const isActive = activeChannelUrl === ch.url;
              return (
                <div
                  key={`fscard-${ch.id}-${ch.category}`}
                  data-url={ch.url}
                  data-name={ch.name}
                  tabIndex={0}
                  onClick={(e) => handleItemClick(ch, e)}
                  onKeyDown={(e) => handleKeyDown(e, ch)}
                  className={`fs-channel-item fs-channel-card p-1 sm:p-1.5 rounded-xl sm:rounded-2xl text-center cursor-pointer transition-all border outline-hidden flex flex-col justify-center items-center hover:-translate-y-0.5 hover:bg-white/10 hover:scale-[1.10] focus-visible:outline-2 focus-visible:outline-white/40 focus-visible:scale-[1.10] ${
                    isActive 
                      ? 'border-yellow-400 bg-slate-800 ring-3 ring-yellow-400/90 shadow-[0_0_14px_rgba(234,179,8,0.75)] scale-[1.06] font-bold active-channel z-10' 
                      : 'border-white/5 bg-[#131d31]/30'
                  }`}
                >
                  <img 
                    src={ch.logoUrl || `https://placehold.co/160x160/1e293b/facc15?text=${ch.short}`} 
                    alt={ch.name} 
                    className={`w-full h-full rounded-lg sm:rounded-xl mx-auto object-cover block transition-transform duration-300 ${
                      isActive ? 'shadow-lg shadow-yellow-500/40 border border-yellow-400' : 'shadow-md border border-white/5 hover:border-white/20'
                    }`}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://placehold.co/160x160/1e293b/facc15?text=${ch.short}`;
                    }}
                  />
                </div>
              );
            })}
            
            {/* Trigger point for overlay guide infinite load */}
            {channelsToRender.length > fsVisibleCount && (
              <div 
                ref={fsTriggerRef} 
                className="col-span-full py-4 flex justify-center items-center gap-1.5 text-slate-400 text-[10px] uppercase font-mono tracking-widest select-none"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>Loading more links...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
