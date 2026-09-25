import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Styled 404 (§40.3) — every dynamic route already calls `notFound()`
 * correctly on a missing record (positions/[id], templates/[id],
 * candidates/[id], interviews/[sessionId] + /summary); this is just what
 * Next renders when it does, replacing the framework default.
 */
export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Not found</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            The page or record you&apos;re looking for doesn&apos;t exist, or may have been removed.
          </p>
          <ButtonLink href="/" className="self-start">
            Back to dashboard
          </ButtonLink>
        </CardContent>
      </Card>
    </div>
  );
}
