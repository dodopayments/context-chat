// Vendored from Vercel AI Elements (registry: sources). Built on Radix Collapsible,
// which renders INLINE (no portal) so it stays inside the Shadow DOM. `Source`
// forces target=_blank rel="noopener noreferrer" per the widget security contract.
import type { ComponentProps } from "react";
import { ArrowUpRightIcon, BookOpenIcon, ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type SourcesProps = ComponentProps<"div">;

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible className={cn("not-prose mt-0.5 text-xs", className)} {...props} />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
};

export const SourcesTrigger = ({ className, count, children, ...props }: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted py-1 pl-2 pr-2.5 font-medium text-muted-foreground outline-none transition-colors hover:border-primary hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&[data-state=open]>svg:last-child]:rotate-180",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        <BookOpenIcon className="size-3.5 text-primary" />
        <span>
          Used {count} {count === 1 ? "source" : "sources"}
        </span>
        <ChevronDownIcon className="size-3.5 transition-transform duration-200" />
      </>
    )}
  </CollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>;

export const SourcesContent = ({ className, children, ...props }: SourcesContentProps) => (
  <CollapsibleContent
    className={cn("cc-collapsible cc-animate overflow-hidden outline-none", className)}
    {...props}
  >
    <div className="flex w-full flex-col gap-1.5 pt-2">{children}</div>
  </CollapsibleContent>
);

export type SourceProps = ComponentProps<"a">;

export const Source = ({ href, title, children, className, ...props }: SourceProps) => (
  <a
    className={cn(
      "group/src flex items-center gap-2 rounded-lg border border-border bg-muted px-2.5 py-2 text-muted-foreground transition-colors hover:border-primary hover:bg-accent hover:text-foreground",
      className,
    )}
    href={href}
    rel="noopener noreferrer"
    target="_blank"
    {...props}
  >
    {children ?? (
      <>
        <BookOpenIcon className="size-3.5 shrink-0 text-primary" />
        <span className="block truncate font-medium">{title}</span>
        <ArrowUpRightIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-hover/src:-translate-y-0.5 group-hover/src:translate-x-0.5 group-hover/src:text-primary" />
      </>
    )}
  </a>
);
