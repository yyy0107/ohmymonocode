/** Join class names, skipping falsy entries. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Shared interaction treatment: hover fill, press scale, focus ring. */
export const PRESSABLE =
  "transition-[background-color,color,border-color,transform] duration-150 ease-[var(--ease-omb)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100";
