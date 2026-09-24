import { Badge } from "@/components/ui/badge";

export function AppTopbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-6 py-3 shadow-sm">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <Badge variant="secondary" className="font-mono text-[10.5px] uppercase">
        POC
      </Badge>
    </header>
  );
}
