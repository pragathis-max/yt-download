/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';

export interface FormatInfo {
  formatId: string;
  ext: string;
  resolution: string;
  height: number | null;
  fps: number | null;
  codec: string;
  bitrate: number | null;
  fileSize: number | null;
  type: 'video' | 'audio' | 'combined';
  hdr?: string;
  vcodec?: string;
  acodec?: string;
  asr?: number;
  audioChannels?: number;
}

export interface VideoMetadata {
  url: string;
  id: string;
  title: string;
  channel: string;
  duration: number; // in seconds
  thumbnail: string;
  uploadDate: string;
  description: string;
  viewCount: number;
  formats: FormatInfo[];
  subtitles: string[];
  isPlaylist: boolean;
  playlistTitle?: string;
  playlistVideos?: {
    id: string;
    title: string;
    duration: number;
    thumbnail: string;
    url: string;
    selected?: boolean;
  }[];
}

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  type: 'video' | 'audio' | 'video_only';
  resolution: string;
  format: string;
  status: DownloadStatus;
  progress: number; // 0 to 100
  speed: string; // e.g. "5.2 MiB/s"
  eta: string; // e.g. "00:15"
  downloadedSize: string; // e.g. "12.4 MiB"
  totalSize: string; // e.g. "50.1 MiB"
  remainingSize: string; // e.g. "37.7 MiB"
  error?: string;
  folder: string;
  date: string;
  subtitle: string; // 'none' or language code
  embedMetadata: boolean;
  embedThumbnail: boolean;
  downloadThumbnail: boolean;
  playlistId?: string;
}

export interface HistoryRecord {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  date: string;
  folder: string;
  quality: string;
  format: string;
  status: 'completed' | 'failed';
  size: string;
}

export interface UserSettings {
  theme: 'dark'; // Dark Mode only as per guidelines (No Unrequested Theme Selection)
  defaultQuality: string; // e.g. '1080p', '720p', 'best'
  defaultFolder: string;
  proxy: string;
  language: string;
  autoUpdate: boolean;
  maxSimultaneousDownloads: number;
  fallbackNearest: boolean;
  cookies?: string; // Support for YouTube Netscape cookies
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  thinking?: string;
}
