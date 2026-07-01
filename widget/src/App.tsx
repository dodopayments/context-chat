import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowRightIcon,
  Maximize2Icon,
  Minimize2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Sources,
  SourcesContent,
  SourcesTrigger,
  Source,
} from "@/components/ai-elements/sources";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import type { ResolvedConfig } from "@/config";
import { chatErrorMessage, verifyErrorMessage } from "@/errors";
import { isMac, matchesHotkey, parseHotkey } from "@/platform";
import { TurnstileController } from "@/lib/turnstile";
import { cn } from "@/lib/utils";

const Z = "z-[2147483600]";

interface AppProps {
  config: ResolvedConfig;
}

interface Citation {
  id: string;
  url: string;
  title: string;
}

function AssistantAvatar() {
  return (
    <div
      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-primary ring-1 ring-border"
      aria-hidden="true"
    >
      <SparklesIcon className="size-4" />
    </div>
  );
}

// .cc-animate disables the bounce under prefers-reduced-motion.
function TypingIndicator({ label = false, name }: { label?: boolean; name: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="cc-animate size-1.5 rounded-full bg-primary animate-cc-typing"
            style={{ animationDelay: `${dot * 0.16}s` }}
          />
        ))}
      </div>
      {label ? (
        <span className="text-xs text-muted-foreground">Searching the docs…</span>
      ) : null}
      <span className="sr-only">{name} is typing…</span>
    </div>
  );
}

