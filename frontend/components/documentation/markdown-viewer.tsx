"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({ content, className = "" }: MarkdownViewerProps) {
  return (
    <div className={`prose dark:prose-invert max-w-none text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-0.5 border-b border-slate-100 dark:border-slate-800/60" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-3 mb-1.5" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-2.5 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <div className="text-slate-700 dark:text-slate-300 my-2 leading-relaxed" {...props} />
          ),
          pre: ({ node, children, ...props }: any) => (
            <div className="my-3 rounded-2xl bg-slate-950 p-4 border border-slate-800 overflow-x-auto">
              <pre className="m-0 p-0 text-xs font-mono text-slate-100 leading-relaxed bg-transparent border-0" {...props}>
                {children}
              </pre>
            </div>
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const isInline = inline || (!className && !String(children).includes("\n"));
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-md border border-slate-200 dark:border-slate-700" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="text-xs font-mono text-slate-100 leading-relaxed block" {...props}>
                {children}
              </code>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 font-semibold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="p-2.5 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-indigo-600 dark:text-indigo-400 font-medium underline underline-offset-2 hover:text-indigo-500" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-4 border-slate-200 dark:border-slate-800" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
