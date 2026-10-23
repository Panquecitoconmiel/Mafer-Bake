import { ChevronLeft, ChevronRight, CircleAlert, Loader2, Minus, Plus } from "lucide-react";
import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { money, ORDER_STATUS, PAYMENT_STATUS } from "../lib/format";
import type { OrderStatus, PaymentStatus } from "../types";

export function Spinner({ label = "Cargando…", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-10 text-sm text-cafe-500 ${className}`} role="status">
      <Loader2 className="size-5 animate-spin text-rosa-600" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-crema-300 bg-crema-50 px-6 py-12 text-center">
      {icon && <div className="text-empolvado">{icon}</div>}
      <h3 className="text-xl">{title}</h3>
      {children && <div className="max-w-md text-sm text-cafe-500">{children}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] bg-rosa-50 px-6 py-10 text-center" role="alert">
      <CircleAlert className="size-7 text-error" />
      <p className="text-sm font-semibold text-cafe-700">{message}</p>
      {onRetry && (
        <button className="btn-secundario btn-sm" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Alert({ kind = "info", children }: { kind?: "info" | "error" | "aviso" | "exito"; children: ReactNode }) {
  const styles = {
    info: "bg-crema-200 text-cafe-700",
    error: "bg-rosa-100 text-error",
    aviso: "bg-[#fbf0dc] text-aviso",
    exito: "bg-[#e6f2ea] text-exito",
  }[kind];
  return (
    <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${styles}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function Price({ cents, originalCents, className = "" }: { cents: number; originalCents?: number | null; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-bold text-cafe-900">{money(cents)}</span>
      {originalCents != null && originalCents > cents && (
        <span className="text-sm text-cafe-400 line-through" aria-label={`Precio anterior ${money(originalCents)}`}>
          {money(originalCents)}
        </span>
      )}
    </span>
  );
}

type FieldProps = { label: string; error?: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>;
export function Field({ label, error, hint, id, ...props }: FieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div>
      <label htmlFor={fid} className="etiqueta">
        {label}
        {props.required && <span className="text-rosa-600"> *</span>}
      </label>
      <input id={fid} className="campo" aria-invalid={!!error} aria-describedby={error ? `${fid}-e` : hint ? `${fid}-h` : undefined} {...props} />
      {error ? <p id={`${fid}-e`} className="error-campo">{error}</p> : hint && <p id={`${fid}-h`} className="ayuda">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, error, hint, id, ...props }: { label: string; error?: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div>
      <label htmlFor={fid} className="etiqueta">{label}</label>
      <textarea id={fid} className="campo" aria-invalid={!!error} {...props} />
      {error ? <p className="error-campo">{error}</p> : hint && <p className="ayuda">{hint}</p>}
    </div>
  );
}

export function Select({ label, error, children, id, ...props }: { label: string; error?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div>
      <label htmlFor={fid} className="etiqueta">{label}</label>
      <select id={fid} className="campo" aria-invalid={!!error} {...props}>
        {children}
      </select>
      {error && <p className="error-campo">{error}</p>}
    </div>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, disabled, label = "Cantidad" }: { value: number; onChange: (n: number) => void; min?: number; max?: number; disabled?: boolean; label?: string }) {
  return (
    <div className="inline-flex items-center rounded-full border border-crema-300 bg-white" role="group" aria-label={label}>
      <button type="button" className="grid size-10 place-items-center rounded-full text-cafe-700 hover:bg-crema-100 disabled:opacity-40" onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Disminuir cantidad">
        <Minus className="size-4" />
      </button>
      <span className="w-8 text-center text-sm font-bold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="grid size-10 place-items-center rounded-full text-cafe-700 hover:bg-crema-100 disabled:opacity-40" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Aumentar cantidad">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Paginación">
      <button className="btn-secundario btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="size-4" /> Anterior
      </button>
      <span className="text-sm text-cafe-500">Página {page} de {totalPages}</span>
      <button className="btn-secundario btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Siguiente <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

export function LoadingButton({ loading, children, className = "btn-primario", ...props }: { loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={className} disabled={loading || props.disabled} aria-busy={loading} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Diálogo de confirmación accesible basado en <dialog>. */
export function ConfirmDialog({ open, title, children, confirmLabel = "Confirmar", danger, loading, onConfirm, onClose }: {
  open: boolean; title: string; children?: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(92vw,28rem)] rounded-[var(--radius-card)] bg-white p-0 text-cafe-700 shadow-[var(--shadow-elevada)] backdrop:bg-cafe-900/40">
      <div className="p-6">
        <h2 className="text-xl">{title}</h2>
        {children && <div className="mt-3 text-sm text-cafe-500">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-fantasma" onClick={onClose} disabled={loading}>Cancelar</button>
          <LoadingButton className={danger ? "btn-peligro" : "btn-primario"} loading={loading} onClick={onConfirm}>{confirmLabel}</LoadingButton>
        </div>
      </div>
    </dialog>
  );
}

const ORDER_TONE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-[#fbf0dc] text-aviso",
  CONFIRMED: "bg-rosa-100 text-rosa-700",
  IN_PREPARATION: "bg-crema-200 text-cafe-700",
  READY: "bg-[#e6f2ea] text-exito",
  OUT_FOR_DELIVERY: "bg-[#e6eef6] text-[#2f5a85]",
  DELIVERED: "bg-[#e6f2ea] text-exito",
  CANCELLED: "bg-crema-200 text-cafe-500",
};
const PAY_TONE: Record<PaymentStatus, string> = {
  PENDING: "bg-[#fbf0dc] text-aviso",
  PAID: "bg-[#e6f2ea] text-exito",
  FAILED: "bg-rosa-100 text-error",
  CANCELLED: "bg-crema-200 text-cafe-500",
  PARTIALLY_REFUNDED: "bg-[#e6eef6] text-[#2f5a85]",
  REFUNDED: "bg-[#e6eef6] text-[#2f5a85]",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${ORDER_TONE[status]}`}>{ORDER_STATUS[status]}</span>;
}
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${PAY_TONE[status]}`}>{PAYMENT_STATUS[status]}</span>;
}

export function ProductImage({ src, alt, className = "" }: { src?: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`grid place-items-center bg-rosa-50 text-empolvado ${className}`} aria-label={alt} role="img">
        <svg viewBox="0 0 48 48" className="size-1/3" aria-hidden="true"><path d="M12 26h24l-3 12H15zM10 25c-1-6 6-9 10-7 2-5 10-5 12 0 4-1 8 3 6 7z" fill="currentColor" /></svg>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="mb-4 text-xs text-cafe-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {it.to ? <Link to={it.to} className="hover:text-rosa-600 hover:underline">{it.label}</Link> : <span aria-current="page" className="font-semibold text-cafe-700">{it.label}</span>}
            {i < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
