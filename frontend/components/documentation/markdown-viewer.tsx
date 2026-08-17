"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getHeadingText(children: any): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(getHeadingText).join("");
  if (children?.props?.children) return getHeadingText(children.props.children);
  return "";
}

export function scrollToHeading(id: string) {
  if (!id) return;
  const cleanId = id.trim().toLowerCase().replace(/^#/, "");

  let targetEl = document.getElementById(cleanId);
  if (!targetEl) {
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    for (const h of Array.from(headings)) {
      if (h.id === cleanId || slugify(h.textContent || "") === cleanId) {
        targetEl = h as HTMLElement;
        break;
      }
    }
  }

  if (!targetEl) return;

  // Find nearest scrollable parent container (e.g. modal body or page scroll wrapper)
  let scrollParent: HTMLElement | null = targetEl.parentElement;
  while (scrollParent && scrollParent !== document.body) {
    const style = window.getComputedStyle(scrollParent);
    if (
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      scrollParent.scrollHeight > scrollParent.clientHeight
    ) {
      break;
    }
    scrollParent = scrollParent.parentElement;
  }

  if (scrollParent && scrollParent !== document.body) {
    const parentRect = scrollParent.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const relativeTop = targetRect.top - parentRect.top + scrollParent.scrollTop - 24;
    scrollParent.scrollTo({ top: Math.max(0, relativeTop), behavior: "smooth" });
  } else {
    targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function MarkdownViewer({ content, className = "" }: MarkdownViewerProps) {
  // Track slug IDs during rendering to match duplicate headings accurately
  const renderedIdCounts: Record<string, number> = {};

  const getUniqueId = (text: string) => {
    const baseId = slugify(text) || "section";
    if (renderedIdCounts[baseId]) {
      const uniqueId = `${baseId}-${renderedIdCounts[baseId]}`;
      renderedIdCounts[baseId] += 1;
      return uniqueId;
    } else {
      renderedIdCounts[baseId] = 1;
      return baseId;
    }
  };

  return (
    <div className={`w-full prose dark:prose-invert max-w-none text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, children, ...props }) => {
            const text = getHeadingText(children);
            const id = getUniqueId(text);
            return (
              <h1
                id={id}
                className="scroll-mt-8 text-xl font-bold text-slate-900 dark:text-white mt-6 mb-3 pb-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 group"
                {...props}
              >
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToHeading(id);
                  }}
                  className="hover:underline text-slate-900 dark:text-white"
                >
                  {children}
                </a>
              </h1>
            );
          },
          h2: ({ node, children, ...props }) => {
            const text = getHeadingText(children);
            const id = getUniqueId(text);
            return (
              <h2
                id={id}
                className="scroll-mt-8 text-lg font-bold text-slate-900 dark:text-white mt-5 mb-2.5 pb-1 border-b border-slate-100 dark:border-slate-800/60 group"
                {...props}
              >
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToHeading(id);
                  }}
                  className="hover:underline text-slate-900 dark:text-white"
                >
                  {children}
                </a>
              </h2>
            );
          },
          h3: ({ node, children, ...props }) => {
            const text = getHeadingText(children);
            const id = getUniqueId(text);
            return (
              <h3
                id={id}
                className="scroll-mt-8 text-base font-semibold text-slate-900 dark:text-white mt-4 mb-2 group"
                {...props}
              >
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToHeading(id);
                  }}
                  className="hover:underline text-slate-900 dark:text-white"
                >
                  {children}
                </a>
              </h3>
            );
          },
          h4: ({ node, children, ...props }) => {
            const text = getHeadingText(children);
            const id = getUniqueId(text);
            return (
              <h4
                id={id}
                className="scroll-mt-8 text-sm font-semibold text-slate-900 dark:text-white mt-3 mb-1.5 group"
                {...props}
              >
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToHeading(id);
                  }}
                  className="hover:underline text-slate-900 dark:text-white"
                >
                  {children}
                </a>
              </h4>
            );
          },
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
          a: ({ node, href, children, ...props }: any) => {
            if (!href) return <span>{children}</span>;

            const cleanHref = href.trim();
            // Block dangerous protocol execution
            if (
              cleanHref.toLowerCase().startsWith("javascript:") ||
              cleanHref.toLowerCase().startsWith("data:") ||
              cleanHref.toLowerCase().startsWith("vbscript:")
            ) {
              return <span className="text-slate-600 dark:text-slate-400">{children}</span>;
            }

            if (cleanHref.startsWith("#")) {
              const targetId = cleanHref.substring(1);
              return (
                <a
                  href={cleanHref}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToHeading(targetId);
                  }}
                  className="text-indigo-600 dark:text-indigo-400 font-medium underline underline-offset-2 hover:text-indigo-500 cursor-pointer"
                  {...props}
                >
                  {children}
                </a>
              );
            }
            return (
              <a
                href={cleanHref}
                className="text-indigo-600 dark:text-indigo-400 font-medium underline underline-offset-2 hover:text-indigo-500"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
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
