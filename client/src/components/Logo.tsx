/** Isotipo de Mafer: un cupcake de líneas suaves con una cereza. */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#fbe6eb" />
      <path d="M14.5 26h19l-2.6 11.2a2.4 2.4 0 0 1-2.3 1.8h-9.2a2.4 2.4 0 0 1-2.3-1.8z" fill="#7f5b4c" />
      <path d="M19 26.5l1.2 12M24 26.5V39M29 26.5l-1.2 12" stroke="#a1806f" strokeWidth="1.1" strokeLinecap="round" />
      <path
        d="M13 25.6c-1.5-2.9.5-5.6 3.3-5.3-.4-3.6 3-6 6.2-4.3 1.6-2.4 5.4-2.3 6.6.6 3.1-.7 5.6 2.2 4.4 5 2.4.8 2.8 3.6 1.4 4.6z"
        fill="#f6cad3"
        stroke="#e3a7b4"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M17.5 22.4c2.3.9 4.3.8 6.2-.2 1.8-.9 3.9-.9 6 .1" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".75" />
      <circle cx="26.5" cy="12.6" r="2.6" fill="#b04a64" />
      <path d="M27.2 10.2c.6-1.6 1.7-2.5 3.2-2.8" stroke="#5b3a2e" strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Logotipo tipográfico completo. `tone="claro"` para fondos oscuros. */
export function Logo({ tone = "oscuro", tagline = false }: { tone?: "oscuro" | "claro"; tagline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[28px] font-medium italic tracking-tight ${tone === "claro" ? "text-crema-50" : "text-cafe-900"}`}>
          Mafer
        </span>
        {tagline && (
          <span className={`mt-1 text-[10px] font-bold tracking-[0.22em] uppercase ${tone === "claro" ? "text-rosa-200" : "text-rosa-600"}`}>
            Pastelería · Repostería
          </span>
        )}
      </span>
    </span>
  );
}
