import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { cn } from "@/lib/utils";

const schema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "video",
    "audio",
    "source",
    "iframe",
  ],
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    video: ["src", "controls", "poster", "width", "height", "style", "playsinline", "loop", "muted", "preload"],
    audio: ["src", "controls", "style", "loop", "preload"],
    source: ["src", "type"],
    iframe: [
      "src", "width", "height", "style", "title", "loading",
      "allow", "allowfullscreen", "frameborder", "referrerpolicy",
    ],
    img: [...(defaultSchema.attributes?.img ?? []), "style", "loading"],
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "style"],
  },
};

export function Markdown({ source, className }: { source: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
        "prose-headings:font-semibold prose-headings:text-foreground",
        "prose-p:text-foreground prose-li:text-foreground",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
        "prose-code:before:hidden prose-code:after:hidden prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-img:rounded-lg prose-img:border",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
        components={{
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          img: ({ node, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...props} alt={props.alt ?? ""} loading="lazy" className="max-h-[480px] object-contain" />
          ),
          iframe: ({ node, ...props }) => (
            <div className="relative w-full aspect-video my-4 rounded-lg overflow-hidden border">
              <iframe {...props} className="absolute inset-0 w-full h-full" allowFullScreen />
            </div>
          ),
          video: ({ node, ...props }) => (
            <video {...props} className="w-full rounded-lg border my-4" controls />
          ),
          audio: ({ node, ...props }) => (
            <audio {...props} className="w-full my-3" controls />
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
