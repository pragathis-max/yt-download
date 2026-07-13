/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Settings, Folder, Globe, Shield, Activity, Save, RefreshCw, Check } from "lucide-react";
import { UserSettings } from "../types.js";

interface SettingsViewProps {
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
}

export default function SettingsView({ settings, setSettings }: SettingsViewProps) {
  const [localSettings, setLocalSettings] = useState<UserSettings>({ ...settings });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalSettings({ ...settings });
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localSettings),
      });

      if (!response.ok) throw new Error("Failed to save settings on server.");

      const data = await response.json();
      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="settings-view" className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Page Header */}
      <div id="settings-header" className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-red-500" />
            Downloader Settings
          </h2>
          <p className="text-sm text-zinc-400">Configure default options and system preferences for YT_CORE Pro.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Preferences */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-3xl p-6 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 flex items-center gap-2 border-b border-[#333333] pb-3">
            <Activity className="w-4 h-4" /> General Preferences
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Default Quality */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-300">Default Video Quality</label>
              <select
                value={localSettings.defaultQuality}
                onChange={(e) => setLocalSettings({ ...localSettings, defaultQuality: e.target.value })}
                className="w-full bg-[#0F0F0F] border border-[#333333] rounded-xl px-4 py-2.5 text-sm text-[#F1F1F1] focus:outline-none focus:border-red-500 transition-colors"
              >
                <option value="best">Best Quality (Max Resolution)</option>
                <option value="2160p">2160p (4K Ultra HD)</option>
                <option value="1440p">1440p (2K Quad HD)</option>
                <option value="1080p">1080p (Full HD)</option>
                <option value="720p">720p (HD)</option>
                <option value="480p">480p (Standard Definition)</option>
                <option value="360p">360p (Low Definition)</option>
              </select>
              <p className="text-[11px] text-zinc-500">Automatically select this quality if available in the source video.</p>
            </div>

            {/* Max Concurrent Downloads */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-300">Max Simultaneous Downloads</label>
              <select
                value={localSettings.maxSimultaneousDownloads}
                onChange={(e) => setLocalSettings({ ...localSettings, maxSimultaneousDownloads: parseInt(e.target.value) })}
                className="w-full bg-[#0F0F0F] border border-[#333333] rounded-xl px-4 py-2.5 text-sm text-[#F1F1F1] focus:outline-none focus:border-red-500 transition-colors"
              >
                <option value={1}>1 Video at a time</option>
                <option value={2}>2 Videos at a time</option>
                <option value={3}>3 Videos at a time (Recommended)</option>
                <option value={4}>4 Videos at a time</option>
                <option value={5}>5 Videos at a time</option>
              </select>
              <p className="text-[11px] text-zinc-500">Limits concurrent download tasks to prevent rate limiting or throttling.</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-2">
            {/* Fallback option */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={localSettings.fallbackNearest}
                onChange={(e) => setLocalSettings({ ...localSettings, fallbackNearest: e.target.checked })}
                className="mt-1 rounded border-[#333333] text-red-600 focus:ring-red-500 bg-[#0F0F0F] accent-red-600 h-4 w-4"
              />
              <div>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                  Smart Quality Fallback (Nearest Available)
                </span>
                <p className="text-[11px] text-zinc-500">
                  If the selected resolution is unavailable, download the next nearest available resolution without failing.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Directory & Paths */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 flex items-center gap-2 border-b border-[#333333] pb-3">
            <Folder className="w-4 h-4" /> Download Directory
          </h3>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-300">Server Target Folder</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={localSettings.defaultFolder}
                onChange={(e) => setLocalSettings({ ...localSettings, defaultFolder: e.target.value })}
                className="flex-1 bg-[#0F0F0F] border border-[#333333] rounded-xl px-4 py-2.5 text-sm text-[#F1F1F1] focus:outline-none focus:border-red-500 transition-colors font-mono"
              />
            </div>
            <p className="text-[11px] text-zinc-500">
              Files are processed here on the server before transferring to your browser's local download path.
            </p>
          </div>
        </div>

        {/* Network & Proxy */}
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 flex items-center gap-2 border-b border-[#333333] pb-3">
            <Shield className="w-4 h-4" /> Network & Security
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-300">HTTP/Socks Proxy URL</label>
              <input
                type="text"
                placeholder="e.g. socks5://127.0.0.1:1080"
                value={localSettings.proxy}
                onChange={(e) => setLocalSettings({ ...localSettings, proxy: e.target.value })}
                className="w-full bg-[#0F0F0F] border border-[#333333] rounded-xl px-4 py-2.5 text-sm text-[#F1F1F1] focus:outline-none focus:border-red-500 transition-colors font-mono"
              />
              <p className="text-[11px] text-zinc-500">
                Route traffic through a custom proxy server to avoid YouTube IP bans or geo-restrictions.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-300">System Language</label>
              <select
                value={localSettings.language}
                onChange={(e) => setLocalSettings({ ...localSettings, language: e.target.value })}
                className="w-full bg-[#0F0F0F] border border-[#333333] rounded-xl px-4 py-2.5 text-sm text-[#F1F1F1] focus:outline-none focus:border-red-500 transition-colors"
              >
                <option value="en">English (US)</option>
                <option value="es">Español (ES)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="zh">Chinese (中文)</option>
              </select>
              <p className="text-[11px] text-zinc-500">Interface localization (English, Spanish, Tamil, Chinese supported).</p>
            </div>

            <div className="space-y-3 col-span-1 md:col-span-2 pt-4 border-t border-[#333333]">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-300">YouTube Cookies Authentication</label>
                <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-semibold border border-red-500/20">Bypass Bot Detection</span>
              </div>
              
              <textarea
                placeholder="Paste Netscape text, JSON cookie list, or a raw 'Cookie: ...' HTTP request header here..."
                value={localSettings.cookies || ""}
                onChange={(e) => setLocalSettings({ ...localSettings, cookies: e.target.value })}
                className="w-full h-36 bg-[#0F0F0F] border border-[#333333] rounded-xl px-4 py-3 text-xs text-[#F1F1F1] focus:outline-none focus:border-red-500 transition-colors font-mono placeholder:text-zinc-600 resize-y"
              />
              
              <div className="bg-zinc-950/40 rounded-xl p-3.5 border border-zinc-800/60 space-y-3">
                <h4 className="text-xs font-semibold text-zinc-300">Supported Formats (Auto-detected & Converted):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-zinc-400">
                  <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/40">
                    <span className="font-semibold text-zinc-200 block mb-1">📋 1. Copy Cookie Header</span>
                    <p className="text-[10px] leading-relaxed">
                      Go to <span className="text-zinc-300">youtube.com</span>, open Developer Tools (F12) &rarr; Network. Click on any network request, find <span className="font-mono text-red-400">Cookie:</span> under Request Headers, copy the entire value, and paste it here!
                    </p>
                  </div>
                  <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/40">
                    <span className="font-semibold text-zinc-200 block mb-1">🍪 2. Netscape Format</span>
                    <p className="text-[10px] leading-relaxed">
                      Use a browser extension like <span className="text-zinc-300">"Get cookies.txt LOCALLY"</span>. Open the extension on YouTube, export the text, and paste it here directly.
                    </p>
                  </div>
                  <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/40">
                    <span className="font-semibold text-zinc-200 block mb-1">⚙️ 3. JSON Export</span>
                    <p className="text-[10px] leading-relaxed">
                      Use <span className="text-zinc-300">"EditThisCookie"</span> or similar extensions, click "Export as JSON", copy the resulting bracketed array, and paste it here.
                    </p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-200 space-y-1 mt-2">
                  <span className="font-bold block">⚠️ Avoid Cookie Rotation & Expiration:</span>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-300 leading-relaxed">
                    <li><strong className="text-amber-200">Never Log Out:</strong> Do NOT click "Sign Out" or "Log Out" on YouTube after copying. Logging out immediately invalidates and deletes the session on YouTube's servers. You can safely close the browser tab or window, but stay logged in!</li>
                    <li><strong className="text-amber-200">Avoid Multi-Device Clears:</strong> If you clear your browser's history/cookies or log out of YouTube from another device, your session may be rotated and invalidated.</li>
                    <li><strong className="text-amber-200">When it expires:</strong> Cookies naturally expire over time or when YouTube forces a security refresh. When you see "cookies are no longer valid", simply open YouTube in your browser, perform the copy steps above, paste the brand-new cookies here, and click Save.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action button panel */}
        <div id="settings-save-panel" className="flex items-center justify-between border-t border-slate-900 pt-6">
          <div className="flex flex-col gap-1">
            {saved && (
              <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium animate-bounce bg-emerald-900/30 border border-emerald-800 px-3 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" /> Settings saved successfully!
              </span>
            )}
            {error && (
              <span className="text-rose-400 text-xs font-medium bg-rose-900/30 border border-rose-800 px-3 py-1 rounded-full">
                Error: {error}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-rose-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
