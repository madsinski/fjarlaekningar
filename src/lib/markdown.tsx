import React from "react";

// Minimal, dependency-free markdown renderer for legal documents.
// Supports: # ## ### headings, paragraphs, - / * bullet lists, 1. ordered
// lists, --- horizontal rules, **bold**, *italic*, and [text](url) links.
// Content is authored by trusted staff, but we still never use dangerouslySet
// HTML — everything is rendered as React elements, so injection isn't possible.

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Tokenize on **bold**, *italic*, and [text](url) in one pass.
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{m[2]}</strong>);
    } else if (m[3]) {
      nodes.push(<em key={`${keyPrefix}-i${i}`}>{m[4]}</em>);
    } else if (m[5]) {
      const href = m[7];
      const safe = /^(https?:|mailto:|\/)/i.test(href) ? href : "#";
      nodes.push(
        <a key={`${keyPrefix}-a${i}`} href={safe} className="text-cyan-700 underline hover:text-cyan-900" target={safe.startsWith("http") ? "_blank" : undefined} rel={safe.startsWith("http") ? "noopener noreferrer" : undefined}>
          {m[6]}
        </a>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function renderMarkdown(md: string): React.ReactNode {
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushPara = () => {
    if (para.length) {
      const text = para.join(" ");
      blocks.push(
        <p key={`p${key++}`} className="mb-4 leading-relaxed text-slate-700">
          {renderInline(text, `p${key}`)}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, idx) => (
        <li key={`li${key}-${idx}`} className="mb-1 leading-relaxed text-slate-700">
          {renderInline(it, `li${key}-${idx}`)}
        </li>
      ));
      blocks.push(
        list.ordered ? (
          <ol key={`ol${key++}`} className="mb-4 ml-6 list-decimal space-y-1">{items}</ol>
        ) : (
          <ul key={`ul${key++}`} className="mb-4 ml-6 list-disc space-y-1">{items}</ul>
        ),
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushPara();
      flushList();
      blocks.push(<hr key={`hr${key++}`} className="my-6 border-slate-200" />);
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara();
      flushList();
      const level = h[1].length;
      const cls =
        level === 1
          ? "text-2xl font-bold text-slate-900 mt-8 mb-3"
          : level === 2
            ? "text-xl font-semibold text-slate-900 mt-6 mb-2"
            : "text-base font-semibold text-slate-900 mt-4 mb-2";
      const content = renderInline(h[2], `h${key}`);
      blocks.push(
        level === 1 ? (
          <h1 key={`h${key++}`} className={cls}>{content}</h1>
        ) : level === 2 ? (
          <h2 key={`h${key++}`} className={cls}>{content}</h2>
        ) : (
          <h3 key={`h${key++}`} className={cls}>{content}</h3>
        ),
      );
      continue;
    }
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ol) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[1]);
      continue;
    }
    if (ul) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1]);
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return <>{blocks}</>;
}
