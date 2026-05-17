import React from "react";

export function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function monthLabel(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

type StatusBadgeType = { label: string; class: string };
const statusBadgeMap: Record<string, StatusBadgeType> = {
  approved: { label: "Approved", class: "bg-green-100 text-green-700 border-green-200" },
  submitted: { label: "Submitted", class: "bg-blue-100 text-blue-700 border-blue-200" },
  pending: { label: "Pending", class: "bg-orange-100 text-orange-700 border-orange-200" },
  rejected: { label: "Rejected", class: "bg-red-100 text-red-700 border-red-200" },
  open: { label: "Open", class: "bg-green-100 text-green-700 border-green-200" },
  closed: { label: "Closed", class: "bg-red-100 text-red-700 border-red-200" },
  ongoing: { label: "Ongoing", class: "bg-blue-100 text-blue-700 border-blue-200" },
  missing: { label: "Missing", class: "bg-red-100 text-red-700 border-red-200" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusBadgeMap[status] || { label: status, class: "bg-gray-100 text-gray-700 border-gray-200" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.class}`}>{s.label}</span>;
}

export const TODAY_ISO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();
export const TODAY_LABEL = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
export const TODAY_DAY = new Date().toLocaleDateString("en-US", { weekday: "long" });
