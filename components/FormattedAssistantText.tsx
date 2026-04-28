"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { prepareAssistantMessageMarkdown } from "@/lib/chat/assistantMessageMarkdown";
import type { Schema } from "hast-util-sanitize";

const sanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u"],
};

const shellClass = [
  "prose prose-sm max-w-none text-[15px] leading-[1.65] text-cf-body",
  "prose-headings:font-display prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-cf-ink",
  "prose-h2:font-display prose-h2:mt-0 prose-h2:mb-2.5 prose-h2:pb-1.5 prose-h2:text-base prose-h2:font-semibold",
  "prose-h2:rounded-md prose-h2:border-b prose-h2:border-cf-border",
  "prose-h2:bg-cf-surface-muted prose-h2:px-1 prose-h2:pt-0.5",
  "prose-h3:mb-1.5 prose-h3:mt-4 first:prose-h3:mt-2 prose-h3:font-sans prose-h3:text-sm prose-h3:font-semibold prose-h3:text-cf-muted",
  "prose-p:mb-2.5 prose-p:mt-0 last:prose-p:mb-0",
  "prose-em:italic prose-em:text-cf-body",
  "[&_u]:font-medium [&_u]:text-cf-ink [&_u]:underline [&_u]:decoration-cf-muted",
  "[&_u]:underline-offset-2 [&_u]:decoration-1",
  "prose-hr:my-4 prose-hr:border-cf-border",
  "prose-ol:my-2.5 prose-ul:my-2.5 prose-ol:pl-0 prose-ul:pl-0",
  "prose-li:my-0.5 prose-li:pl-0 marker:text-cf-muted",
  "prose-blockquote:my-3 prose-blockquote:rounded-r-md prose-blockquote:border-l-cf-border",
  "prose-blockquote:bg-cf-quote prose-blockquote:pl-3 prose-blockquote:py-0.5 prose-blockquote:italic",
  "prose-blockquote:text-cf-muted prose-blockquote:border-l-2",
  "prose-code:rounded-md prose-code:border prose-code:border-cf-border",
  "prose-code:bg-cf-code prose-code:px-1 prose-code:py-0.5",
  "prose-code:text-[13px] prose-code:font-medium prose-code:text-cf-ink",
  "prose-pre:my-3 prose-pre:border prose-pre:border-cf-border prose-pre:shadow-sm",
  "prose-pre:bg-cf-code prose-pre:rounded-lg prose-pre:px-3 prose-pre:py-2.5",
].join(" ");

const components: Partial<Components> = {
  strong: ({ children }) => (
    <strong className="not-prose [box-decoration-break:clone] font-semibold text-cf-ink">
      <span className="rounded-sm bg-neutral-100 px-1 py-0.5 ring-1 ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10">
        {children}
      </span>
    </strong>
  ),
  a: ({ href, children, ...rest }) => {
    const external = href?.startsWith("http");
    return (
      <a
        href={href}
        {...rest}
        className="not-prose font-medium text-cf-accent underline decoration-cf-accent/45 underline-offset-[3px] transition-all duration-200 hover:rounded-sm hover:bg-black/[0.04] hover:decoration-cf-accent-hover hover:text-cf-accent-hover dark:hover:bg-white/[0.06] dark:hover:text-blue-300"
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
};

export function FormattedAssistantText({ text }: { text: string }) {
  const body = prepareAssistantMessageMarkdown(text);
  return (
    <div className={shellClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
