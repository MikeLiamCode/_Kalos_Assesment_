"use client";

import { useState } from "react";
import { Bot, ImageIcon, Mic, Send, Smile, Paperclip, Video, Phone, MoreHorizontal } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const starterPrompts = [
  "How many members have had 3+ scans?",
  "How is Sarah body fat today?",
  "Body fat trends for Maria",
  "What should I focus on for David next coaching session?",
];

export function MemberGPTClient() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi coach — I’m ready to help with member scan trends, lean mass changes, and coaching focus areas.",
    },
  ]);
  const [question, setQuestion] = useState("How many members have had 3+ scans?");
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!question.trim() || loading) return;

    const next = [...messages, { role: "user", content: question } as Message];
    setMessages(next);
    setLoading(true);

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_MEMBERGPT_API_URL || "http://127.0.0.1:8000";

      const res = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();

      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.answer || "No answer returned.",
        },
      ]);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "I could not reach the MemberGPT backend. Please make sure the API server is running on port 8000.",
        },
      ]);
    } finally {
      setQuestion("");
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Bot size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">MemberGPT</h2>
            <p className="text-sm text-slate-500">
              Coach-only assistant • grounded in scan data
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-4 text-slate-500 sm:flex">
          <Phone size={18} />
          <Video size={18} />
          <MoreHorizontal size={18} />
        </div>
      </div>

      <div className="grid min-h-[720px] lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Quick prompts
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Use one of these to quickly test the assistant.
          </p>

          <div className="mt-5 space-y-3">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setQuestion(prompt)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[720px] flex-col bg-white">
          <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 px-6 py-6">
            {messages.map((m, i) =>
              m.role === "assistant" ? (
                <div key={i} className="max-w-[75%]">
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Bot size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">MemberGPT</p>
                        <p className="text-xs text-slate-400">AI assistant</p>
                      </div>
                    </div>
                    <p className="text-[15px] leading-7 text-slate-700">
                      {m.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={i} className="ml-auto max-w-[75%]">
                  <div className="rounded-[1.75rem] bg-blue-500 px-5 py-4 text-white shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-medium">Coach</p>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white">
                        C
                      </div>
                    </div>
                    <p className="text-[15px] leading-7 text-white">
                      {m.content}
                    </p>
                  </div>
                </div>
              ),
            )}

            {loading ? (
              <div className="max-w-[75%]">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <Bot size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">MemberGPT</p>
                      <p className="text-xs text-slate-400">AI assistant</p>
                    </div>
                  </div>
                  <p className="text-[15px] leading-7 text-slate-500">
                    Thinking...
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-5">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <input
                  className="flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") ask();
                  }}
                  placeholder="Ask about trends, lean mass, or coaching focus..."
                />

                <div className="hidden items-center gap-3 text-slate-400 sm:flex">
                  <Paperclip size={18} />
                  <ImageIcon size={18} />
                  <Smile size={18} />
                  <Mic size={18} />
                </div>

                <button
                  onClick={ask}
                  disabled={loading}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600 disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}