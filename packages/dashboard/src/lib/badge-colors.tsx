/**
 * Badge color utilities for ticket status and priority visual representation
 */

export interface BadgeStyle {
  bg: string;
  text: string;
  dot?: string;
}

/**
 * Get badge color style for ticket status
 */
export function getStatusBadgeColor(status: string): BadgeStyle {
  const normalizedStatus = (status ?? '').toUpperCase();

  switch (normalizedStatus) {
    case 'OPEN':
    case 'NEW':
      return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
    case 'IN_PROGRESS':
    case 'INPROGRESS':
    case 'WAITING':
      return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
    case 'RESOLVED':
    case 'COMPLETED':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case 'CLOSED':
      return { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' };
    case 'PENDING':
      return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
    case 'ESCALATED':
      return { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' };
    case 'CANCELLED':
    case 'REJECTED':
      return { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
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
      return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
    case 'HIGH':
      return { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' };
    case 'MEDIUM':
    case 'NORMAL':
      return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
    case 'LOW':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
  }
}

/**
 * Get badge color style for ticket category
 */
export function getCategoryBadgeColor(category: string): BadgeStyle {
  const normalizedCategory = (category ?? '').toUpperCase();

  switch (normalizedCategory) {
    case 'NETWORK':
    case 'INFRA':
      return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
    case 'HARDWARE':
      return { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' };
    case 'SOFTWARE':
      return { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' };
    case 'APPLICATION':
      return { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' };
    case 'DATABASE':
      return { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' };
    case 'SECURITY':
      return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
    case 'SERVICE':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
  }
}

/**
 * Status Badge Component
 */
export function StatusBadge({ status }: { status: string }) {
  const colors = getStatusBadgeColor(status);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      {colors.dot && <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />}
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
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      {colors.dot && <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />}
      {priority}
    </span>
  );
}

/**
 * Category Badge Component
 */
export function CategoryBadge({ category }: { category: string }) {
  const colors = getCategoryBadgeColor(category);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      {colors.dot && <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />}
      {category}
    </span>
  );
}