export function App({ config }: AppProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  // True from the start of submit() until sendMessage is dispatched, covering the
  // Turnstile token fetch (1–3s) during which useChat status is still "ready".
  const [preparing, setPreparing] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const tokenRef = useRef<string>("");
  const openRef = useRef(open);
  openRef.current = open;

  // One Turnstile controller for the widget's lifetime; tokens are fetched fresh
  // (single-use, 5-min expiry) per send and read from tokenRef at request time.
  const turnstile = useMemo(
    () => new TurnstileController(config.turnstileSitekey),
    [config.turnstileSitekey],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: config.chatEndpoint,
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { messages, turnstileToken: tokenRef.current },
        }),
      }),
    [config.chatEndpoint],
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport,
    experimental_throttle: 50,
  });
  const busy = preparing || status === "submitted" || status === "streaming";

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setLocalError(null);
      if (error) clearError();

      setPreparing(true);
      try {
        // Obtain a FRESH Turnstile token BEFORE sending — the token rides in the
        // request body via prepareSendMessagesRequest (tokenRef). Never send without one.
        const token = await turnstile.getToken();
        tokenRef.current = token;
        setInput("");
        void sendMessage({ text: trimmed });
      } catch {
        setLocalError(verifyErrorMessage());
      } finally {
        setPreparing(false);
      }
    },
    [busy, error, clearError, turnstile, sendMessage],
  );

  const closePanel = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  // Hotkey (toggle) + Escape (close). Listens at document level so it works
  // whether focus is in the host page or inside the shadow root.
  useEffect(() => {
    const hotkey = parseHotkey(config.hotkey);
    const mac = isMac();
    const onKeyDown = (event: KeyboardEvent) => {
      if (hotkey && matchesHotkey(event, hotkey, mac)) {
        event.preventDefault();
        setOpen((o) => !o);
      } else if (event.key === "Escape" && openRef.current) {
        event.preventDefault();
        closePanel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [config.hotkey, closePanel]);

  // Move focus to the textarea when the panel opens.
  useEffect(() => {
    if (!open) return;
    const textarea = panelRef.current?.querySelector<HTMLTextAreaElement>(
      'textarea[name="message"]',
    );
    textarea?.focus();
  }, [open]);

  const inlineError = localError ?? (error ? chatErrorMessage(error) : null);

  if (!open) {
    return (
      <button
        type="button"
        ref={launcherRef}
        onClick={() => setOpen(true)}
        aria-label={`${config.launcherLabel} — open the ${config.assistantName} assistant`}
        className={cn(
          "cc-animate cc-launcher group fixed right-6 bottom-6 flex h-14 items-center gap-2.5 rounded-full bg-primary pl-4 pr-5 text-primary-foreground transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background max-[480px]:right-4 max-[480px]:bottom-4",
          Z,
        )}
      >
        <SparklesIcon className="cc-animate size-6 transition-transform duration-200 group-hover:scale-110" />
        <span className="font-display text-sm font-semibold tracking-tight">{config.launcherLabel}</span>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`${config.assistantName} assistant`}
      aria-modal="false"
      className={cn(
        "cc-animate cc-panel animate-cc-pop fixed right-6 bottom-6 flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground transition-[width,height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        expanded ? "h-[760px] w-[600px] max-w-[calc(100vw-3rem)]" : "h-[560px] w-96",
        "max-[480px]:inset-x-0 max-[480px]:right-0 max-[480px]:bottom-0 max-[480px]:h-[86dvh] max-[480px]:max-h-[86dvh] max-[480px]:w-auto max-[480px]:rounded-b-none",
        Z,
      )}
    >
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div className="relative shrink-0">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary ring-1 ring-border">
            <SparklesIcon className="size-[18px]" />
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-primary ring-2 ring-card"
            aria-hidden="true"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-[15px] font-semibold leading-tight text-foreground">
            {config.assistantName}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            Online · {config.tagline}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Restore chat size" : "Expand chat"}
          aria-pressed={expanded}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[480px]:hidden"
        >
          {expanded ? <Minimize2Icon className="size-4" /> : <Maximize2Icon className="size-4" />}
        </button>
        <button
          type="button"
          onClick={closePanel}
          aria-label="Close assistant"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon className="size-4" />
        </button>
      </header>

      <Conversation>
        <ConversationContent>
          {messages.length === 0 && !busy ? (
            <ConversationEmptyState className="gap-4">
              <div className="flex size-full flex-col items-center justify-center gap-5 p-2 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary ring-1 ring-border shadow-sm">
                  <SparklesIcon className="size-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display font-semibold text-foreground text-base">
                    {config.welcomeHeading}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {config.welcomeSubtext}
                  </p>
                </div>
                {config.starterQuestions.length > 0 && (
                  <div className="mt-0.5 flex w-full flex-col gap-2">
                    {config.starterQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => void submit(question)}
                        className="cc-animate group flex items-center justify-between gap-2 rounded-xl border border-border bg-muted px-3.5 py-2.5 text-left text-sm text-foreground transition-all duration-150 hover:-translate-y-px hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="min-w-0">{question}</span>
                        <ArrowRightIcon className="cc-animate size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message, index) => {
              const texts: string[] = [];
              const citations: Citation[] = [];
              for (const part of message.parts) {
                if (part.type === "text") {
                  texts.push(part.text);
                } else if (part.type === "source-url") {
                  citations.push({
                    id: part.sourceId,
                    url: part.url,
                    title: part.title ?? part.url,
                  });
                }
              }
              const text = texts.join("");
              // Streaming the active assistant turn that has citations/placeholder
              // but no visible text yet → keep the dots until the first token lands.
              const showInlineTyping =
                message.role === "assistant" &&
                status === "streaming" &&
                index === messages.length - 1 &&
                !text;
              return (
                <Message
                  from={message.role}
                  key={message.id}
                  className="cc-animate animate-cc-message-in"
                >
                  {message.role === "assistant" && <AssistantAvatar />}
                  <MessageContent>
                    {message.role === "user" ? (
                      <span className="whitespace-pre-wrap">{text}</span>
                    ) : (
                      <>
                        {text ? <Response>{text}</Response> : null}
                        {citations.length > 0 && (
                          <Sources>
                            <SourcesTrigger count={citations.length} />
                            <SourcesContent>
                              {citations.map((citation) => (
                                <Source
                                  key={citation.id}
                                  href={citation.url}
                                  title={citation.title}
                                />
                              ))}
                            </SourcesContent>
                          </Sources>
                        )}
                        {showInlineTyping && <TypingIndicator name={config.assistantName} />}
                      </>
                    )}
                  </MessageContent>
                </Message>
              );
            })
          )}

          {(preparing || status === "submitted") && (
            <Message from="assistant" className="cc-animate animate-cc-message-in">
              <AssistantAvatar />
              <MessageContent>
                <TypingIndicator label name={config.assistantName} />
              </MessageContent>
            </Message>
          )}

          {inlineError && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-destructive text-sm"
            >
              {inlineError}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3">
        <PromptInput onSubmit={({ text }) => void submit(text)}>
          <PromptInputTextarea
            aria-label="Message"
            placeholder={`Ask ${config.assistantName}…`}
            value={input}
            disabled={busy}
            onChange={(event) => setInput(event.currentTarget.value)}
          />
          <PromptInputSubmit
            status={status}
            loading={preparing}
            disabled={!input.trim() || busy}
          />
        </PromptInput>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {config.disclaimer}
        </p>
      </div>
    </div>
  );
}
