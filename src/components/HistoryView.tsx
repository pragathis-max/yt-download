/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { History, Trash2, CheckCircle, AlertTriangle, ExternalLink, DownloadCloud, RefreshCw } from "lucide-react";
import { HistoryRecord } from "../types.js";

interface HistoryViewProps {
  onReTriggerDownload?: (url: string) => void;
}

export default function HistoryView({ onReTriggerDownload }: HistoryViewProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history");
      if (!res.ok) throw new Error("Failed to load history.");
      const data = await res.json();
      setHistory(data);
    } catch (e: any) {
      setError(e.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Are you sure you want to clear your entire download history?")) return;
    try {
      const res = await fetch("/api/history", { method: "DELETE" });
      if (res.ok) {
        setHistory([]);
      }
    } catch (e) {
      alert("Failed to clear history.");
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div id="history-view" className="space-y-6 max-w-5xl mx-auto py-4">
      {/* Header */}
      <div id="history-header" className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-6 h-6 text-red-500" />
            Download History
          </h2>
          <p className="text-sm text-zinc-400">View and download files processed by the YT_CORE Pro server.</p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-2 px-4 py-2 bg-red-950/20 hover:bg-red-900/40 border border-red-900/50 hover:border-red-500/80 text-red-200 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All History
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-sm text-zinc-500 font-mono">Retrieving SQLite download history...</p>
        </div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-900 p-6 rounded-2xl flex items-center gap-3 text-red-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>Error loading history: {error}</span>
        </div>
      ) : history.length === 0 ? (
        <div className="border border-dashed border-[#333333] rounded-2xl py-20 flex flex-col items-center justify-center gap-4 text-center bg-[#1A1A1A]">
          <div className="w-16 h-16 rounded-full bg-[#0F0F0F] flex items-center justify-center border border-[#333333]">
            <History className="w-8 h-8 text-zinc-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-300">No Downloads Found</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Your SQLite database is currently empty. Start downloading videos from the main dashboard!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {history.map((record) => (
            <div
              key={record.id}
              className="bg-[#1A1A1A] border border-[#333333] hover:border-zinc-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 transition-all duration-200"
            >
              {/* Thumbnail */}
              <div className="relative w-full sm:w-32 aspect-video rounded-xl overflow-hidden bg-[#0F0F0F] flex-shrink-0 border border-[#333333]">
                <img
                  src={record.thumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300"}
                  alt={record.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Text metadata */}
              <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
                <h4 className="font-semibold text-zinc-200 text-sm truncate" title={record.title}>
                  {record.title}
                </h4>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-mono text-zinc-500">
                  <span className="bg-[#0F0F0F] px-2 py-0.5 rounded border border-[#333333] text-[10px]">
                    {record.quality}
                  </span>
                  <span className="bg-[#0F0F0F] px-2 py-0.5 rounded border border-[#333333] text-[10px] uppercase">
                    {record.format}
                  </span>
                  <span>•</span>
                  <span>{record.size}</span>
                  <span>•</span>
                  <span>{record.date}</span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {record.status === "completed" ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    Success
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-950/20 border border-red-900/40 px-2.5 py-1 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    Failed
                  </span>
                )}
              </div>

              {/* Actions panel */}
              <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-center">
                {record.status === "completed" ? (
                  <a
                    href={`/api/download/file?id=${record.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-xl cursor-pointer shadow shadow-red-950/20 transition-all"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    Save File
                  </a>
                ) : (
                  onReTriggerDownload && (
                    <button
                      onClick={() => onReTriggerDownload(record.url)}
                      className="px-4 py-2 bg-[#2A2A2A] border border-[#333333] text-xs font-semibold text-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-700 transition-all"
                    >
                      Retry Download
                    </button>
                  )
                )}

                <a
                  href={record.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-[#0F0F0F] border border-[#333333] text-zinc-400 hover:text-white rounded-xl hover:border-zinc-500 transition-all"
                  title="Open YouTube Video"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
