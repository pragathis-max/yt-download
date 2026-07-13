/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar.js";
import DashboardView from "./components/DashboardView.js";
import HistoryView from "./components/HistoryView.js";
import SettingsView from "./components/SettingsView.js";
import AICompanionView from "./components/AICompanionView.js";
import { UserSettings, VideoMetadata, DownloadItem, SystemStatus } from "./types.js";
import { Info, Globe, HardDrive, Cpu, AlertCircle, RefreshCw } from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [currentVideo, setCurrentVideo] = useState<VideoMetadata | null>(null);
  const [activeDownloads, setActiveDownloads] = useState<DownloadItem[]>([]);
  const completedIdsRef = useRef<Set<string>>(new Set());
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [backendOffline, setBackendOffline] = useState<boolean>(false);
  const [settings, setSettings] = useState<UserSettings>({
    theme: "dark",
    defaultQuality: "1080p",
    defaultFolder: "/data/downloads",
    proxy: "",
    language: "en",
    autoUpdate: false,
    maxSimultaneousDownloads: 3,
    fallbackNearest: true,
  });

  // Load Settings and System Status on startup
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setSettings(data))
      .catch((err) => {
        console.error("Failed to load settings (backend likely offline):", err);
        setBackendOffline(true);
      });

    fetch("/api/system-status")
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            setBackendOffline(true);
          }
          throw new Error("System status endpoint returned " + res.status);
        }
        return res.json();
      })
      .then((data) => {
        setSystemStatus(data);
        setBackendOffline(false);
      })
      .catch((err) => {
        console.warn("Could not retrieve system status (backend likely static/offline):", err);
        setBackendOffline(true);
      });
  }, []);

  // SSE Real-time Active Downloads stream listener
  useEffect(() => {
    const eventSource = new EventSource("/api/download/progress");
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as DownloadItem[];
        setActiveDownloads(data);

        // Auto-download completed files to the user's browser device!
        data.forEach((item) => {
          if (item.status === 'completed' && !completedIdsRef.current.has(item.id)) {
            completedIdsRef.current.add(item.id);
            
            // Trigger browser-level file save
            const link = document.createElement("a");
            link.href = `/api/download/file?id=${item.id}`;
            // Let the browser handle standard file download behavior
            link.click();
          }
        });
      } catch (e) {
        console.error("Failed to parse active downloads progress:", e);
      }
    };

    eventSource.onerror = (e) => {
      console.warn("SSE connection interrupted. Reconnecting...", e);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Global YouTube URL Drop handler (for auto pasting on drop)
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const text = e.dataTransfer?.getData("text");
      if (text && (text.includes("youtube.com") || text.includes("youtu.be"))) {
        // Find if there's any active drop area or dispatch an custom event
        const inputElement = document.querySelector("input[type='text']") as HTMLInputElement;
        if (inputElement) {
          inputElement.value = text;
          // Trigger a change so React picks it up
          const event = new Event("input", { bubbles: true });
          inputElement.dispatchEvent(event);
          // Focus input
          inputElement.focus();
        }
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  return (
    <div id="ytdl-app-root" className="flex h-screen bg-[#0F0F0F] text-[#F1F1F1] overflow-hidden font-sans select-none">
      
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeDownloadsCount={activeDownloads.length}
      />

      {/* Main Container Content */}
      <div id="ytdl-main-panel" className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#0F0F0F]">
        
        {/* Header Ribbon */}
        <header id="ytdl-header" className="bg-[#0F0F0F] border-b border-[#333333] px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-xs font-mono text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              YT_CORE Service Active
            </span>
          </div>

          {/* Core System stats in top right */}
          <div className="flex items-center gap-6 text-[11px] font-mono text-zinc-500">
            <div className="flex items-center gap-1.5" title="Server location storage">
              <HardDrive className="w-3.5 h-3.5 text-zinc-600" />
              <span>Storage: <b>Active</b></span>
            </div>
            <div className="flex items-center gap-1.5" title="Multi-threaded processing worker status">
              <Cpu className="w-3.5 h-3.5 text-zinc-600" />
              <span>Concurrency: <b>Enabled</b></span>
            </div>
          </div>
        </header>

        {/* Dynamic View Panel */}
        <main id="ytdl-main-content" className="flex-1 p-6 md:p-8 space-y-6">
          {currentTab === "dashboard" && (
            <DashboardView
              settings={settings}
              activeDownloads={activeDownloads}
              currentVideo={currentVideo}
              setCurrentVideo={setCurrentVideo}
              setCurrentTab={setCurrentTab}
              systemStatus={systemStatus}
              backendOffline={backendOffline}
            />
          )}

          {currentTab === "history" && (
            <HistoryView
              onReTriggerDownload={(url) => {
                setCurrentVideo(null);
                setCurrentTab("dashboard");
                // Wait for render, then auto fill URL
                setTimeout(() => {
                  const inputElement = document.querySelector("input[type='text']") as HTMLInputElement;
                  if (inputElement) {
                    inputElement.value = url;
                    const event = new Event("input", { bubbles: true });
                    inputElement.dispatchEvent(event);
                    // trigger click
                    const buttonElement = document.querySelector("button[type='submit']") as HTMLButtonElement;
                    if (buttonElement) buttonElement.click();
                  }
                }, 100);
              }}
            />
          )}

          {currentTab === "companion" && (
            <AICompanionView currentVideo={currentVideo} />
          )}

          {currentTab === "settings" && (
            <SettingsView settings={settings} setSettings={setSettings} />
          )}
        </main>
      </div>

    </div>
  );
}
