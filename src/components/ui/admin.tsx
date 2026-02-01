/**
 * Shared Admin UI Components
 *
 * Reusable components for the admin section to ensure consistency
 * across all admin pages.
 *
 * @example
 * ```tsx
 * import { AdminPageHeader, AdminStatCard, EmptyState } from "@/components/ui/admin";
 * ```
 */

import { cn } from "@/lib/utils";
import { Loader2, Search, Check, AlertTriangle, Info, Package, FileX, Sparkles } from "lucide-react";

// ============================================================================
// PAGE HEADER
// ============================================================================

export interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: string;
}

/**
 * Standardized page header component for admin pages
 * @example
 * <AdminPageHeader
 *   title="Orders"
 *   description="Manage and track customer orders"
 *   badge={<Badge>Operations</Badge>}
 *   actions={<Button>Export</Button>}
 * />
 */
export function AdminPageHeader({ title, description, actions, badge }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
      <div>
        {badge && (
          <span className="inline-flex items-center rounded-full bg-[#D26E3D]/10 px-2.5 py-0.5 text-xs font-semibold text-[#D26E3D] mb-2">
            {badge}
          </span>
        )}
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-gray-500 mt-1.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}

// ============================================================================
// SEARCH BAR
// ============================================================================

export interface AdminSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Consistent search input with icon for admin pages
 */
