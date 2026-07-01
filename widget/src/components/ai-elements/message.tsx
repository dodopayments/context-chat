// Vendored from Vercel AI Elements (registry: message). Trimmed to Message +
// MessageContent (no branch/toolbar machinery, no Streamdown-based MessageResponse —
// see response.tsx for the lightweight Response used here).
import type { HTMLAttributes } from "react";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full gap-2.5",
      from === "user"
        ? "is-user items-end justify-end"
        : "is-assistant items-start justify-start",
      className,
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({ children, className, ...props }: MessageContentProps) => (
  <div
    className={cn(
      "flex min-w-0 flex-col gap-2 overflow-hidden text-sm",
      "group-[.is-user]:max-w-[85%] group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-md group-[.is-user]:border group-[.is-user]:border-border group-[.is-user]:bg-secondary group-[.is-user]:px-3.5 group-[.is-user]:py-2.5 group-[.is-user]:text-secondary-foreground group-[.is-user]:shadow-sm",
      "group-[.is-assistant]:min-w-0 group-[.is-assistant]:flex-1 group-[.is-assistant]:pt-0.5 group-[.is-assistant]:text-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
