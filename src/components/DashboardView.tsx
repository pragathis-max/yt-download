/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Search,
  Clipboard,
  Info,
  RefreshCw,
  Video,
  Music,
  Download,
  AlertCircle,
  Clock,
  Calendar,
  Check,
  Pause,
  Play,
  X,
  FileText,
  Volume2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldCheck,
  Database,
  ListVideo,
  Settings,
  Shield
} from "lucide-react";
import { VideoMetadata, DownloadItem, UserSettings, FormatInfo, SystemStatus } from "../types.js";

interface DashboardViewProps {
  settings: UserSettings;
  activeDownloads: DownloadItem[];
  currentVideo: VideoMetadata | null;
  setCurrentVideo: (video: VideoMetadata | null) => void;
  setCurrentTab: (tab: string) => void;
  systemStatus: SystemStatus | null;
  backendOffline: boolean;
}

export default function DashboardView({
  settings,
  activeDownloads,
  currentVideo,
  setCurrentVideo,
  setCurrentTab,
  systemStatus,
  backendOffline
}: DashboardViewProps) {
  const [urlInput, setUrlInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration options for current download
  const [downloadType, setDownloadType] = useState<'video' | 'audio' | 'video_only'>('video');
  const [resolution, setResolution] = useState('1080p');
  const [format, setFormat] = useState('mp4');
  const [subtitle, setSubtitle] = useState('none');
  const [embedMetadata, setEmbedMetadata] = useState(true);
  const [embedThumbnail, setEmbedThumbnail] = useState(true);
  const [downloadThumbnail, setDownloadThumbnail] = useState(false);
  
  // Advanced Inspector State
  const [showInspector, setShowInspector] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'all' | 'video' | 'audio'>('all');

  // Playlist state
  const [playlistVideos, setPlaylistVideos] = useState<any[]>([]);
  const [isPlaylistMode, setIsPlaylistMode] = useState(false);
  const [playlistDownloadType, setPlaylistDownloadType] = useState<'entire' | 'selected' | 'single'>('selected');

  // Load state
  useEffect(() => {
    if (currentVideo) {
      setUrlInput(currentVideo.url);
      
      // Auto-set first available resolution
      const heights = currentVideo.formats
        .filter(f => f.type === 'video' || f.type === 'combined')
        .map(f => f.height)
        .filter(Boolean) as number[];
      
      const uniqueHeights = Array.from(new Set(heights)).sort((a, b) => b - a);
      if (uniqueHeights.length > 0) {
        const topHeight = uniqueHeights[0];
        setResolution(`${topHeight}p`);
      } else {
        setResolution('best');
      }

      if (currentVideo.isPlaylist && currentVideo.playlistVideos) {
        setPlaylistVideos(currentVideo.playlistVideos.map(v => ({ ...v, selected: true })));
        setIsPlaylistMode(true);
      } else {
        setIsPlaylistMode(false);
      }
    }
  }, [currentVideo]);

  // Read available resolutions dynamically from formats
  const getAvailableResolutions = () => {
    if (!currentVideo) return [];
    const heights = currentVideo.formats
      .filter(f => f.type === 'video' || f.type === 'combined')
      .map(f => f.height)
      .filter(Boolean) as number[];
    
    const uniqueHeights = Array.from(new Set(heights)).sort((a, b) => b - a);
    return uniqueHeights.map(h => `${h}p`);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text);
        analyzeUrl(text);
      }
    } catch (err) {
      // Browser didn't grant clipboard permissions, fall back to manual pasting
      setError("Clipboard read permission denied. Please paste manually using Ctrl+V.");
      setTimeout(() => setError(null), 4000);
    }
  };

  const analyzeUrl = async (urlToAnalyze?: string) => {
    const url = urlToAnalyze || urlInput;
    if (!url.trim()) return;

    setAnalyzing(true);
    setError(null);
    setCurrentVideo(null);
    setIsPlaylistMode(false);

    const isPlaylistUrl = url.includes("list=") || url.includes("playlist");
    const endpoint = isPlaylistUrl ? "/api/playlist-info" : "/api/info";

    try {
      const res = await fetch(`${endpoint}?url=${encodeURIComponent(url)}`);
      let errMsg = "Failed to analyze URL.";
      
      if (!res.ok) {
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await res.json();
            errMsg = errData.error || errMsg;
          } else {
            const textMsg = await res.text();
            if (textMsg && textMsg.length < 500) {
              errMsg = textMsg;
            } else {
              errMsg = `Server returned an error status (${res.status}): ${res.statusText || "Internal Error"}`;
            }
          }
        } catch (parseErr) {
          errMsg = `Server error (${res.status}): ${res.statusText || "Internal Error"}`;
        }
        throw new Error(errMsg);
      }

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error("The server responded with invalid data. Please try again.");
      }
      setCurrentVideo(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while communicating with the server.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadTrigger = async (videoToDownload?: any) => {
    const item = videoToDownload || currentVideo;
    if (!item) return;

    const downloadPayload = {
      id: Math.random().toString(36).substring(7),
      url: item.url,
      title: item.title,
      thumbnail: item.thumbnail,
      type: downloadType,
      resolution: downloadType === 'audio' ? 'audio' : resolution,
      format,
      subtitle,
      embedMetadata,
      embedThumbnail,
      downloadThumbnail
    };

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(downloadPayload),
      });

      if (!res.ok) throw new Error("Failed to start download process.");
    } catch (err: any) {
      alert(`Download Error: ${err.message}`);
    }
  };

  const handlePlaylistDownload = async () => {
    if (!currentVideo || !currentVideo.isPlaylist) return;

    const videosToProcess = playlistVideos.filter(v => v.selected);
    if (videosToProcess.length === 0) {
      alert("Please select at least one video to download.");
      return;
    }

    for (const vid of videosToProcess) {
      const downloadPayload = {
        id: Math.random().toString(36).substring(7),
        url: vid.url,
        title: vid.title,
        thumbnail: vid.thumbnail,
        type: downloadType,
        resolution: downloadType === 'audio' ? 'audio' : resolution,
        format,
        subtitle,
        embedMetadata,
        embedThumbnail,
        downloadThumbnail
      };

      try {
        await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(downloadPayload),
        });
      } catch (err) {
        console.error("Failed to enqueue playlist video:", vid.title);
      }
    }
  };

  const handleControlAction = async (id: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      await fetch("/api/download/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
    } catch (e) {
      console.error("Download control action failed:", e);
    }
  };

  const toggleSelectVideo = (idx: number) => {
    setPlaylistVideos(prev => prev.map((v, i) => i === idx ? { ...v, selected: !v.selected } : v));
  };

  const toggleSelectAll = () => {
    const allSelected = playlistVideos.every(v => v.selected);
    setPlaylistVideos(prev => prev.map(v => ({ ...v, selected: !allSelected })));
  };

  const formatDuration = (secs: number) => {
    if (!secs) return "0:00";
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainder = secs % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
    }
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div id="dashboard-view" className="space-y-6 max-w-5xl mx-auto py-2">
      
      {/* Stateless/Serverless (Vercel) Deployment Warn Banner */}
      {(backendOffline || (systemStatus && !systemStatus.ytDlpInstalled)) && (
        <div id="vercel-serverless-warning" className="bg-amber-950/25 border border-amber-500/30 rounded-3xl p-6 space-y-4 animate-fadeIn text-amber-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-400 flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-base font-semibold text-amber-100 flex items-center gap-2">
                Hosting Compatibility Mode Active (Serverless / Static Environment)
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {backendOffline ? (
                  <>
                    We detected that this application is hosted as a <strong>static frontend (or on Vercel without a configured API route)</strong>. 
                    The Express backend service is offline, which means media extraction, cookies processing, and downloads will not work.
                  </>
                ) : (
                  <>
                    We detected that this server is running in a <strong>Serverless Environment (like Vercel)</strong>. 
                    Serverless platforms are stateless, read-only, have short timeouts, and lack the custom CLI dependencies (<code>yt-dlp</code> and <code>ffmpeg</code>) required to download and transcode video/audio.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="pl-0 sm:pl-14 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-[#1E1914] border border-amber-500/10 rounded-2xl p-4 space-y-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block">Option A: Running Locally (Recommended)</span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Download/clone this code, make sure you have <code className="text-zinc-200 font-semibold">Node.js</code>, <code className="text-zinc-200 font-semibold">yt-dlp</code>, and <code className="text-zinc-200 font-semibold">ffmpeg</code> installed, and run:
              </p>
              <div className="bg-black/40 px-3 py-2 rounded-lg font-mono text-[11px] text-zinc-300 border border-zinc-800 select-all">
                npm run dev
              </div>
            </div>

            <div className="bg-[#1E1914] border border-amber-500/10 rounded-2xl p-4 space-y-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block">Option B: Deploy to a Full-Stack Host</span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                To run this app in the cloud, deploy it as a persistent full-stack docker container or VM where background tasks can run without timeouts:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a 
                  href="https://render.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#FF4F12]/10 hover:bg-[#FF4F12]/20 border border-[#FF4F12]/20 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1 cursor-pointer"
                >
                  Deploy to Render ↗
                </a>
                <a 
                  href="https://railway.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#0B0D0E] hover:bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1 cursor-pointer"
                >
                  Deploy to Railway ↗
                </a>
                <a 
                  href="https://cloud.google.com/run" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1 cursor-pointer"
                >
                  Google Cloud Run ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Alert Banner */}
      {error && (
        <div id="dashboard-error-banner" className="bg-red-950/20 border border-red-900 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-red-200 animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
            <div className="text-sm">
              <span className="font-semibold">Analysis Failed:</span> {error}
            </div>
          </div>
          {(error.toLowerCase().includes("cookies") || error.toLowerCase().includes("bot") || error.toLowerCase().includes("sign in")) && (
            <button
              onClick={() => setCurrentTab("settings")}
              className="flex-shrink-0 px-3.5 py-1.5 bg-red-600/25 hover:bg-red-600/40 border border-red-500/30 hover:border-red-500/60 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Configure Cookies
            </button>
          )}
        </div>
      )}

      {/* Bot Detection & Sign-In Help Assistant Card */}
      {error && (error.toLowerCase().includes("cookies") || error.toLowerCase().includes("bot") || error.toLowerCase().includes("sign in")) && (
        <div id="cookies-bypass-helper" className="bg-zinc-900/50 border border-red-500/20 rounded-3xl p-6 space-y-5 animate-fadeIn">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex-shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-zinc-100">
                Why YouTube Blocks Requests & How to Bypass It
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Because this application runs on a cloud server/datacenter IP address, YouTube detects automated activity and demands cookie-based browser verification (bot check). You can easily bypass this by pasting your browser session's YouTube cookies.
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">
              3-Step Solution: Get Your Cookies in 1 Minute
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-950/40 border border-zinc-800 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">1</span>
                  <span className="text-xs font-bold text-zinc-200">Open YouTube</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Go to <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">youtube.com ↗</a> in your browser where you are logged into your account.
                </p>
              </div>

              <div className="bg-zinc-950/40 border border-zinc-800 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">2</span>
                  <span className="text-xs font-bold text-zinc-200">Copy Cookie Header</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300">F12</kbd> (DevTools) &rarr; Network. Refresh the page, click any request to <code className="text-zinc-300">youtube.com</code>, and copy the value of the <strong className="text-red-400 font-mono">Cookie:</strong> Request Header.
                </p>
              </div>

              <div className="bg-zinc-950/40 border border-zinc-800 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">3</span>
                  <span className="text-xs font-bold text-zinc-200">Paste & Save</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Click the button below, paste your copied text into the cookies box in Settings, and hit "Save Configuration".
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCurrentTab("settings")}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-950/20"
              >
                <Settings className="w-4 h-4" />
                Go to Settings & Apply Cookies
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input panel with clipboard auto-detect */}
      <div id="url-input-card" className="bg-[#1A1A1A] border border-[#333333] rounded-3xl p-6 space-y-4">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Paste YouTube Video or Playlist Link
        </label>
        
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=... or playlist link"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyzeUrl()}
              disabled={analyzing}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-2xl pl-11 pr-28 py-3.5 text-sm text-[#F1F1F1] focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 disabled:opacity-50 transition-all font-mono"
            />
            <Search className="absolute left-4 top-4.5 w-4 h-4 text-zinc-500" />
            <button
              onClick={handlePaste}
              disabled={analyzing}
              className="absolute right-3 top-2.5 px-3 py-1.5 bg-[#2A2A2A] border border-[#333333] hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Detect link from clipboard"
            >
              <Clipboard className="w-3.5 h-3.5 text-red-500" />
              Auto Paste
            </button>
          </div>

          <button
            onClick={() => analyzeUrl()}
            disabled={analyzing || !urlInput.trim()}
            className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-red-600/20 transition-all"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Analyze URL
              </>
            )}
          </button>
        </div>

        {/* Drag and Drop mock link indicator */}
        <div className="text-[10px] text-zinc-500 font-mono text-center flex items-center justify-center gap-2 bg-[#0F0F0F] p-2 rounded-xl border border-dashed border-[#333333]">
          <span>🎯 PRO-TIP: You can drop YouTube links directly onto the browser window to auto-detect.</span>
        </div>
      </div>

      {/* Loading Skeleton during Analysis */}
      {analyzing && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-3xl p-6 flex flex-col md:flex-row gap-6 animate-pulse">
          <div className="w-full md:w-64 aspect-video rounded-2xl bg-zinc-800"></div>
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-zinc-800 rounded"></div>
              <div className="h-3 bg-zinc-800 rounded w-5/6"></div>
            </div>
            <div className="flex gap-4">
              <div className="h-6 bg-zinc-800 rounded w-20"></div>
              <div className="h-6 bg-zinc-800 rounded w-24"></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Video metadata & selector pane */}
      {currentVideo && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-3xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Visual Card / Thumbnail Overlay */}
            <div className="w-full md:w-80 flex-shrink-0">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#0F0F0F] border border-[#333333] shadow-lg group">
                <img
                  src={currentVideo.thumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600"}
                  alt={currentVideo.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-85"></div>
                <div className="absolute bottom-3 right-3 bg-black/80 border border-[#333333] px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-red-500" />
                  {formatDuration(currentVideo.duration)}
                </div>
              </div>
            </div>

            {/* Video Details */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest font-bold text-red-500 bg-red-600/10 border border-red-900/30 px-2.5 py-0.5 rounded-full">
                  {currentVideo.isPlaylist ? "YouTube Playlist" : "Video Details Loaded"}
                </span>
                <h3 className="font-bold text-lg md:text-xl text-[#F1F1F1] tracking-tight leading-snug mt-1.5" title={currentVideo.title}>
                  {currentVideo.title}
                </h3>
                <p className="text-sm text-zinc-400 font-semibold">{currentVideo.channel}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {currentVideo.uploadDate}
                </span>
                <span>•</span>
                <span>{currentVideo.viewCount ? `${currentVideo.viewCount.toLocaleString()} views` : "Playlist"}</span>
              </div>

              {!currentVideo.isPlaylist && (
                <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl line-clamp-2">
                  {currentVideo.description || "No description provided."}
                </p>
              )}
            </div>
          </div>

          {/* Form and Selection Settings */}
          <div className="border-t border-[#333333] pt-6">
            
            {/* Playlist videos checklist */}
            {isPlaylistMode && currentVideo.playlistVideos && (
              <div className="bg-[#0F0F0F] border border-[#333333] rounded-2xl p-4 space-y-4 mb-6">
                <div className="flex items-center justify-between border-b border-[#333333] pb-2.5">
                  <div className="flex items-center gap-2">
                    <ListVideo className="w-4 h-4 text-red-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Playlist Checklist</h4>
                  </div>
                  <button
                    onClick={toggleSelectAll}
                    className="text-[10px] text-red-400 font-mono hover:text-white cursor-pointer"
                  >
                    Select/Deselect All ({playlistVideos.length} videos)
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                  {playlistVideos.map((vid, idx) => (
                    <label key={idx} className="flex items-center gap-3 bg-[#1A1A1A] border border-[#333333] p-2 rounded-xl cursor-pointer hover:bg-zinc-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={vid.selected}
                        onChange={() => toggleSelectVideo(idx)}
                        className="rounded border-[#333333] text-red-600 focus:ring-red-500 bg-black accent-red-600 h-3.5 w-3.5"
                      />
                      <span className="text-xs text-zinc-300 truncate flex-1">{vid.title}</span>
                      <span className="text-[10px] font-mono text-zinc-500 flex-shrink-0">{formatDuration(vid.duration)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Type Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Download Mode</label>
                <div className="grid grid-cols-3 gap-2 bg-[#0F0F0F] p-1 rounded-xl border border-[#333333]">
                  <button
                    onClick={() => { setDownloadType('video'); setFormat('mp4'); }}
                    className={`py-2 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      downloadType === 'video' ? "bg-red-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video+Audio</span>
                  </button>
                  <button
                    onClick={() => { setDownloadType('audio'); setFormat('mp3'); }}
                    className={`py-2 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      downloadType === 'audio' ? "bg-red-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Audio Only</span>
                  </button>
                  <button
                    onClick={() => { setDownloadType('video_only'); setFormat('mp4'); }}
                    className={`py-2 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      downloadType === 'video_only' ? "bg-red-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Video Only</span>
                  </button>
                </div>
              </div>

              {/* Format Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">File Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-[#0F0F0F] border border-[#333333] rounded-xl px-3 py-2.5 text-xs text-[#F1F1F1] focus:outline-none focus:border-red-500"
                >
                  {downloadType === 'audio' ? (
                    <>
                      <option value="mp3">MP3 (High Quality Audio)</option>
                      <option value="m4a">M4A (AAC Audio)</option>
                      <option value="aac">AAC (Advanced Audio)</option>
                      <option value="wav">WAV (Lossless Waveform)</option>
                      <option value="opus">OPUS (High Efficiency)</option>
                    </>
                  ) : (
                    <>
                      <option value="mp4">MP4 (Highly Compatible)</option>
                      <option value="mkv">MKV (Matroska Media)</option>
                      <option value="webm">WEBM (Modern Web Video)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Quality / Resolution (only available ones) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  {downloadType === 'audio' ? "Audio Bitrate / Selection" : "Quality Selection"}
                </label>
                {downloadType === 'audio' ? (
                  <select
                    value={['320', '256', '192', '128'].includes(resolution) || resolution === 'best' || resolution.endsWith('p') ? '320' : resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-[#0F0F0F] border border-[#333333] rounded-xl px-3 py-2.5 text-xs text-[#F1F1F1] focus:outline-none focus:border-red-500"
                  >
                    <option value="320">320kbps (Best Fidelity)</option>
                    <option value="256">256kbps (Standard HD)</option>
                    <option value="192">192kbps (Medium Quality)</option>
                    <option value="128">128kbps (Compact Size)</option>
                    {resolution && resolution !== 'best' && resolution !== 'audio' && !['320', '256', '192', '128'].includes(resolution) && !resolution.endsWith('p') && (
                      <option value={resolution}>Direct Audio Stream ID: {resolution}</option>
                    )}
                  </select>
                ) : (
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-[#0F0F0F] border border-[#333333] rounded-xl px-3 py-2.5 text-xs text-[#F1F1F1] focus:outline-none focus:border-red-500"
                  >
                    <option value="best">Best Quality (Auto-Select Maximum)</option>
                    {getAvailableResolutions().map(res => (
                      <option key={res} value={res}>{res} (Available)</option>
                    ))}
                    {resolution && resolution !== 'best' && resolution !== 'audio' && !getAvailableResolutions().includes(resolution) && (
                      <option value={resolution}>Direct Video Stream ID: {resolution}</option>
                    )}
                  </select>
                )}
              </div>
            </div>

            {/* Extra Options panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Subtitles */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Subtitles Support</label>
                <select
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-[#0F0F0F] border border-[#333333] rounded-xl px-3 py-2 text-xs text-[#F1F1F1] focus:outline-none focus:border-red-500"
                >
                  <option value="none">None (No Subtitles)</option>
                  {currentVideo.subtitles && currentVideo.subtitles.length > 0 ? (
                    currentVideo.subtitles.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))
                  ) : (
                    <>
                      <option value="en">English Subs</option>
                      <option value="ta">Tamil Subs</option>
                      <option value="en (auto)">Auto-Generated English</option>
                    </>
                  )}
                </select>
              </div>

              {/* Embedding checkboxes */}
              <div className="flex flex-wrap gap-4 items-center h-full pt-4">
                <label className="flex items-center gap-2 text-xs text-[#F1F1F1] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={embedMetadata}
                    onChange={(e) => setEmbedMetadata(e.target.checked)}
                    className="rounded border-[#333333] bg-[#0F0F0F] accent-red-600 text-red-600 h-4 w-4"
                  />
                  Embed Metadata (Artist, Title)
                </label>
                <label className="flex items-center gap-2 text-xs text-[#F1F1F1] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={embedThumbnail}
                    onChange={(e) => setEmbedThumbnail(e.target.checked)}
                    className="rounded border-[#333333] bg-[#0F0F0F] accent-red-600 text-red-600 h-4 w-4"
                  />
                  Embed Video Cover
                </label>
                <label className="flex items-center gap-2 text-xs text-[#F1F1F1] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={downloadThumbnail}
                    onChange={(e) => setDownloadThumbnail(e.target.checked)}
                    className="rounded border-[#333333] bg-[#0F0F0F] accent-red-600 text-red-600 h-4 w-4"
                  />
                  Download Thumbnail separately
                </label>
              </div>
            </div>

            {/* Collapsible Smart Stream Inspector */}
            <div className="bg-[#0F0F0F] border border-[#333333] rounded-2xl p-4 mt-6">
              <button
                type="button"
                onClick={() => setShowInspector(!showInspector)}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-red-500" />
                  <span>🔍 Smart Stream Inspector (Direct Live Sources)</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500 normal-case font-normal">
                  <span>{currentVideo.formats?.length || 0} streams found</span>
                  {showInspector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showInspector && (
                <div className="mt-4 space-y-3">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    YouTube hosts video and audio as separate adaptive streams. Select any exact host stream below to force-download and merge it with professional-grade high quality.
                  </p>

                  {/* Filter tabs */}
                  <div className="flex gap-1.5 p-1 bg-[#1A1A1A] rounded-xl border border-[#333333] w-max">
                    <button
                      type="button"
                      onClick={() => setInspectorTab('all')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase cursor-pointer transition-all ${
                        inspectorTab === 'all' ? "bg-[#333333] text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      All Streams
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorTab('video')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase cursor-pointer transition-all ${
                        inspectorTab === 'video' ? "bg-[#333333] text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Video Only ({currentVideo.formats?.filter(f => f.type === 'video' || f.type === 'combined').length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorTab('audio')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase cursor-pointer transition-all ${
                        inspectorTab === 'audio' ? "bg-[#333333] text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Audio Only ({currentVideo.formats?.filter(f => f.type === 'audio').length || 0})
                    </button>
                  </div>

                  {/* Table */}
                  <div className="border border-[#222222] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-[#1A1A1A] text-zinc-500 uppercase tracking-wider text-[9px] font-bold border-b border-[#222222]">
                          <th className="p-2">ID</th>
                          <th className="p-2">Type & Res</th>
                          <th className="p-2">Codec & Ext</th>
                          <th className="p-2">Bitrate</th>
                          <th className="p-2">Est. Size</th>
                          <th className="p-2">HDR / Rate</th>
                          <th className="p-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222222] font-mono text-zinc-300">
                        {currentVideo.formats && currentVideo.formats
                          .filter(f => {
                            if (inspectorTab === 'video') return f.type === 'video' || f.type === 'combined';
                            if (inspectorTab === 'audio') return f.type === 'audio';
                            return true;
                          })
                          .sort((a, b) => {
                            if (a.type !== b.type) {
                              return a.type === 'video' ? -1 : 1;
                            }
                            return (b.height || 0) - (a.height || 0) || (b.bitrate || 0) - (a.bitrate || 0);
                          })
                          .map((f) => {
                            const isSelected = resolution === f.formatId;
                            
                            const formatSizeStr = (() => {
                              if (!f.fileSize) return "Est: N/A";
                              const mb = f.fileSize / (1024 * 1024);
                              if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
                              return `${mb.toFixed(1)} MB`;
                            })();

                            return (
                              <tr 
                                key={f.formatId} 
                                className={`hover:bg-zinc-900 transition-colors ${
                                  isSelected ? "bg-red-500/5 hover:bg-red-500/10" : ""
                                }`}
                              >
                                <td className="p-2 font-bold text-red-400">
                                  {f.formatId}
                                </td>
                                <td className="p-2">
                                  {f.type === 'audio' ? (
                                    <span className="text-amber-400 font-semibold">🎵 Audio</span>
                                  ) : (
                                    <span className="text-blue-400 font-semibold">📹 {f.resolution}</span>
                                  )}
                                </td>
                                <td className="p-2 text-zinc-400 truncate max-w-[120px]">
                                  {f.codec} ({f.ext})
                                </td>
                                <td className="p-2 text-zinc-500">
                                  {f.bitrate ? `${f.bitrate.toFixed(0)} kbps` : "N/A"}
                                </td>
                                <td className="p-2 text-emerald-400">
                                  {formatSizeStr}
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center gap-1">
                                    {f.hdr ? (
                                      <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-tight border border-amber-500/30">
                                        {f.hdr}
                                      </span>
                                    ) : null}
                                    {f.fps ? (
                                      <span className="text-zinc-500">
                                        {f.fps} FPS
                                      </span>
                                    ) : null}
                                    {f.asr ? (
                                      <span className="text-zinc-500">
                                        {Math.round(f.asr / 1000)} kHz
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="p-2 text-right">
                                  {isSelected ? (
                                    <span className="text-xs text-red-500 font-bold flex items-center justify-end gap-1 select-none">
                                      <Check className="w-3.5 h-3.5" /> Selected
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (f.type === 'audio') {
                                          setDownloadType('audio');
                                          setFormat(f.ext === 'm4a' ? 'm4a' : f.ext === 'webm' ? 'opus' : 'mp3');
                                        } else {
                                          setDownloadType(f.type === 'video' ? 'video_only' : 'video');
                                          setFormat(f.ext);
                                        }
                                        setResolution(f.formatId);
                                      }}
                                      className="px-2.5 py-1 bg-[#222] border border-zinc-800 hover:bg-red-600 hover:text-white rounded text-[10px] text-zinc-400 cursor-pointer transition-all"
                                    >
                                      Use Stream
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Visual Enhancement Badges */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mt-6 space-y-2">
              <span className="text-xs font-bold text-red-400 block">⚡ Enhanced Download Engine Engaged:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-zinc-300">
                <div className="flex items-center gap-2 bg-[#1E1E1E] border border-zinc-800 p-2.5 rounded-xl">
                  <span className="text-base">🚀</span>
                  <div>
                    <strong className="text-white block font-semibold">5x Parallel Chunks</strong>
                    <span className="text-zinc-500 text-[10px]">Multi-threaded downloads.</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#1E1E1E] border border-zinc-800 p-2.5 rounded-xl">
                  <span className="text-base">🎵</span>
                  <div>
                    <strong className="text-white block font-semibold">Ultra Hi-Fi Master Audio</strong>
                    <span className="text-zinc-500 text-[10px]">Max 320kbps audio.</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#1E1E1E] border border-zinc-800 p-2.5 rounded-xl">
                  <span className="text-base">💎</span>
                  <div>
                    <strong className="text-white block font-semibold">Pristine Video Merging</strong>
                    <span className="text-zinc-500 text-[10px]">Unmatched video clarity.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trigger Button Panel */}
            <div className="flex justify-end pt-6 border-t border-[#333333] mt-6">
              {isPlaylistMode ? (
                <button
                  onClick={handlePlaylistDownload}
                  className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-2xl flex items-center gap-2 shadow-lg cursor-pointer transition-all shadow-red-600/20"
                >
                  <Download className="w-4 h-4" />
                  Enqueue Selected Playlist Videos ({playlistVideos.filter(v => v.selected).length})
                </button>
              ) : (
                <button
                  onClick={() => handleDownloadTrigger()}
                  className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-2xl flex items-center gap-2 shadow-lg cursor-pointer transition-all shadow-red-600/20"
                >
                  <Download className="w-4 h-4" />
                  Trigger Processing & Download
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Active downloads / Download Manager queue */}
      <div id="download-manager-card" className="bg-[#1A1A1A] border border-[#333333] rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#333333] pb-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
            <Download className="w-4 h-4" /> Download Manager ({activeDownloads.length} active)
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">Location: {settings.defaultFolder}</span>
        </div>

        {activeDownloads.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 italic font-mono">
            No active downloads. Analyze and select a video above to begin downloading!
          </div>
        ) : (
          <div className="space-y-4">
            {activeDownloads.map((item) => (
              <div
                key={item.id}
                className="bg-[#0F0F0F] border border-[#333333] rounded-2xl p-4 space-y-3 shadow-inner"
              >
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
                  <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#1A1A1A] flex-shrink-0 border border-[#333333]">
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-zinc-200 truncate max-w-sm sm:max-w-md" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {item.type.toUpperCase()} • {item.resolution} • {item.format.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Operational parameters */}
                  <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-400 flex-shrink-0">
                    <div>Speed: <span className="text-red-500 font-bold">{item.speed}</span></div>
                    <div>ETA: <span className="text-red-400 font-bold">{item.eta}</span></div>
                    <div>Size: <span className="text-zinc-300">{item.downloadedSize || "0 B"} / {item.totalSize || "Calculating..."}</span></div>
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span className="capitalize font-semibold text-red-500/80">Status: {item.status}</span>
                    <span>{item.progress.toFixed(1)}%</span>
                  </div>
                  <div className="relative w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#333333]">
                    <div
                      className="absolute top-0 left-0 h-full bg-red-600 rounded-full transition-all duration-350 shadow-[0_0_8px_rgba(220,38,38,0.4)]"
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Control Actions */}
                <div className="flex items-center justify-between pt-1 text-[10px] border-t border-[#333333] text-zinc-500">
                  <span>Queue ID: {item.id}</span>
                  
                  <div className="flex items-center gap-1.5">
                    {item.status === 'completed' && (
                      <a
                        href={`/api/download/file?id=${item.id}`}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 hover:scale-105 border border-emerald-500 text-white font-bold rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-bounce"
                      >
                        <Download className="w-3 h-3 text-white" />
                        Save File to Device
                      </a>
                    )}
                    
                    {item.status === 'downloading' && (
                      <button
                        onClick={() => handleControlAction(item.id, 'pause')}
                        className="px-2.5 py-1 bg-[#1A1A1A] border border-[#333333] hover:border-zinc-500 text-zinc-300 hover:text-white rounded flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Pause className="w-3 h-3 text-red-500" />
                        Pause
                      </button>
                    )}
                    {item.status === 'paused' && (
                      <button
                        onClick={() => handleControlAction(item.id, 'resume')}
                        className="px-2.5 py-1 bg-[#1A1A1A] border border-[#333333] hover:border-zinc-500 text-zinc-300 hover:text-white rounded flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Play className="w-3 h-3 text-red-500" />
                        Resume
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleControlAction(item.id, 'cancel')}
                      className="px-2.5 py-1 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 hover:border-red-500 text-red-300 hover:text-white rounded flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
