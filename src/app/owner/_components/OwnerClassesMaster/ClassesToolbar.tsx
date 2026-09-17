"use client";
import Icon from "@/components/ui/Icon";
import type { OwnerClassesMasterHook } from "./_hook";

export default function ClassesToolbar({ hook }: { hook: OwnerClassesMasterHook }) {
  const {
    branches, allCoaches, search, setSearch, branchFilter, setBranchFilter,
    coachFilter, setCoachFilter, statusFilter, setStatusFilter, openCreate,
  } = hook;

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search class"
            className="h-10 pl-9 pr-3 w-56 rounded-xl border border-line bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-hidden focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">
            <Icon name="search" className="w-4 h-4" />
          </span>
        </div>

        {/* Center / Branch Filter */}
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          aria-label="Filter center"
          className="h-10 px-3 rounded-xl border border-line bg-paper text-sm text-ink-soft focus:outline-hidden focus:border-ocean-500"
        >
          <option value="">All centers</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id} translate="no" className="notranslate">
              {b.name}
            </option>
          ))}
        </select>

        {/* Coach Filter */}
        <select
          value={coachFilter}
          onChange={(e) => setCoachFilter(e.target.value)}
          aria-label="Filter coach"
          className="h-10 px-3 rounded-xl border border-line bg-paper text-sm text-ink-soft focus:outline-hidden focus:border-ocean-500"
        >
          <option value="">All coaches</option>
          {allCoaches.map((c) => (
            <option key={c.id} value={c.id} translate="no" className="notranslate">
              {c.full_name}
            </option>
          ))}
        </select>

        {/* Status Tabs */}
        <div className="h-10 px-1 bg-paper border border-line rounded-xl flex items-center gap-1">
          {(["active", "archived", "all"] as const).map((st) => {
            const label =
              st === "active"
                ? "Active"
                : st === "archived"
                ? "Archived"
                : "All";
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-ocean-50 text-ocean-700 font-bold"
                    : "text-ink-mute hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={openCreate}
          className="h-10 px-4 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Icon name="plus" className="w-4 h-4" />
          <span>New class</span>
        </button>
      </div>
    </div>
  );
}
