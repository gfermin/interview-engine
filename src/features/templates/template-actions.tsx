"use client";

import { useActionState, type ReactNode } from "react";
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

export function NewVersionButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form action={action}>
      <Button type="submit" variant="outline">
        Create New Version to Edit
      </Button>
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
