// AI Elements `PromptInput` surface, trimmed to the three exports the widget uses
// (PromptInput / PromptInputTextarea / PromptInputSubmit). The upstream component
// pulls in Command, Select, DropdownMenu, HoverCard and Tooltip — all Radix
// PORTAL primitives that escape the Shadow DOM — plus file-attachment/screenshot
// machinery the widget does not need. This portal-free version keeps the exact
// component API and visual style while staying fully inside the shadow root.
import * as React from "react";
import type { ChatStatus } from "ai";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ai-elements/loader";
import { cn } from "@/lib/utils";

export type PromptInputMessage = {
  text: string;
};

export type PromptInputProps = Omit<React.ComponentProps<"form">, "onSubmit"> & {
  onSubmit: (message: PromptInputMessage, event: React.FormEvent<HTMLFormElement>) => void;
};

export function PromptInput({ className, onSubmit, children, ...props }: PromptInputProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const text = ((formData.get("message") as string | null) ?? "").trim();
    onSubmit({ text }, event);
  };

  return (
    <form
      className={cn(
        "cc-prompt cc-animate flex items-end gap-2 rounded-2xl border border-input bg-background p-1.5 shadow-sm",
        className,
      )}
      onSubmit={handleSubmit}
      {...props}
    >
      {children}
    </form>
  );
}

export type PromptInputTextareaProps = React.ComponentProps<"textarea">;

export function PromptInputTextarea({
  className,
  onKeyDown,
  onInput,
  placeholder = "Ask a question…",
  ...props
}: PromptInputTextareaProps) {
  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const form = e.currentTarget.form;
      const submit = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      if (submit?.disabled) return;
      form?.requestSubmit();
    }
  };

  const handleInput: React.FormEventHandler<HTMLTextAreaElement> = (e) => {
    onInput?.(e);
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  return (
    <textarea
      name="message"
      rows={1}
      className={cn(
        "max-h-32 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      {...props}
    />
  );
}

export type PromptInputSubmitProps = React.ComponentProps<typeof Button> & {
  status?: ChatStatus;
  // Busy before useChat status flips to "submitted" (e.g. awaiting Turnstile).
  loading?: boolean;
};

export function PromptInputSubmit({
  className,
  status,
  loading,
  disabled,
  children,
  ...props
}: PromptInputSubmitProps) {
  const busy = loading || status === "submitted" || status === "streaming";
  return (
    <Button
      type="submit"
      size="icon"
      className={cn(
        "size-9 shrink-0 rounded-xl shadow-sm transition-transform active:scale-95",
        className,
      )}
      disabled={disabled ?? busy}
      aria-label="Send message"
      {...props}
    >
      {children ?? (busy ? <Loader size={18} /> : <SendIcon className="size-4" />)}
    </Button>
  );
}
