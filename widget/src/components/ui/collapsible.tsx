import { Collapsible as CollapsiblePrimitive } from "radix-ui";

// Radix Collapsible renders inline (NO portal), so it stays inside the Shadow DOM
// and needs no portal-container patch — that is why Sources is built on it.
export const Collapsible = CollapsiblePrimitive.Root;
export const CollapsibleTrigger = CollapsiblePrimitive.Trigger;
export const CollapsibleContent = CollapsiblePrimitive.Content;
