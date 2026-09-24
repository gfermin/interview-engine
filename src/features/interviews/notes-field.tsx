"use client";

import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";

/**
 * Autosaves on blur rather than on every keystroke (plan §28's risk note:
 * "recomputing on every keystroke could be wasteful" applies to persisting
 * notes too). `requestSubmit()` on blur submits the same server-action-bound
 * form NotesField wraps, without needing a visible save button.
 */
export function NotesField({
  action,
  defaultValue,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValue: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <Textarea
        name="notes"
        rows={2}
        placeholder="Interviewer notes..."
        defaultValue={defaultValue ?? ""}
        onBlur={() => formRef.current?.requestSubmit()}
        className="text-[12.5px]"
      />
    </form>
  );
}
