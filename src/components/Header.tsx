/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { EnhancedChannel } from '../types.ts';
import { playBeep } from '../utils/beep.ts';
import { UserCredential } from '../users/credentials.ts';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filteredChannels: EnhancedChannel[];
  activeChannelUrl: string | null;
  onSelectChannel: (url: string, name: string, el?: HTMLElement) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  currentUser: UserCredential | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  setSearchTerm,
  filteredChannels,
  activeChannelUrl,
  onSelectChannel,
  inputRef,
  currentUser,
  onLogout,
}) => {
  const isSearching = searchTerm.trim().length > 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleItemClick = (ch: EnhancedChannel, e: React.MouseEvent<HTMLDivElement>) => {
    playBeep('select');
    onSelectChannel(ch.url, ch.name, e.currentTarget);
    setSearchTerm(''); // Clear search on selecting suggestion
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, ch: EnhancedChannel) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playBeep('select');
      onSelectChannel(ch.url, ch.name, e.currentTarget);
      setSearchTerm('');
    }
  };

  const handleLogoutClick = () => {
    playBeep('select');
    onLogout();
  };

  // Helper to escape regex special characters for highlighting search text
  const highlightText = (text: string, term: string) => {
    if (!term.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === term.toLowerCase() ? (
            <span key={index} className="bg-yellow-400 text-slate-900 font-bold px-0.5 rounded-sm">
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div className="sticky top-0 z-20 bg-transparent pb-1">
      {/* Search Bar Section */}
      <div className="mx-5 mt-1.5 mb-1 bg-[#0f172a]/95 px-4 py-1.5 rounded-full border border-white/10 flex items-center justify-between gap-3 shadow-lg">
        <div className="relative flex-1">
          <input
            id="searchInput"
            ref={inputRef}
            type="text"
            className="w-full bg-slate-800 border-none py-2 px-4.5 pr-16 rounded-full text-white text-sm outline-hidden focus:ring-2 focus:ring-white/30 focus:bg-[#0f172a] transition-all"
            placeholder="🔍 Search channel..."
            autoComplete="off"
            value={searchTerm}
            onChange={handleInputChange}
          />
          {isSearching && (
            <span 
              id="searchCount" 
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full"
            >
              {filteredChannels.length}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser && (
            <button
              id="logoutBtn"
              onClick={handleLogoutClick}
              className="bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 text-white/80 hover:text-white p-2.5 rounded-full transition-all focus-visible:outline-3 focus-visible:outline-yellow-400 cursor-pointer flex items-center justify-center shadow-md hover:scale-105 active:scale-95"
              title="Logout Account"
            >
              <LogOut className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Suggestion Strip */}
      {isSearching && filteredChannels.length > 0 && (
        <div id="horizontalStrip" className="mx-5 my-1 overflow-x-auto overflow-y-hidden whitespace-nowrap py-1 scrollbar-none">
          <div className="flex gap-2">
            {filteredChannels.slice(0, 25).map((ch) => {
              const isActive = activeChannelUrl === ch.url;
              return (
                <div
                  key={`strip-${ch.id}-${ch.category}`}
                  data-url={ch.url}
                  data-name={ch.name}
                  tabIndex={0}
                  onClick={(e) => handleItemClick(ch, e)}
                  onKeyDown={(e) => handleKeyDown(e, ch)}
                  className={`strip-item inline-flex items-center gap-1.5 bg-slate-950 px-3.5 py-1 rounded-full cursor-pointer text-xs font-semibold border-2 transition-all hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-white/40 outline-hidden ${
                    isActive 
                      ? 'border-white bg-slate-900 text-white ring-2 ring-white/30' 
                      : 'border-white/10 text-white'
                  }`}
                >
                  <img 
                    src={ch.logoUrl || `https://placehold.co/40x40/1e293b/facc15?text=${ch.short[0]}`} 
                    alt={ch.name} 
                    className="w-5 h-5 rounded-full object-cover shrink-0" 
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://placehold.co/40x40/1e293b/facc15?text=${ch.short[0]}`;
                    }}
                  />
                  <span>{highlightText(ch.name, searchTerm)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
