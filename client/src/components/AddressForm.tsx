import { useState, type FormEvent } from "react";
import { api, ApiError } from "../services/api";
import type { Address } from "../types";
import { Field, LoadingButton } from "./ui";

const EMPTY = { label: "Casa", recipient: "", phone: "", street: "", extNumber: "", intNumber: "", neighborhood: "", city: "", state: "", postalCode: "", references: "", isDefault: false };

export function AddressForm({ initial, onSaved, onCancel }: { initial?: Address; onSaved: (a: Address) => void; onCancel?: () => void }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial, intNumber: initial?.intNumber ?? "", references: initial?.references ?? "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const bind = (k: keyof typeof EMPTY) => ({
    value: String(form[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value }),
    error: errors[k]?.[0],
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { id: _id, ...body } = form as typeof form & { id?: string };
      onSaved(await api.saveAddress(body, initial?.id));
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Nombre de la dirección" placeholder="Casa, Oficina…" required {...bind("label")} />
      <Field label="Quién recibe" autoComplete="name" required {...bind("recipient")} />
      <Field label="Teléfono" type="tel" autoComplete="tel" required {...bind("phone")} />
      <Field label="Código postal" inputMode="numeric" maxLength={5} autoComplete="postal-code" required {...bind("postalCode")} />
      <div className="sm:col-span-2">
        <Field label="Calle" autoComplete="address-line1" required {...bind("street")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Núm. exterior" required {...bind("extNumber")} />
        <Field label="Núm. interior" {...bind("intNumber")} />
      </div>
      <Field label="Colonia" required {...bind("neighborhood")} />
      <Field label="Ciudad o alcaldía" autoComplete="address-level2" required {...bind("city")} />
      <Field label="Estado" autoComplete="address-level1" required {...bind("state")} />
      <div className="sm:col-span-2">
        <Field label="Referencias" placeholder="Entre calles, color de fachada…" {...bind("references")} />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
        <input type="checkbox" className="size-5 accent-rosa-600" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
        Usar como dirección predeterminada
      </label>
      {error && <p className="error-campo sm:col-span-2" role="alert">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <LoadingButton loading={saving} type="submit">Guardar dirección</LoadingButton>
        {onCancel && <button type="button" className="btn-fantasma" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}

export const addressLine = (a: Pick<Address, "street" | "extNumber" | "intNumber" | "neighborhood" | "city" | "state" | "postalCode">) =>
  `${a.street} ${a.extNumber}${a.intNumber ? ` int. ${a.intNumber}` : ""}, ${a.neighborhood}, ${a.city}, ${a.state}, C.P. ${a.postalCode}`;
