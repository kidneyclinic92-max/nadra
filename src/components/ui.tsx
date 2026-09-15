import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------- layout */

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------- buttons */

const BUTTON_VARIANTS = {
  primary:
    "bg-teal-600 text-white hover:bg-teal-700 focus-visible:outline-teal-600 disabled:bg-teal-600/50",
  secondary:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400 disabled:text-slate-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600 disabled:bg-red-600/50",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400",
} as const;

const BUTTON_SIZES = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
} as const;

type ButtonStyleProps = {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleProps & { className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:cursor-not-allowed",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & ButtonStyleProps) {
  return (
    <button {...props} className={buttonClasses({ variant, size, className })} />
  );
}

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & ButtonStyleProps) {
  return <Link {...props} className={buttonClasses({ variant, size, className })} />;
}

/* ---------------------------------------------------------------- badges */

const BADGE_TONES = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function toneForApplicationStatus(status: string): BadgeTone {
  switch (status) {
    case "SHORTLISTED":
      return "success";
    case "REJECTED":
      return "danger";
    case "UNDER_REVIEW":
      return "warning";
    case "WITHDRAWN":
      return "neutral";
    default:
      return "info";
  }
}

export function toneForJobStatus(status: string): BadgeTone {
  switch (status) {
    case "OPEN":
      return "success";
    case "CLOSED":
      return "danger";
    default:
      return "neutral";
  }
}

/* ---------------------------------------------------------------- alerts */

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children?: ReactNode;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
  } as const;

  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- forms */

export function Field({
  label,
  name,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  name?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  error,
  className,
  ...props
}: ComponentProps<"input"> & { error?: string }) {
  return (
    <input
      {...props}
      id={props.id ?? props.name}
      aria-invalid={error ? true : undefined}
      className={cn("field-control", error && "field-control-error", className)}
    />
  );
}

export function Textarea({
  error,
  className,
  ...props
}: ComponentProps<"textarea"> & { error?: string }) {
  return (
    <textarea
      {...props}
      id={props.id ?? props.name}
      aria-invalid={error ? true : undefined}
      className={cn("field-control", error && "field-control-error", className)}
    />
  );
}

export function Select({
  error,
  options,
  placeholder,
  className,
  ...props
}: Omit<ComponentProps<"select">, "children"> & {
  error?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      {...props}
      id={props.id ?? props.name}
      aria-invalid={error ? true : undefined}
      className={cn("field-control", error && "field-control-error", className)}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; description?: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5",
        className,
      )}
    >
      <input
        {...props}
        type="checkbox"
        className="mt-0.5 size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
      />
      <span>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {description ? (
          <span className="block text-xs text-slate-500">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export function FormGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  const map = {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
  } as const;
  return <div className={cn("grid grid-cols-1 gap-4", map[columns])}>{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="border-b border-slate-200 pb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
      {children}
    </h3>
  );
}

/* ------------------------------------------------------------ data views */

export function DescriptionList({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-sm break-words text-slate-900">
            {item.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: BadgeTone;
}) {
  const tones = {
    neutral: "text-slate-900",
    info: "text-sky-700",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-red-700",
  } as const;

  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-semibold", tones[tone])}>{value}</p>
    </Card>
  );
}
