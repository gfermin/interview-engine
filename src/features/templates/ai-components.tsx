"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { AIActionState } from "./ai-actions";

/**
 * Wraps one AI-assisted action (Analyze JD, Generate Draft) with the
 * pending/error/raw-output UI both need — a failed generation shows the raw
 * AI output for manual correction rather than a dead end (plan §28).
 */
export function AIActionButton({
  action,
  label,
  pendingLabel,
}: {
  action: (prevState: AIActionState | undefined) => Promise<AIActionState | undefined>;
  label: string;
  pendingLabel: string;
}) {
  const [state, formAction, pending] = useActionState<AIActionState | undefined, FormData>(
    action,
    undefined
  );

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <Button type="submit" disabled={pending} variant="outline">
          {pending ? pendingLabel : label}
        </Button>
      </form>
      {state?.error ? (
        <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs font-medium text-destructive">{state.error}</p>
          {state.rawOutput ? (
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Raw AI output
              </summary>
              <pre className="mt-1 max-h-64 overflow-auto rounded bg-muted p-2 text-[10.5px] whitespace-pre-wrap">
                {state.rawOutput}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
