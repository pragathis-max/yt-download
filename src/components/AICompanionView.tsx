/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, RefreshCw, AlertCircle, Play, Info } from "lucide-react";
import { ChatMessage, VideoMetadata } from "../types.js";

interface AICompanionViewProps {
  currentVideo: VideoMetadata | null;
}

export default function AICompanionView({ currentVideo }: AICompanionViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am your YTDL Pro AI Video Companion. I use Google's advanced Gemini Pro model to analyze YouTube videos.\n\nOnce you've analyzed or downloaded a video, I'll automatically load its context. Then you can ask me to summarize it, explain key terms, extract action items, or answer questions about the content!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const presetPrompts = [
    { label: "Summarize this video", text: "Please provide a comprehensive summary of this video, highlighting the main takeaways and key learnings." },
    { label: "Create key bullet points", text: "Can you break down this video into bullet points of key topics and concepts?" },
    { label: "Analyze description & metadata", text: "Analyze this video's metadata, channel, and description. What does this tell us about its purpose and audience?" },
    { label: "Suggest action items", text: "Based on the details, what are 3 actionable learning steps or tasks a viewer should take next?" },
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: currentVideo?.url || "",
          title: currentVideo?.title || "",
          description: currentVideo?.description || "",
          message: textToSend,
          chatHistory: messages.slice(-10), // send last 10 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response. Please ensure GEMINI_API_KEY is configured.");
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        sender: "assistant",
        text: data.text || "I was unable to generate a response.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || "An error occurred during communication.");
    } finally {
      setLoading(false);
    }
  };

  const formatText = (text: string) => {
    return text.split("\n").map((line, i) => {
      // Bold syntax **text**
      let formattedLine = line;
      const boldRegex = /\*\*([^*]+)\*\*/g;
      
      // Basic formatting helpers
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="text-white font-bold">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      const renderedLine = parts.length > 0 ? parts : line;

      // Handle bullet points
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <li key={i} className="ml-5 list-disc text-slate-300 py-0.5">
            {line.trim().substring(2)}
          </li>
        );
      }

      // Handle number lists
      const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <li key={i} className="ml-5 list-decimal text-slate-300 py-0.5">
            {numMatch[2]}
          </li>
        );
      }

      return (
        <p key={i} className="text-slate-300 min-h-[1rem]">
          {renderedLine}
        </p>
      );
    });
  };

  return (
    <div id="ai-companion-view" className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto py-2">
      {/* Active Context Header */}
      <div id="ai-context-banner" className="bg-[#1A1A1A] border border-[#333333] rounded-3xl p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
        {currentVideo ? (
          <div className="flex items-center gap-3 w-full min-w-0">
            <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-[#0F0F0F] flex-shrink-0 border border-[#333333]">
              <img src={currentVideo.thumbnail} alt={currentVideo.title} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-mono tracking-wider text-red-500 font-bold bg-red-600/10 px-2.5 py-1 rounded-full border border-red-900/30">
                Active Analysis Context
              </span>
              <h3 className="font-semibold text-zinc-200 text-sm truncate mt-1.5">{currentVideo.title}</h3>
              <p className="text-xs text-zinc-500 truncate">by {currentVideo.channel}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-zinc-400 text-sm">
            <Info className="w-5 h-5 text-red-500" />
            <span>No video analyzed yet. You can still chat with me, but pasting a link on the Dashboard will automatically sync detailed metadata context!</span>
          </div>
        )}
      </div>

      {/* Messages Flow Area */}
      <div id="messages-flow-container" className="flex-1 overflow-y-auto my-4 p-4 bg-[#1A1A1A] border border-[#333333] rounded-3xl space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed space-y-1.5 shadow ${
                msg.sender === "user"
                  ? "bg-red-600 text-white rounded-tr-none shadow-lg shadow-red-600/20"
                  : "bg-[#0F0F0F] border border-[#333333] text-zinc-300 rounded-tl-none"
              }`}
            >
              <div className="flex items-center justify-between gap-4 text-[10px] text-zinc-500 mb-1">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                  {msg.sender === "user" ? "You" : (
                    <>
                      <Sparkles className="w-3 h-3 text-red-500 animate-pulse" />
                      Gemini 2.5 Flash Assistant
                    </>
                  )}
                </span>
                <span>{msg.timestamp}</span>
              </div>
              <div className="space-y-1.5 whitespace-pre-wrap select-text">
                {msg.sender === "user" ? msg.text : formatText(msg.text)}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#0F0F0F] border border-[#333333] rounded-2xl rounded-tl-none p-4 max-w-[85%] space-y-3 shadow shadow-red-950/10">
              <div className="flex items-center gap-2.5 text-xs text-red-500 font-semibold uppercase tracking-wider">
                <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                <span>Deep Thinking Mode Active</span>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[#1A1A1A] rounded-full w-4/5 animate-pulse"></div>
                <div className="h-3 bg-[#1A1A1A] rounded-full w-11/12 animate-pulse"></div>
                <div className="h-3 bg-[#1A1A1A] rounded-full w-2/3 animate-pulse"></div>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono italic">
                Gemini 2.5 Flash (ThinkingLevel.HIGH) is reasoning about your video details...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center p-2">
            <div className="bg-red-950/20 border border-red-900/40 rounded-xl px-4 py-3 text-xs text-red-300 flex items-center gap-2 max-w-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Preset Suggestions & Input panel */}
      <div id="ai-input-controls" className="space-y-3">
        {currentVideo && messages.length <= 2 && !loading && (
          <div className="flex flex-wrap gap-2 justify-center">
            {presetPrompts.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.text)}
                className="text-xs bg-[#2A2A2A] hover:bg-zinc-700 border border-[#333333] text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-full cursor-pointer transition-all duration-150"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder={
              currentVideo
                ? "Ask anything about this video (e.g. summarized learning points, key topics...)"
                : "Ask general questions or paste a YouTube URL on the Dashboard first..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
            disabled={loading}
            className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded-xl px-4 py-3 text-sm text-[#F1F1F1] focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={loading || !input.trim()}
            className="px-5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-lg shadow-red-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
