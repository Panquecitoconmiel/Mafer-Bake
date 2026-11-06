/** Logotipo de Mafer: solo la palabra, en tipografía redondeada. `tone="claro"` para fondos oscuros. */
export function Logo({ tone = "oscuro", tagline = false, size = "md", align = "center" }: { tone?: "oscuro" | "claro"; tagline?: boolean; size?: "md" | "lg"; align?: "center" | "start" }) {
  return (
    <span className={`inline-flex flex-col leading-none ${align === "start" ? "items-start" : "items-center"}`}>
      <span
        className={`font-display font-bold tracking-tight ${size === "lg" ? "text-[2.6rem]" : "text-[2rem]"} ${tone === "claro" ? "text-white" : "text-rosa-600"}`}
        style={{ textShadow: tone === "claro" ? undefined : "0 2px 0 var(--color-rosa-200)" }}
      >
        Mafer
      </span>
      {tagline && (
        <span className={`mt-1.5 text-[13px] font-semibold ${tone === "claro" ? "text-white/85" : "text-cafe-500"}`}>
          Velas artesanales
        </span>
      )}
    </span>
  );
}