export function AdminSearchBar({ value, onChange, placeholder = "Search...", className }: AdminSearchBarProps) {
  return (
    <div className={cn("relative w-full sm:w-80", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-[#D26E3D]/30 focus:border-[#D26E3D]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ============================================================================
// STATS CARDS
// ============================================================================

export type AdminStatTone = "gray" | "green" | "amber" | "blue" | "rose" | "purple" | "orange";

export interface AdminStatCardProps {
  label: string;
  value: string | number;
  tone?: AdminStatTone;
  icon?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  description?: string;
}

/**
 * Stat card for displaying metrics with optional trends and icons
 * @example
 * <AdminStatCard
 *   label="Total Orders"
 *   value={156}
 *   tone="blue"
 *   icon={<ShoppingCart className="h-5 w-5" />}
 *   trend={{ value: "12%", positive: true }}
 * />
 */
export function AdminStatCard({ label, value, tone = "gray", icon, trend, description }: AdminStatCardProps) {
  const toneMap: Record<AdminStatTone, string> = {
    gray: "border-gray-200 bg-white text-gray-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
  };

  return (
    <div className={cn(
      "rounded-xl border px-5 py-4 transition-all hover:shadow-sm",
      toneMap[tone]
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide opacity-70 font-medium">
            {label}
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight">{value}</div>
          {trend && (
            <div className={cn(
              "mt-1 text-xs font-medium flex items-center gap-0.5",
              trend.positive ? "text-green-600" : "text-rose-600"
            )}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </div>
          )}
          {description && (
            <div className="text-xs opacity-60 mt-1">{description}</div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50 flex-shrink-0 ml-3">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STATUS BADGE
// ============================================================================

export type StatusType =
  | "active" | "inactive"
  | "pending" | "in_progress" | "ready" | "picked_up" | "cancelled"
  | "paid" | "unpaid" | "pending_verification";

export interface StatusBadgeProps {
  status: StatusType;
  children?: React.ReactNode;
  size?: "sm" | "md";
}

/**
 * Unified status badge component with consistent styling
 */
export function StatusBadge({ status, children, size = "md" }: StatusBadgeProps) {
  const statusMap: Record<StatusType, { bg: string; text: string; border: string; dot: string; label: string }> = {
    active: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500", label: "Active" },
    inactive: { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-400", label: "Inactive" },
    pending: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500", label: "Pending" },
    in_progress: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500", label: "In Progress" },
    ready: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500", label: "Ready" },
    picked_up: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200", dot: "bg-gray-400", label: "Picked Up" },
    cancelled: { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200", dot: "bg-rose-500", label: "Cancelled" },
    paid: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200", dot: "bg-green-500", label: "Paid" },
    unpaid: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-400", label: "Unpaid" },
    pending_verification: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200", dot: "bg-yellow-500", label: "Pending" },
  };

  const config = statusMap[status];
  const sizeMap = { sm: "px-2 py-0.5 text-[11px]", md: "px-2.5 py-1 text-xs" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        config.bg, config.text, config.border,
        sizeMap[size]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {children || config.label}
    </span>
  );
}

// ============================================================================
// FILTER CHIPS
// ============================================================================

export interface FilterChipProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick: () => void;
  tone?: "default" | "gray" | "brand";
}

/**
 * Tab-like filter chips for filtering content
 */
export function FilterChip({ label, active, count, onClick, tone = "default" }: FilterChipProps) {
  const activeStyles = {
    default: "border-[#D26E3D] bg-[#D26E3D]/10 text-[#D26E3D]",
    gray: "border-gray-700 bg-gray-100 text-gray-700",
    brand: "border-[#D26E3D] bg-[#D26E3D] text-white",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
        active
          ? cn(activeStyles[tone], "shadow-sm")
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
      )}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn(
          "rounded-full px-2 py-0.5 text-xs font-semibold",
          active
            ? tone === "brand"
              ? "bg-white/20 text-white"
              : "bg-[#D26E3D]/20 text-[#D26E3D]"
            : "bg-gray-100 text-gray-600"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  illustration?: React.ReactNode;
}

/**
 * Consistent empty state component with optional action button
 */
export function EmptyState({ icon: Icon, title, description, action, illustration }: EmptyStateProps) {
  const DefaultIcon = Icon || Package;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {illustration || (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 mb-4">
          <DefaultIcon className="h-10 w-10 text-gray-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 rounded-lg bg-[#D26E3D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B85C2E] transition-colors shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// ALERT BANNER
// ============================================================================

export type AlertVariant = "info" | "warning" | "success" | "error";

export interface AlertBannerProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

/**
 * Alert banner for displaying important messages
 */
export function AlertBanner({ variant = "info", title, children, dismissible, onDismiss, icon }: AlertBannerProps) {
  const variantMap: Record<AlertVariant, { bg: string; border: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
    info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: Info },
    warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", icon: AlertTriangle },
    success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", icon: Check },
    error: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", icon: AlertTriangle },
  };

  const config = variantMap[variant];
  const DefaultIcon = config.icon;

  return (
    <div className={cn("rounded-xl border px-4 py-3", config.bg, config.border)}>
      <div className="flex items-start gap-3">
        {icon ? <div className={cn("flex-shrink-0 mt-0.5", config.text)}>{icon}</div> : <DefaultIcon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.text)} />}
        <div className="flex-1">
          {title && <p className={cn("text-sm font-semibold mb-1", config.text)}>{title}</p>}
          <p className={cn("text-sm", config.text)}>{children}</p>
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={cn("text-sm font-medium hover:opacity-70", config.text)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

export interface CardSkeletonProps {
  count?: number;
  className?: string;
  cardClassName?: string;
}

/**
 * Loading skeleton for card grids
 */
export function CardSkeleton({ count = 3, className, cardClassName }: CardSkeletonProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn(
          "flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse",
          cardClassName
        )}>
          <div className="h-40 w-full rounded-xl bg-gray-200" />
          <div className="space-y-2 px-1">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="h-10 rounded bg-gray-200" />
              <div className="h-10 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ACTION BUTTON
// ============================================================================

export type ActionButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ActionButtonSize = "sm" | "md" | "lg";

export interface ActionButtonProps {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  className?: string;
  type?: "button" | "submit" | "reset";
}

/**
 * Consistent action button with loading states
 */
export function ActionButton({
  variant = "secondary",
  size = "md",
  children,
  onClick,
  disabled,
  loading,
  icon,
  iconPosition = "left",
  className,
  type = "button",
}: ActionButtonProps) {
  const variantMap: Record<ActionButtonVariant, string> = {
    primary: "bg-[#D26E3D] text-white hover:bg-[#B85C2E] border-transparent shadow-sm",
    secondary: "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300",
    danger: "bg-rose-500 text-white hover:bg-rose-600 border-transparent shadow-sm",
    ghost: "bg-transparent text-gray-700 border-transparent hover:bg-gray-50",
  };

  const sizeMap: Record<ActionButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/30 disabled:opacity-50 disabled:cursor-not-allowed",
        variantMap[variant],
        sizeMap[size],
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {!loading && icon && iconPosition === "left" && icon}
      {children}
      {!loading && icon && iconPosition === "right" && icon}
    </button>
  );
}

// ============================================================================
// FORM FIELD
// ============================================================================

export interface FormFieldProps {
  label: string;
  value: string | number | undefined | null;
  onChange: (value: string) => void;
  type?: "text" | "number" | "email" | "tel" | "password";
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

/**
 * Standardized form field with label, input, and error display
 */
export function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  required = false,
  disabled = false,
  className,
  helperText,
}: FormFieldProps) {
  return (
    <label className={cn("space-y-1.5 text-sm block", className)}>
      <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      <input
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all",
          "focus:ring-2 focus:ring-[#D26E3D]/30",
          error
            ? "border-red-300 focus:border-red-500"
            : "border-gray-200 focus:border-[#D26E3D]",
          disabled && "bg-gray-50 cursor-not-allowed"
        )}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {error && <span className="text-xs text-red-500 flex items-center gap-1"><FileX className="h-3 w-3" />{error}</span>}
      {helperText && !error && <span className="text-xs text-gray-500">{helperText}</span>}
    </label>
  );
}

// ============================================================================
// DATA TABLE
// ============================================================================

export interface DataTableColumn {
  key: string;
  label: string;
  className?: string;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  children: React.ReactNode;
  className?: string;
  tableClassName?: string;
  stickyHeader?: boolean;
}

/**
 * Improved data table with consistent styling
 */
export function DataTable({ columns, children, className, tableClassName, stickyHeader = false }: DataTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm", className)}>
      <table className={cn("min-w-full text-sm", tableClassName)}>
        <thead className={cn(
          "bg-gray-50 text-xs font-semibold uppercase text-gray-600 border-b border-gray-200",
          stickyHeader && "sticky top-0 z-10"
        )}>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={cn("px-5 py-4 text-left", col.className)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

export interface ProgressBarProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  color?: "primary" | "success" | "warning" | "danger";
  showLabel?: boolean;
  label?: string;
  className?: string;
}

/**
 * Progress bar component
 */
export function ProgressBar({ value, max = 100, size = "md", color = "primary", showLabel, label, className }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorMap: Record<typeof color, string> = {
    primary: "bg-[#D26E3D]",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
  };

  const sizeMap = {
    sm: "h-1.5",
    md: "h-2",
  };

  return (
    <div className={cn("w-full", className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-700">{label || "Progress"}</span>
          <span className="text-xs text-gray-500">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn("w-full rounded-full bg-gray-100 overflow-hidden", sizeMap[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", colorMap[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// INFO CARD
// ============================================================================

export interface InfoCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  className?: string;
  onClick?: () => void;
}

/**
 * Clickable info card for dashboards
 */
export function InfoCard({ title, value, description, icon, trend, className, onClick }: InfoCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
          {trend && (
            <p className={cn(
              "text-xs font-medium mt-2 flex items-center gap-1",
              trend.positive ? "text-green-600" : "text-rose-600"
            )}>
              {trend.positive ? <Sparkles className="h-3 w-3" /> : null}
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DIVIDER
// ============================================================================

export interface DividerProps {
  text?: string;
  className?: string;
}

/**
 * Section divider with optional text
 */
export function Divider({ text, className }: DividerProps) {
  return (
    <div className={cn("relative flex items-center py-4", className)}>
      <div className="flex-grow border-t border-gray-200" />
      {text && (
        <span className="flex-shrink-0 mx-4 text-xs text-gray-500 uppercase tracking-wide font-medium">
          {text}
        </span>
      )}
      <div className="flex-grow border-t border-gray-200" />
    </div>
  );
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export {
  // Icons (re-export for convenience)
  Loader2,
  Search,
  Check,
  AlertTriangle,
  Info,
  Package,
  FileX,
  Sparkles,
};
