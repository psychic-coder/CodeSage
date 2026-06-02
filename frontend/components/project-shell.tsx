"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Command, LayoutDashboard, Search, Sparkles } from "lucide-react";
import { projectsAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatProjectTime, projectNavItems } from "@/lib/dashboard-ui";
import type { Project } from "@/types";

function getTitle(pathname: string) {
  if (pathname.endsWith("/graph")) return "Dependency Graph";
  if (pathname.endsWith("/architecture")) return "Architecture";
  if (pathname.endsWith("/improvements")) return "Improvements";
  if (pathname.endsWith("/impact")) return "Impact Analysis";
  if (pathname.endsWith("/onboarding")) return "Onboarding";
  return "Overview";
}

export function ProjectShell({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["project-shell", projectId],
    queryFn: () => projectsAPI.get(projectId),
  });

  const project = data?.data as Project | undefined;
  const activeIndex = Math.max(0, projectNavItems.findIndex((item) => pathname.endsWith(item.href) || (!item.href && pathname.endsWith(`/dashboard/${projectId}`))));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const searchResults = useMemo(() => {
    const normalized = searchValue.trim().toLowerCase();
    const items = projectNavItems.map((item) => ({
      ...item,
      path: item.href ? `/dashboard/${projectId}/${item.href}` : `/dashboard/${projectId}`,
    }));
    if (!normalized) return items;
    return items.filter((item) => item.label.toLowerCase().includes(normalized) || item.path.toLowerCase().includes(normalized));
  }, [projectId, searchValue]);

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#11243a_0%,#090909_42%,#050505_100%)] text-white">
      <div className="flex min-h-dvh">
        <aside className={cn("relative flex h-dvh flex-col border-r border-white/10 bg-white/[0.03] backdrop-blur-xl transition-[width] duration-300", sidebarOpen ? "w-[280px]" : "w-[92px]") }>
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
            <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                <Sparkles className="h-5 w-5" />
              </div>
              {sidebarOpen && (
                <div>
                  <div className="text-sm font-semibold tracking-[0.22em] text-cyan-100/80">CODESAGE</div>
                  <div className="text-xs text-white/45">Repository intelligence</div>
                </div>
              )}
            </Link>
            <button type="button" onClick={() => setSidebarOpen((value) => !value)} className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white">
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative px-3 py-3">
            <div className="absolute left-3 right-3 rounded-2xl bg-gradient-to-r from-cyan-400/20 via-indigo-400/20 to-violet-400/20 transition-[top] duration-300" style={{ top: `${16 + activeIndex * 52}px`, height: "44px" }} />
            <nav className="relative space-y-2">
              {projectNavItems.map((item) => {
                const active = (item.href && pathname.endsWith(item.href)) || (!item.href && pathname.endsWith(`/dashboard/${projectId}`));
                return (
                  <Link key={item.label} href={item.href ? `/dashboard/${projectId}/${item.href}` : `/dashboard/${projectId}`} className={cn("relative flex h-11 items-center gap-3 rounded-2xl px-4 text-sm transition-all duration-300", active ? "text-white" : "text-white/58 hover:bg-white/5 hover:text-white") }>
                    <span className="text-base opacity-90">{item.icon}</span>
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto border-t border-white/10 p-4">
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white">
              <LayoutDashboard className="h-4 w-4" />
              {sidebarOpen && <span>Back to projects</span>}
            </Link>
            {sidebarOpen && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/50">
                <div className="mb-1 text-white/80">Active project</div>
                <div className="truncate text-sm text-white">{isLoading ? "Loading..." : project?.name || "Unknown project"}</div>
                <div className="mt-1">Updated {formatProjectTime(project?.updated_at)}</div>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-black/20 backdrop-blur-2xl">
            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-white/35">Projects / {project?.name || projectId} / {getTitle(pathname)}</div>
                <div className="mt-1 text-lg font-semibold text-white">{getTitle(pathname)}</div>
              </div>

              <button type="button" onClick={() => setSearchOpen(true)} className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-white/55 transition hover:border-cyan-400/30 hover:bg-white/[0.08] lg:max-w-xl">
                <span className="flex min-w-0 items-center gap-3">
                  <Search className="h-4 w-4 text-cyan-300" />
                  <span className="truncate">Search files, commands, and guides</span>
                </span>
                <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white/45">
                  <Command className="h-3.5 w-3.5" />K
                </span>
              </button>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>

      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 px-4 py-10 backdrop-blur-xl" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0f14]/95 shadow-[0_30px_120px_rgba(0,0,0,0.65)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Search className="h-4 w-4 text-cyan-300" />
              <input autoFocus value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search CodeSage" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
              <span className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/40">Esc</span>
            </div>
            <div className="max-h-[60vh] overflow-auto p-3">
              {searchResults.length ? searchResults.map((item) => (
                <Link key={item.label} href={item.path} onClick={() => setSearchOpen(false)} className="flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm text-white/70 transition hover:border-cyan-400/20 hover:bg-white/[0.04] hover:text-white">
                  <span className="flex items-center gap-3">
                    <span className="text-lg opacity-80">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  <span className="text-xs text-white/35">{item.path}</span>
                </Link>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/45">
                  No results. Try Architecture, Graph, Improvements, Impact Analysis, or Onboarding.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
