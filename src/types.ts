/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RawChannelData {
  tvgId: string;
  tvgName: string;
  tvgLogo: string;
  groupTitle: string;
  url: string;
}

export interface EnhancedChannel {
  id: string;
  name: string;
  short: string;
  url: string;
  category: string;
  logoUrl: string;
  groupTitle: string;
  original: RawChannelData;
}

export type PlaybackQuality = 'auto' | 'high' | 'medium' | 'low';
