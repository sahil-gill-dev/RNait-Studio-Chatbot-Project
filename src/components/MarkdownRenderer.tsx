import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content into code blocks and plain text blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-slate-800 dark:text-slate-200">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          // This is a code block
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const language = match ? match[1] : "code";
          const code = match ? match[2].trim() : part.slice(3, -3).trim();

          return (
            <CodeBlock key={index} code={code} language={language} />
          );
        } else {
          // Plain text block with inline styles
          return <p key={index} className="whitespace-pre-line text-sm md:text-base">{parseInlineStyles(part)}</p>;
        }
      })}
    </div>
  );
}

// Sub-component for beautiful terminal-style code blocks with copy action
function CodeBlock({ code, language }: { code: string; language: string; key?: React.Key }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-lg font-mono text-xs md:text-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-slate-950 px-4 py-2.5 text-slate-400 select-none border-b border-slate-800">
        <div className="flex items-center space-x-2">
          {/* Mock Window buttons */}
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          <span className="ml-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{language || "code"}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 rounded-md px-2 py-1 text-xs hover:bg-slate-800 hover:text-slate-200 transition-all duration-200"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code contents */}
      <div className="p-4 overflow-x-auto max-h-[450px] text-slate-100 selection:bg-indigo-500/30">
        <pre><code>{code}</code></pre>
      </div>
    </div>
  );
}

// Simple parser for inline markdown formats (headers, lists, bold, links, inline code)
function parseInlineStyles(text: string): React.ReactNode[] {
  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    const key = `line-${lineIdx}`;

    // 1. Headers: #, ##, ###
    if (line.startsWith("# ")) {
      return (
        <h1 key={key} className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mt-4 mb-2 first:mt-1 font-sans">
          {processInlineFormatting(line.slice(2))}
        </h1>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2 key={key} className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white mt-3 mb-2 first:mt-1 font-sans">
          {processInlineFormatting(line.slice(3))}
        </h2>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <h3 key={key} className="text-base md:text-lg font-medium text-slate-800 dark:text-slate-100 mt-2 mb-1 first:mt-1 font-sans">
          {processInlineFormatting(line.slice(4))}
        </h3>
      );
    }

    // 2. Unordered lists: - or *
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <div key={key} className="flex items-start space-x-2 pl-4 py-0.5">
          <span className="text-indigo-500 mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
          <span className="text-sm md:text-base text-slate-700 dark:text-slate-300">
            {processInlineFormatting(line.slice(2))}
          </span>
        </div>
      );
    }

    // 3. Ordered lists: 1. etc
    const olMatch = line.match(/^(\d+)\.\s(.*)/);
    if (olMatch) {
      const num = olMatch[1];
      const rest = olMatch[2];
      return (
        <div key={key} className="flex items-start space-x-2 pl-4 py-0.5">
          <span className="text-xs font-bold text-indigo-500 mt-1 flex-shrink-0 w-4 text-right">
            {num}.
          </span>
          <span className="text-sm md:text-base text-slate-700 dark:text-slate-300">
            {processInlineFormatting(rest)}
          </span>
        </div>
      );
    }

    // 4. Blockquotes: >
    if (line.startsWith("> ")) {
      return (
        <blockquote key={key} className="border-l-4 border-indigo-400 pl-4 py-1 my-2 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-r-md italic text-slate-600 dark:text-slate-400">
          {processInlineFormatting(line.slice(2))}
        </blockquote>
      );
    }

    // 5. Default paragraph line
    return (
      <span key={key} className="block min-h-[0.5rem]">
        {processInlineFormatting(line)}
      </span>
    );
  });
}

// Parse bold (**text**), inline code (`code`), and links [text](url)
function processInlineFormatting(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match: **bold**, `inline code`, [link text](url)
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    const key = `inline-${idx}`;

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key} className="font-semibold text-slate-950 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={key} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-rose-500 dark:text-rose-400 font-mono text-xs md:text-sm border border-slate-200 dark:border-slate-750">
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const url = linkMatch[2];
      return (
        <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 underline font-medium">
          {label}
        </a>
      );
    }

    return <span key={key}>{part}</span>;
  });
}
