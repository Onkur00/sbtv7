/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RawChannelData, EnhancedChannel } from './types.ts';

// Import organized channels by categories
import { banglaChannels } from './channels/bangla/channels.ts';
import { newsChannels } from './channels/news/channels.ts';
import { sportsChannels } from './channels/sports/channels.ts';
import { kidsChannels } from './channels/kids/channels.ts';
import { hindiChannels } from './channels/hindi/channels.ts';
import { englishChannels } from './channels/english/channels.ts';
import { islamicChannels } from './channels/islamic/channels.ts';
import { sonatoniChannels } from './channels/sonatoni/channels.ts';
import { youtubeChannels } from './channels/youtube/channels.ts';

export const rawChannels: RawChannelData[] = [
  ...banglaChannels,
  ...newsChannels,
  ...sportsChannels,
  ...kidsChannels,
  ...hindiChannels,
  ...englishChannels,
  ...islamicChannels,
  ...sonatoniChannels,
  ...youtubeChannels
];

export const enhancedChannels: EnhancedChannel[] = rawChannels.map((ch, idx) => {
  const normGroup = (ch.groupTitle || '').trim().toLowerCase();
  
  const mapping: { [key: string]: string } = {
    "bangla": "bangla",
    "indian-bangla": "bangla",
    "indian bangla": "bangla",
    "kolkata bangla music": "bangla",
    "news": "news",
    "indian bangla news": "news",
    "news internasional": "news",
    "news internasional tv": "news",
    "english news": "news",
    "sports": "sports",
    "kids": "kids",
    "hindi": "hindi",
    "movies": "hindi",
    "hindi movies": "hindi",
    "hindi dabbing movies": "hindi",
    "music": "hindi",
    "information": "hindi",
    "english": "english",
    "islamik": "islamic",
    "islamic": "islamic",
    "sonatoni": "sonatoni",
    "youtube": "youtube"
  };

  const category = mapping[normGroup] || normGroup;

  return {
    id: `${ch.tvgId}-${idx}`,
    name: ch.tvgName,
    short: ch.tvgName.split(' ')[0],
    url: ch.url,
    category,
    logoUrl: ch.tvgLogo,
    groupTitle: ch.groupTitle,
    original: ch
  };
}).filter(ch => [
  "bangla",
  "news",
  "sports",
  "kids",
  "hindi",
  "english",
  "islamic",
  "sonatoni",
  "youtube"
].includes(ch.category));
