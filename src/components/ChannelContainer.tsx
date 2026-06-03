/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { EnhancedChannel } from '../types.ts';
import { playBeep } from '../utils/beep.ts';
import { 
  Tv, 
  Newspaper, 
  Gamepad2, 
  Smile, 
  Languages, 
  Compass, 
  Moon, 
  Sunrise, 
  PlaySquare,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface ChannelContainerProps {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  filteredChannels: EnhancedChannel[];
  allChannels: EnhancedChannel[];
  searchTerm: string;
  activeChannelUrl: string | null;
  onSelectChannel: (url: string, name: string, el?: HTMLElement) => void;
}

export const ChannelContainer: React.FC<ChannelContainerProps> = ({
  activeCategory,
  setActiveCategory,
  filteredChannels,
  allChannels,
  searchTerm,
  activeChannelUrl,
  onSelectChannel,
}) => {
  const isSearching = searchTerm.trim().length > 0;
  
  // High-performance dynamic rendering slice count (lazy loading) for flat grids
  const [visibleCount, setVisibleCount] = useState(80);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  // Reset rendering slice when category or search changes
  useEffect(() => {
    setVisibleCount(80);
  }, [activeCategory, searchTerm]);

  // Set up intersection observer for infinite scroll triggers at bottom of grid
  useEffect(() => {
    if (activeCategory === 'all' && !isSearching) return; // Grouped carousels don't need infinite scrolling loading mechanism

    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 60, filteredChannels.length));
        }
      },
      { rootMargin: '350px' }
    );

    observerRef.current.observe(triggerEl);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [filteredChannels, activeCategory, isSearching]);

  // Handle channel card selections
  const handleItemClick = (ch: EnhancedChannel, e: React.MouseEvent<HTMLDivElement>) => {
    playBeep('select');
    e.currentTarget.focus();
    onSelectChannel(ch.url, ch.name, e.currentTarget);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, ch: EnhancedChannel) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playBeep('select');
      e.currentTarget.focus();
      onSelectChannel(ch.url, ch.name, e.currentTarget);
    }
  };

  // Helper mapping of category IDs to display metadata
  const categoriesList = [
    { id: 'sports', label: 'Sports', icon: Gamepad2, color: 'text-lime-400' },
    { id: 'news', label: 'News', icon: Newspaper, color: 'text-sky-400' },
    { id: 'kids', label: 'Kids', icon: Smile, color: 'text-pink-400' },
    { id: 'bangla', label: 'Bangla', icon: Compass, color: 'text-emerald-400' },
    { id: 'hindi', label: 'Hindi', icon: Tv, color: 'text-orange-400' },
    { id: 'english', label: 'English', icon: Languages, color: 'text-violet-400' },
    { id: 'sonatoni', label: 'Sonatoni', icon: Sunrise, color: 'text-amber-400' },
    { id: 'islamic', label: 'Islamic', icon: Moon, color: 'text-teal-400' },
    { id: 'youtube', label: 'Youtube', icon: PlaySquare, color: 'text-red-400' },
  ];

  // VIEW 1: "All Channels" tab active without active searching -> Render beautiful partitioned carousels
  if (activeCategory === 'all' && !isSearching) {
    // Generate map grouping active channels by category ID keys
    const groupedMap = new Map<string, EnhancedChannel[]>();
    for (const ch of allChannels) {
      if (!groupedMap.has(ch.category)) {
        groupedMap.set(ch.category, []);
      }
      groupedMap.get(ch.category)!.push(ch);
    }

    return (
      <div className="space-y-2 px-5 py-0.5 bg-transparent select-none">
        {categoriesList.map((cat) => {
          const channelsInCat = groupedMap.get(cat.id) || [];
          if (channelsInCat.length === 0) return null;

          const displayChannels = channelsInCat;
          const hasMore = false;

          return (
            <section key={cat.id} className="relative">
              {/* Carousel Header block */}
              <div className="flex items-center justify-between mb-0.5 px-1">
                <div 
                  onClick={() => {
                    playBeep('select');
                    setActiveCategory(cat.id);
                  }}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <h3 className="text-sm font-bold text-white tracking-wider uppercase group-hover:text-blue-400 transition-colors">
                    {cat.label}
                  </h3>
                </div>
              </div>

              {/* Horizontal Scroll Track Wrapper container */}
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none items-center">
                {displayChannels.map((ch) => {
                  const isActive = activeChannelUrl === ch.url;
                  return (
                    <div
                      key={`grouped-${ch.id}-${ch.category}`}
                      data-url={ch.url}
                      data-group-row={cat.id}
                      tabIndex={0}
                      onClick={(e) => handleItemClick(ch, e)}
                      onKeyDown={(e) => handleKeyDown(e, ch)}
                      className={`channel-logo-card flex-none w-[74px] sm:w-[86px] p-1 sm:p-1.5 bg-[#131d31]/30 rounded-xl sm:rounded-2xl cursor-pointer transition-all border aspect-square flex items-center justify-center hover:bg-slate-800/60 focus-visible:outline-2 focus-visible:outline-white/40 outline-hidden hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] ${
                        isActive 
                          ? 'border-yellow-400 bg-slate-800 ring-3 ring-yellow-400/90 shadow-[0_0_14px_rgba(234,179,8,0.75)] scale-[1.06] font-bold active-channel z-10' 
                          : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      <img 
                        src={ch.logoUrl || `https://placehold.co/160x160/1e293b/ffffff?text=${ch.short}`} 
                        alt={ch.name} 
                        className={`w-full h-full rounded-lg sm:rounded-xl object-cover block transition-transform duration-300 ${
                          isActive ? 'shadow-lg shadow-yellow-500/40 scale-[1.01] border border-yellow-400' : 'shadow-md border border-white/5'
                        }`}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://placehold.co/160x160/1e293b/ffffff?text=${ch.short}`;
                        }}
                      />
                    </div>
                  );
                })}

                {hasMore && (
                  <div
                    key={`more-${cat.id}`}
                    onClick={() => {
                      playBeep('select');
                      setActiveCategory(cat.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        playBeep('select');
                        setActiveCategory(cat.id);
                      }
                    }}
                    tabIndex={0}
                    className="channel-logo-card flex-none w-[74px] sm:w-[86px] p-2 bg-gradient-to-br from-blue-950/20 to-indigo-950/20 hover:from-blue-900/35 hover:to-indigo-900/35 border border-blue-500/20 hover:border-blue-400/50 rounded-xl sm:rounded-2xl cursor-pointer transition-all aspect-square flex flex-col items-center justify-center text-center gap-0.5 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-white/40 focus:scale-[1.04]"
                    title="View more channels in this category"
                  >
                    <ChevronRight className="w-4 h-4 text-blue-400 animate-pulse shrink-0" />
                    <span className="text-[10px] text-blue-300 font-extrabold tracking-wider leading-none">
                      +{channelsInCat.length - 50}
                    </span>
                    <span className="text-[8px] text-slate-400 font-medium tracking-wide uppercase leading-none mt-0.5">More</span>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  // VIEW 2: Category selected or Search matched -> Render custom Flat Grids of channels
  const visibleChannels = filteredChannels.slice(0, visibleCount);

  return (
    <div className="px-5 py-2.5 bg-transparent select-none">
      {/* Dynamic Header Badge for the flat layout */}
      <div className="flex items-center gap-2 mb-4 ml-1">
        <h2 className="text-xs font-bold text-white tracking-widest uppercase mb-0.5">
          {isSearching ? 'Search Findings' : categoriesList.find(c => c.id === activeCategory)?.label || 'TV Directory'}
        </h2>
      </div>

      {filteredChannels.length === 0 ? (
        <div className="py-14 text-center text-slate-400 text-sm border border-dashed border-white/5 rounded-3xl bg-slate-900/10">
          No channels match your selection or search criteria.
        </div>
      ) : (
        <>
          {/* Flat Grid structure */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(74px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(86px,1fr))] gap-1.5 sm:gap-2.5">
            {visibleChannels.map((ch) => {
              const isActive = activeChannelUrl === ch.url;
              return (
                <div
                  key={`flat-${ch.id}-${ch.category}`}
                  data-url={ch.url}
                  tabIndex={0}
                  onClick={(e) => handleItemClick(ch, e)}
                  onKeyDown={(e) => handleKeyDown(e, ch)}
                  className={`channel-logo-card p-1 sm:p-1.5 bg-[#131d31]/30 rounded-xl sm:rounded-2xl cursor-pointer transition-all border w-full aspect-square flex items-center justify-center hover:bg-slate-800/60 focus-visible:outline-2 focus-visible:outline-white/40 outline-hidden hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] ${
                    isActive 
                      ? 'border-yellow-400 bg-slate-800 ring-3 ring-yellow-400/90 shadow-[0_0_14px_rgba(234,179,8,0.75)] scale-[1.06] font-bold active-channel z-10' 
                      : 'border-white/5 hover:border-white/20'
                  }`}
                >
                  <img 
                    src={ch.logoUrl || `https://placehold.co/160x160/1e293b/ffffff?text=${ch.short}`} 
                    alt={ch.name} 
                    className={`w-full h-full rounded-lg sm:rounded-xl object-cover block transition-transform duration-300 ${
                      isActive ? 'shadow-lg shadow-yellow-500/40 scale-[1.01] border border-yellow-400' : 'shadow-md border border-white/5'
                    }`}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://placehold.co/160x160/1e293b/ffffff?text=${ch.short}`;
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Trigger point for Infinite Scroll lazy loader loading more items */}
          {filteredChannels.length > visibleCount && (
            <div 
              ref={triggerRef} 
              className="py-6 flex justify-center items-center gap-2 text-slate-400 col-span-full"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span className="text-[11px] font-mono tracking-widest uppercase">Fetching extra feeds...</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
