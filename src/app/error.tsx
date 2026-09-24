"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Root error boundary (§40.3) — catches any uncaught exception below this
 * point (including the several fire-and-forget Server Actions in
 * features/interviews/actions.ts and templates/actions.ts that have no
 * try/catch of their own, e.g. a stale second tab acting on a session that
 * was finished elsewhere) and replaces Next's default unstyled overlay with
 * something an interviewer can actually act on. Deliberately the
 * lowest-effort fix for that whole class of errors (plan §40.3) rather than
 * threading `{error}` state through every one of those actions individually.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            An unexpected error interrupted this page. Your data up to this point is saved —
            retrying usually resolves it.
          </p>
          <Button onClick={() => reset()} className="self-start">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
