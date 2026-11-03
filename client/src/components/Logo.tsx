/** Logotipo de Mafer: solo la palabra, en tipografía redondeada. `tone="claro"` para fondos oscuros. */
export function Logo({ tone = "oscuro", tagline = false, size = "md" }: { tone?: "oscuro" | "claro"; tagline?: boolean; size?: "md" | "lg" }) {
  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span
        className={`font-display font-bold tracking-tight ${size === "lg" ? "text-[2.6rem]" : "text-[2rem]"} ${tone === "claro" ? "text-white" : "text-rosa-600"}`}
        style={{ textShadow: tone === "claro" ? undefined : "0 2px 0 rgb(246 205 211 / 0.9)" }}
      >
        Mafer
      </span>
      {tagline && (
        <span className={`mt-1.5 text-[10px] font-extrabold tracking-[0.24em] uppercase ${tone === "claro" ? "text-white/85" : "text-cafe-500"}`}>
          Pastelería · Repostería
        </span>
      )}
    </span>
  );
}
