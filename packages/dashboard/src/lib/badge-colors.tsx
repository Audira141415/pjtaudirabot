import React from 'react';

/**
 * Badge color utilities for ticket status and priority visual representation
 * Refactored for 'Deep Space Command' Bespoke Aesthetic
 */

export interface BadgeStyle {
  bg: string;
  text: string;
  dot?: string;
  border: string;
}

/**
 * Get badge color style for ticket status
 */
export function getStatusBadgeColor(status: string): BadgeStyle {
  const normalizedStatus = (status ?? '').toUpperCase();

  switch (normalizedStatus) {
    case 'OPEN':
    case 'NEW':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-500', border: 'border-rose-500/20' };
    case 'IN_PROGRESS':
    case 'INPROGRESS':
    case 'WAITING':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500', border: 'border-amber-500/20' };
    case 'RESOLVED':
    case 'COMPLETED':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-500/20' };
    case 'CLOSED':
      return { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-500', border: 'border-slate-500/20' };
    case 'PENDING':
      return { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-500', border: 'border-blue-500/20' };
    case 'ESCALATED':
      return { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-500', border: 'border-purple-500/20' };
    case 'CANCELLED':
    case 'REJECTED':
      return { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-500', border: 'border-slate-500/20' };
    default:
      return { bg: 'bg-white/5', text: 'text-slate-500', dot: 'bg-slate-500', border: 'border-white/5' };
  }
}

/**
 * Get badge color style for ticket priority
 */
export function getPriorityBadgeColor(priority: string): BadgeStyle {
  const normalizedPriority = (priority ?? '').toUpperCase();

  switch (normalizedPriority) {
    case 'CRITICAL':
    case 'URGENT':
      return { bg: 'bg-rose-500/15', text: 'text-rose-400', dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]', border: 'border-rose-500/30' };
    case 'HIGH':
      return { bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-500', border: 'border-orange-500/30' };
    case 'MEDIUM':
    case 'NORMAL':
      return { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-500', border: 'border-amber-500/30' };
    case 'LOW':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-500/30' };
    default:
      return { bg: 'bg-white/5', text: 'text-slate-500', dot: 'bg-slate-500', border: 'border-white/5' };
  }
}

/**
 * Status Badge Component
 */
export function StatusBadge({ status }: { status: string }) {
  const colors = getStatusBadgeColor(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${colors.bg} ${colors.text} ${colors.border}`}>
      {colors.dot && <span className={`w-1 h-1 rounded-full ${colors.dot}`} />}
      {status}
    </span>
  );
}

/**
 * Priority Badge Component
 */
export function PriorityBadge({ priority }: { priority: string }) {
  const colors = getPriorityBadgeColor(priority);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${colors.bg} ${colors.text} ${colors.border}`}>
      {colors.dot && <span className={`w-1 h-1 rounded-full ${colors.dot}`} />}
      {priority}
    </span>
  );
}

/**
 * Category Badge Component (Legacy Fallback)
 */
export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5 bg-white/5 text-slate-400`}>
      {category}
    </span>
  );
}
