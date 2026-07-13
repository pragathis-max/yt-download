/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Download, History, Settings, MessageSquare, Sparkles } from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeDownloadsCount: number;
}

export default function Sidebar({ currentTab, setCurrentTab, activeDownloadsCount }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", name: "Dashboard", icon: Download },
    { id: "history", name: "History", icon: History },
    { id: "companion", name: "AI Companion", icon: MessageSquare, badge: "Thinking" },
    { id: "settings", name: "Settings", icon: Settings },
  ];

  return (
    <div id="sidebar-container" className="w-64 bg-[#1A1A1A] border-r border-[#333333] flex flex-col h-full text-[#F1F1F1]">
      {/* Brand Logo */}
      <div id="brand-logo" className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 4-8 4z"/>
          </svg>
        </div>
        <span className="font-bold text-lg tracking-tight text-[#F1F1F1]">YT_CORE_PRO</span>
      </div>

      {/* Navigation List */}
      <nav id="sidebar-nav" className="flex-1 p-4 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-link-${item.id}`}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-red-600/10 text-red-500"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-red-500" : "text-zinc-400"}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="flex items-center gap-1 text-[9px] font-semibold font-mono bg-red-950/40 text-red-400 border border-red-900/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
              {item.id === "dashboard" && activeDownloadsCount > 0 && (
                <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-red-600 text-white rounded-full">
                  {activeDownloadsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info / Storage Widget */}
      <div id="sidebar-footer" className="mt-auto p-6 space-y-4">
        <div className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5">Storage Used</p>
          <div className="h-1.5 bg-zinc-800 rounded-full mb-2 overflow-hidden">
            <div className="bg-red-500 h-full w-[65%]"></div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono">
            <span>14.2 GB of 20.0 GB</span>
            <span className="text-zinc-600">65%</span>
          </div>
        </div>

        <div className="text-[10px] text-zinc-600 text-center font-mono">
          yt-dlp Stable Core
        </div>
      </div>
    </div>
  );
}
