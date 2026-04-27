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
  "prose prose-sm max-w-none text-[15px] leading-[1.6] text-neutral-900",
  "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-neutral-900",
  "prose-h2:mt-0 prose-h2:mb-2.5 prose-h2:pb-1.5 prose-h2:text-[15px]",
  "prose-h2:rounded-t-md prose-h2:border-b prose-h2:border-neutral-200/90",
  "prose-h2:bg-neutral-50/50 prose-h2:px-1 prose-h2:pt-0.5",
  "prose-h2:shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.7)]",
  "prose-h3:mb-1.5 prose-h3:mt-4 first:prose-h3:mt-2 prose-h3:text-sm",
  "prose-p:mb-2.5 prose-p:mt-0 last:prose-p:mb-0",
  "prose-em:italic",
  "[&_u]:font-medium [&_u]:text-neutral-800 [&_u]:underline [&_u]:decoration-neutral-400/90",
  "[&_u]:underline-offset-2 [&_u]:decoration-1",
  "prose-hr:my-4 prose-hr:border-neutral-200/90",
  "prose-ol:my-2.5 prose-ul:my-2.5 prose-ol:pl-0 prose-ul:pl-0",
  "prose-li:my-0.5 prose-li:pl-0 marker:text-neutral-500",
  "prose-blockquote:my-3 prose-blockquote:rounded-r-md prose-blockquote:border-l-neutral-300/90",
  "prose-blockquote:bg-neutral-50/30 prose-blockquote:pl-3 prose-blockquote:py-0.5 prose-blockquote:italic",
  "prose-blockquote:text-neutral-700 prose-blockquote:shadow-[inset_2px_0_0_0_rgba(0,0,0,0.03)]",
  "prose-code:rounded-md prose-code:border prose-code:border-neutral-200/80",
  "prose-code:bg-neutral-100/90 prose-code:px-1 prose-code:py-0.5",
  "prose-code:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)]",
  "prose-code:text-[13px] prose-code:font-medium prose-code:text-neutral-800",
  "prose-pre:my-3 prose-pre:border prose-pre:border-neutral-200/60 prose-pre:shadow-sm",
  "prose-pre:bg-neutral-100 prose-pre:rounded-lg prose-pre:px-3 prose-pre:py-2.5",
].join(" ");

const components: Partial<Components> = {
  strong: ({ children }) => (
    <strong className="not-prose [box-decoration-break:clone] font-semibold text-neutral-950">
      <span className="rounded-sm bg-amber-50/45 px-1 py-0.5 ring-1 ring-amber-900/[0.07] shadow-[0_1px_1.5px_rgba(0,0,0,0.05)]">
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
        className="not-prose font-medium text-neutral-800 underline decoration-neutral-300/80 underline-offset-[3px] transition-all duration-200 hover:rounded-sm hover:bg-neutral-100/90 hover:decoration-neutral-500/80 hover:text-neutral-950 hover:shadow-sm"
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
