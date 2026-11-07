import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Alert, Field, LoadingButton, Spinner, TextArea } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../hooks/useShop";
import { PageHeader, Table } from "../../layouts/AdminLayout";
import { longDate, parseMoney } from "../../lib/format";
import { adminApi, ApiError } from "../../services/api";

interface Settings {
  storeName: string; slogan: string; contactEmail: string | null; contactPhone: string | null; whatsapp: string | null; instagramUrl: string | null; facebookUrl: string | null;
  pickupAddress: string | null; businessHours: string | null; pickupEnabled: boolean; deliveryEnabled: boolean; deliveryFeeCents: number | null; freeDeliveryMinCents: number | null;
  deliveryCoverage: string | null; minLeadHours: number; maxAdvanceDays: number; closedWeekdays: number[]; pricesIncludeTax: boolean; taxRatePercent: string | null; cancellationPolicy: string | null;
}
interface Slot { id: string; label: string; startTime: string; endTime: string; capacity: number; isActive: boolean; sortOrder: number }
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const pesos = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));

export default function AdminSettings() {
  const qc = useQueryClient();
  const notify = useToast();
  const { data } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => adminApi.get<{ settings: Settings }>("/settings").then((r) => r.settings) });
  const { data: delivery } = useQuery({ queryKey: ["admin", "delivery"], queryFn: () => adminApi.get<{ slots: Slot[]; blockedDates: { id: string; date: string; reason: string | null }[] }>("/delivery") });
  const [s, setS] = useState<Settings | null>(null);
  const [fee, setFee] = useState("");
  const [freeMin, setFreeMin] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  useEffect(() => { if (data) { setS(data); setFee(pesos(data.deliveryFeeCents)); setFreeMin(pesos(data.freeDeliveryMinCents)); } }, [data]);

  const save = useMutation({
    mutationFn: () => {
      // Solo se envían los campos editables (el servidor rechaza campos internos como id o updatedAt).
      const { storeName, slogan, contactEmail, contactPhone, whatsapp, instagramUrl, facebookUrl, pickupAddress, businessHours,
        pickupEnabled, deliveryEnabled, deliveryCoverage, minLeadHours, maxAdvanceDays, closedWeekdays, pricesIncludeTax, cancellationPolicy } = s!;
      return adminApi.send("PUT", "/settings", {
        storeName, slogan, contactEmail, contactPhone, whatsapp, instagramUrl, facebookUrl, pickupAddress, businessHours,
        pickupEnabled, deliveryEnabled, deliveryCoverage, minLeadHours, maxAdvanceDays, closedWeekdays, pricesIncludeTax, cancellationPolicy,
        deliveryFeeCents: fee ? parseMoney(fee) : null,
        freeDeliveryMinCents: freeMin ? parseMoney(freeMin) : null,
        taxRatePercent: s!.taxRatePercent ? Number(s!.taxRatePercent) : null,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "settings"] }); qc.invalidateQueries({ queryKey: ["store"] }); setErrors({}); notify("Configuración guardada."); },
    onError: (e) => { setErrors(e instanceof ApiError ? e.fieldErrors : {}); notify(errorMessage(e), "error"); },
  });

  const [slot, setSlot] = useState<Partial<Slot> | null>(null);
  const saveSlot = useMutation({
    mutationFn: () => {
      const body = { label: slot!.label || `${slot!.startTime} – ${slot!.endTime}`, startTime: slot!.startTime, endTime: slot!.endTime, capacity: Number(slot!.capacity), isActive: slot!.isActive ?? true, sortOrder: Number(slot!.sortOrder ?? 0) };
      return slot!.id ? adminApi.send("PUT", `/delivery/slots/${slot!.id}`, body) : adminApi.send("POST", "/delivery/slots", body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "delivery"] }); setSlot(null); notify("Horario guardado."); },
    onError: (e) => notify(errorMessage(e), "error"),
  });
  const [blocked, setBlocked] = useState({ date: "", reason: "" });
  const addBlocked = useMutation({
    mutationFn: () => adminApi.send("POST", "/delivery/blocked-dates", { date: blocked.date, reason: blocked.reason || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "delivery"] }); setBlocked({ date: "", reason: "" }); notify("Día bloqueado."); },
    onError: (e) => notify(errorMessage(e), "error"),
  });
  const removeBlocked = useMutation({
    mutationFn: (id: string) => adminApi.send("DELETE", `/delivery/blocked-dates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "delivery"] }),
  });

  if (!s) return <Spinner />;
  const text = (k: keyof Settings) => ({ value: (s[k] as string | null) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setS({ ...s, [k]: e.target.value }), error: errors[k]?.[0] });
  const num = (k: "minLeadHours" | "maxAdvanceDays") => ({ value: String(s[k]), onChange: (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) || 0 }) });

  return (
    <>
      <PageHeader title="Configuración" subtitle="Estos datos se muestran en la tienda. Lo que dejes vacío no se publica." />
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="grid gap-6 xl:grid-cols-2">
        <section className="tarjeta space-y-4 p-5">
          <h2 className="text-lg">Información de la tienda</h2>
          <Field label="Nombre comercial" required {...text("storeName")} />
          <Field label="Eslogan" {...text("slogan")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo de contacto" type="email" {...text("contactEmail")} />
            <Field label="Teléfono" {...text("contactPhone")} />
            <Field label="WhatsApp" placeholder="52 55 0000 0000" {...text("whatsapp")} />
            <Field label="Instagram (URL)" {...text("instagramUrl")} />
            <Field label="Facebook (URL)" {...text("facebookUrl")} />
          </div>
          <Field label="Dirección de recogida" {...text("pickupAddress")} />
          <Field label="Horario de atención" placeholder="Lun a sáb de 9:00 a 19:00" {...text("businessHours")} />
        </section>

        <section className="tarjeta space-y-4 p-5">
          <h2 className="text-lg">Entregas</h2>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5 accent-rosa-600" checked={s.pickupEnabled} onChange={(e) => setS({ ...s, pickupEnabled: e.target.checked })} /> Recogida en tienda</label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5 accent-rosa-600" checked={s.deliveryEnabled} onChange={(e) => setS({ ...s, deliveryEnabled: e.target.checked })} /> Entrega a domicilio</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Costo de envío ($)" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} error={errors.deliveryFeeCents?.[0]} />
            <Field label="Envío gratis desde ($)" inputMode="decimal" value={freeMin} onChange={(e) => setFreeMin(e.target.value)} hint="Opcional" />
          </div>
          <TextArea label="Zonas de cobertura" rows={2} {...text("deliveryCoverage")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Anticipación mínima (horas)" inputMode="numeric" {...num("minLeadHours")} />
            <Field label="Máximo de días por adelantado" inputMode="numeric" {...num("maxAdvanceDays")} />
          </div>
          <fieldset>
            <legend className="etiqueta">Días sin servicio</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d, i) => (
                <button type="button" key={d} className="chip" aria-pressed={s.closedWeekdays.includes(i)} onClick={() => setS({ ...s, closedWeekdays: s.closedWeekdays.includes(i) ? s.closedWeekdays.filter((x) => x !== i) : [...s.closedWeekdays, i] })}>{d}</button>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="tarjeta space-y-4 p-5">
          <h2 className="text-lg">Impuestos y políticas</h2>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5 accent-rosa-600" checked={s.pricesIncludeTax} onChange={(e) => setS({ ...s, pricesIncludeTax: e.target.checked })} /> Los precios ya incluyen impuestos</label>
          {!s.pricesIncludeTax && <Field label="Tasa de impuesto (%)" inputMode="decimal" {...text("taxRatePercent")} hint="Confírmala con tu contador." />}
          <TextArea label="Política de cancelación" rows={4} {...text("cancellationPolicy")} />
        </section>

        <div className="space-y-3 xl:col-span-2">
          {Object.keys(errors).length > 0 && <Alert kind="error">Revisa los campos marcados.</Alert>}
          <LoadingButton type="submit" loading={save.isPending}>Guardar configuración</LoadingButton>
        </div>
      </form>

      <h2 className="mt-10 mb-3 text-xl">Horarios de entrega y recogida</h2>
      {slot && (
        <form className="tarjeta mb-4 grid gap-4 p-5 sm:grid-cols-5" onSubmit={(e) => { e.preventDefault(); saveSlot.mutate(); }}>
          <Field label="Inicio" type="time" required value={slot.startTime ?? ""} onChange={(e) => setSlot({ ...slot, startTime: e.target.value })} />
          <Field label="Fin" type="time" required value={slot.endTime ?? ""} onChange={(e) => setSlot({ ...slot, endTime: e.target.value })} />
          <Field label="Etiqueta" placeholder="10:00 – 13:00" value={slot.label ?? ""} onChange={(e) => setSlot({ ...slot, label: e.target.value })} />
          <Field label="Pedidos máx. por día" inputMode="numeric" required value={String(slot.capacity ?? "")} onChange={(e) => setSlot({ ...slot, capacity: Number(e.target.value) })} />
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input type="checkbox" className="accent-rosa-600" checked={slot.isActive ?? true} onChange={(e) => setSlot({ ...slot, isActive: e.target.checked })} /> Activo</label>
          <div className="flex gap-2 sm:col-span-5"><LoadingButton type="submit" loading={saveSlot.isPending}>Guardar horario</LoadingButton><button type="button" className="btn-fantasma" onClick={() => setSlot(null)}>Cancelar</button></div>
        </form>
      )}
      <Table head={["Horario", "Capacidad diaria", "Estado", ""]} empty={!delivery?.slots.length}>
        {delivery?.slots.map((sl) => (
          <tr key={sl.id}>
            <td className="px-4 py-3 font-semibold">{sl.label}</td>
            <td className="px-4 py-3">{sl.capacity} pedidos</td>
            <td className="px-4 py-3">{sl.isActive ? "Activo" : <span className="text-cafe-400">Inactivo</span>}</td>
            <td className="px-4 py-3 text-right"><button className="btn-secundario btn-sm" onClick={() => setSlot(sl)}>Editar</button></td>
          </tr>
        ))}
      </Table>
      {!slot && <button className="btn-secundario btn-sm mt-3" onClick={() => setSlot({ isActive: true, capacity: 5 })}>Agregar horario</button>}

      <h2 className="mt-10 mb-3 text-xl">Días bloqueados</h2>
      <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); addBlocked.mutate(); }}>
        <div><Field label="Fecha" type="date" required value={blocked.date} onChange={(e) => setBlocked({ ...blocked, date: e.target.value })} /></div>
        <div className="min-w-56 flex-1"><Field label="Motivo" placeholder="Vacaciones, día festivo…" value={blocked.reason} onChange={(e) => setBlocked({ ...blocked, reason: e.target.value })} /></div>
        <LoadingButton type="submit" loading={addBlocked.isPending} className="btn-secundario">Bloquear día</LoadingButton>
      </form>
      <ul className="space-y-2">
        {delivery?.blockedDates.map((b) => (
          <li key={b.id} className="tarjeta flex items-center justify-between px-4 py-3 text-sm">
            <span><strong className="capitalize">{longDate(b.date.slice(0, 10))}</strong>{b.reason && ` · ${b.reason}`}</span>
            <button className="btn-fantasma btn-sm text-error" onClick={() => removeBlocked.mutate(b.id)} aria-label="Quitar día bloqueado"><Trash2 className="size-4" /></button>
          </li>
        ))}
        {!delivery?.blockedDates.length && <p className="text-sm text-cafe-500">Sin días bloqueados próximos.</p>}
      </ul>
    </>
  );
}
