"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { FormActionState } from "./actions";

export function PublishButton({
  action,
}: {
  action: (
    prevState: FormActionState | undefined
  ) => Promise<FormActionState | undefined>;
}) {
  const [state, formAction, pending] = useActionState<
    FormActionState | undefined,
    FormData
  >(action, undefined);

  return (
    <div className="flex flex-col items-end gap-1.5">
      {state?.error ? (
        <p className="max-w-xs text-right text-xs text-destructive">{state.error}</p>
      ) : null}
      <form action={formAction}>
        <Button type="submit" disabled={pending}>
          {pending ? "Publishing..." : "Publish Template"}
        </Button>
      </form>
    </div>
  );
}

/** Separate from {@link NewVersionButton} because `useFormStatus` only
 * reports the status of the nearest enclosing `<form>` when called from a
 * *child* of that form, not from the component that renders the form
 * itself. */
function NewVersionSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Creating..." : "Create New Version to Edit"}
    </Button>
  );
}

/**
 * `createNewTemplateVersion` (§40.4) is a plain multi-row insert with no
 * idempotency guard and no unique constraint on `(positionId, stage,
 * version)` — a double-click here could create two `v+1` drafts. Disabling
 * the button after the first click is the lowest-risk fix (every other
 * fire-and-forget mutation in the app is naturally idempotent against
 * double-clicks via `onConflictDoUpdate`; this is the one exception).
 */
export function NewVersionButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form action={action}>
      <NewVersionSubmitButton />
    </form>
  );
}

/** A plain icon submit button whose form action is a no-argument server
 * action (already bound to its target id via .bind). Used for delete/move
 * rows where there's no field-level error to surface — see actions.ts's
 * "silent no-op on a stale/guarded request" note.
 *
 * `icon` takes an already-instantiated element (e.g. `<Trash2 />`), not a
 * component reference — a Server Component caller can only pass a function
 * across the server/client boundary as a rendered element, never as a bare
 * component value. */
export function RowActionButton({
  action,
  icon,
  label,
  variant = "ghost",
  confirmMessage,
}: {
  action: () => Promise<void>;
  icon: ReactNode;
  label: string;
  variant?: "ghost" | "outline" | "destructive";
  confirmMessage?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant={variant} size="icon-sm" aria-label={label} title={label}>
        {icon}
      </Button>
    </form>
  );
}
