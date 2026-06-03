import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function GraphLink({ projectId, file, className }: { projectId: string; file: string; className?: string }) {
  if (!file) return null;
  const fileName = file.split("/").pop();
  return (
    <Link
      href={`/dashboard/${projectId}/graph?focus=${encodeURIComponent(file)}`}
      title={file}
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-mono text-cyan-100 transition hover:bg-cyan-500/10 hover:text-white ${className || ""}`}
    >
      <span className="truncate max-w-[200px]">{fileName}</span>
      <ExternalLink className="h-3 w-3 text-cyan-200/60" />
    </Link>
  );
}
