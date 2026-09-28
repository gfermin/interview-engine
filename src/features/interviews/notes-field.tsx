"use client";

import { useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";

/** Plan Phase 27/AUDIT-010 — how long to wait after the last keystroke
 * before autosaving, so a tab closed mid-debounce loses at most this much
 * typing rather than everything back to the last blur. */
const AUTOSAVE_DEBOUNCE_MS = 1800;

/**
 * Autosaves on blur AND on a short debounced interval while the field is
 * dirty (plan Phase 27/AUDIT-010 — blur-only autosave silently loses
 * everything typed since the last blur if the tab/browser closes first).
 * A `visibilitychange`/`beforeunload` listener makes one last best-effort
 * save attempt when the tab is hidden/closed with unsaved text, as a
 * backstop on top of the debounce (not a guarantee — an in-flight Server
 * Action can still be aborted by a genuine page unload).
 */
export function NotesField({
  action,
  defaultValue,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValue: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const dirtyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPendingSave() {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  function saveNow() {
    clearPendingSave();
    if (dirtyRef.current) {
      dirtyRef.current = false;
      formRef.current?.requestSubmit();
    }
  }

  function scheduleSave() {
    dirtyRef.current = true;
    clearPendingSave();
    debounceRef.current = setTimeout(saveNow, AUTOSAVE_DEBOUNCE_MS);
  }

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") saveNow();
    }
    window.addEventListener("beforeunload", saveNow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", saveNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearPendingSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form ref={formRef} action={action}>
      <Textarea
        name="notes"
        rows={2}
        placeholder="Interviewer notes..."
        defaultValue={defaultValue ?? ""}
        onChange={scheduleSave}
        onBlur={saveNow}
        className="text-[12.5px]"
      />
    </form>
  );
}
