import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, ConfirmDialog, ErrorState, Field, LoadingButton, Pagination, ProductImage, Select, Spinner, TextArea } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../hooks/useShop";
import { PageHeader, Table } from "../../layouts/AdminLayout";
import { money, parseMoney } from "../../lib/format";
import { adminApi, ApiError } from "../../services/api";
import type { Paginated } from "../../types";

const STATUS = { DRAFT: "Borrador", PUBLISHED: "Publicado", ARCHIVED: "Archivado" } as const;
type Status = keyof typeof STATUS;
interface Row { id: string; name: string; slug: string; priceCents: number; salePriceCents: number | null; status: Status; inventoryMode: string; stock: number; isAvailable: boolean; category: { name: string }; images: { url: string }[] }

export function AdminProducts() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const status = params.get("estado") ?? "";
  const page = Number(params.get("pagina") ?? 1);
  const qc = useQueryClient();
  const notify = useToast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "products", params.toString()],
    queryFn: () => adminApi.get<Paginated<Row>>("/products", { q: params.get("q") ?? undefined, status: status || undefined, page }),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, s }: { id: string; s: Status }) => adminApi.send("PATCH", `/products/${id}/status`, { status: s }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "products"] }); notify("Estado actualizado."); },
    onError: (e) => notify(errorMessage(e), "error"),
  });

  return (
    <>
      <PageHeader title="Productos" subtitle="Administra el catálogo, precios y disponibilidad." actions={<Link to="/admin/productos/nuevo" className="btn-primario"><Plus className="size-4" /> Nuevo producto</Link>} />
      <form className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setParams(q ? { q, ...(status && { estado: status }) } : status ? { estado: status } : {}); }}>
        <label className="sr-only" htmlFor="buscar-prod">Buscar</label>
        <input id="buscar-prod" className="campo max-w-xs" placeholder="Buscar por nombre…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filtrar por estado" className="campo w-auto" value={status} onChange={(e) => setParams({ ...(params.get("q") && { q: params.get("q")! }), ...(e.target.value && { estado: e.target.value }) })}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-secundario">Buscar</button>
      </form>
      {isLoading ? <Spinner /> : isError || !data ? <ErrorState message="No pudimos cargar los productos." onRetry={refetch} /> : (
        <>
          <Table head={["Producto", "Categoría", "Precio", "Inventario", "Estado", ""]} empty={!data.items.length}>
            {data.items.map((p) => (
              <tr key={p.id} className="hover:bg-crema-50">
                <td className="px-4 py-3">
                  <Link to={`/admin/productos/${p.id}`} className="flex items-center gap-3 font-semibold hover:text-rosa-600">
                    <ProductImage src={p.images[0]?.url} alt="" className="size-11 shrink-0 rounded-lg" /> {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-cafe-500">{p.category.name}</td>
                <td className="px-4 py-3">{p.salePriceCents ? <><span className="font-semibold">{money(p.salePriceCents)}</span> <s className="text-cafe-400">{money(p.priceCents)}</s></> : money(p.priceCents)}</td>
                <td className="px-4 py-3">{p.inventoryMode === "TRACKED" ? `${p.stock} pzs` : "Bajo pedido"}{!p.isAvailable && <span className="ml-1 text-xs text-error">(no disponible)</span>}</td>
                <td className="px-4 py-3">
                  <select aria-label={`Estado de ${p.name}`} className="campo min-h-9 w-auto py-0 text-xs" value={p.status} onChange={(e) => setStatus.mutate({ id: p.id, s: e.target.value as Status })}>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-right"><Link to={`/admin/productos/${p.id}`} className="btn-secundario btn-sm">Editar</Link></td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => setParams({ ...Object.fromEntries(params), pagina: String(p) })} />
        </>
      )}
    </>
  );
}

// ───────── Formulario ─────────

interface OptionValueForm { id?: string; label: string; price: string; isActive: boolean }
interface OptionForm { id?: string; name: string; type: "SINGLE" | "MULTIPLE" | "TEXT"; isRequired: boolean; isActive: boolean; maxLength: string; values: OptionValueForm[] }
interface VariantForm { id?: string; name: string; price: string; isActive: boolean }
interface ProductApi {
  id: string; name: string; slug: string; shortDescription: string; description: string; priceCents: number; salePriceCents: number | null; categoryId: string;
  isFeatured: boolean; status: Status; isAvailable: boolean; inventoryMode: "TRACKED" | "MADE_TO_ORDER"; stock: number; lowStockThreshold: number; prepTimeHours: number;
  images: { url: string; alt: string }[];
  variants: { id: string; name: string; priceDeltaCents: number; isActive: boolean }[];
  options: { id: string; name: string; type: OptionForm["type"]; isRequired: boolean; isActive: boolean; maxLength: number | null; values: { id: string; label: string; priceDeltaCents: number; isActive: boolean }[] }[];
}

const pesos = (c: number) => (c / 100).toFixed(2);
const blank = {
  name: "", slug: "", shortDescription: "", description: "", price: "", salePrice: "", categoryId: "", isFeatured: false, status: "DRAFT" as Status,
  isAvailable: true, inventoryMode: "MADE_TO_ORDER" as "TRACKED" | "MADE_TO_ORDER", lowStockThreshold: "5", prepTimeHours: "24",
};

export function AdminProductForm() {
  const { id } = useParams();
  const isNew = !id || id === "nuevo";
  const navigate = useNavigate();
  const notify = useToast();
  const qc = useQueryClient();
  const { data: categories } = useQuery({ queryKey: ["admin", "categories"], queryFn: () => adminApi.get<{ items: { id: string; name: string }[] }>("/categories").then((r) => r.items) });
  const { data: product, isLoading } = useQuery({ queryKey: ["admin", "product", id], queryFn: () => adminApi.get<{ product: ProductApi }>(`/products/${id}`).then((r) => r.product), enabled: !isNew });

  const [f, setF] = useState(blank);
  const [images, setImages] = useState<{ url: string; alt: string }[]>([]);
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [options, setOptions] = useState<OptionForm[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!product) return;
    setF({
      name: product.name, slug: product.slug, shortDescription: product.shortDescription, description: product.description,
      price: pesos(product.priceCents), salePrice: product.salePriceCents != null ? pesos(product.salePriceCents) : "", categoryId: product.categoryId,
      isFeatured: product.isFeatured, status: product.status, isAvailable: product.isAvailable, inventoryMode: product.inventoryMode,
      lowStockThreshold: String(product.lowStockThreshold), prepTimeHours: String(product.prepTimeHours),
    });
    setImages(product.images.map((i) => ({ url: i.url, alt: i.alt })));
    setVariants(product.variants.map((v) => ({ id: v.id, name: v.name, price: pesos(v.priceDeltaCents), isActive: v.isActive })));
    setOptions(product.options.map((o) => ({ id: o.id, name: o.name, type: o.type, isRequired: o.isRequired, isActive: o.isActive, maxLength: String(o.maxLength ?? 120), values: o.values.map((v) => ({ id: v.id, label: v.label, price: pesos(v.priceDeltaCents), isActive: v.isActive })) })));
  }, [product]);
  useEffect(() => {
    if (isNew && categories?.length && !f.categoryId) setF((x) => ({ ...x, categoryId: categories[0].id }));
  }, [categories, isNew, f.categoryId]);

  const save = useMutation({
    mutationFn: () => {
      const price = parseMoney(f.price);
      if (price == null || price <= 0) throw new ApiError(400, "Indica un precio válido.");
      const body = {
        name: f.name, ...(f.slug && { slug: f.slug }), shortDescription: f.shortDescription, description: f.description,
        priceCents: price, salePriceCents: f.salePrice ? parseMoney(f.salePrice) : null, categoryId: f.categoryId, isFeatured: f.isFeatured, status: f.status,
        isAvailable: f.isAvailable, inventoryMode: f.inventoryMode, lowStockThreshold: Number(f.lowStockThreshold) || 0, prepTimeHours: Number(f.prepTimeHours) || 0,
        images,
        variants: variants.map((v) => ({ ...(v.id && { id: v.id }), name: v.name, priceDeltaCents: Math.round(Number(v.price || 0) * 100), isActive: v.isActive })),
        options: options.map((o) => ({
          ...(o.id && { id: o.id }), name: o.name, type: o.type, isRequired: o.isRequired, isActive: o.isActive, maxLength: o.type === "TEXT" ? Number(o.maxLength) || 120 : null,
          values: o.type === "TEXT" ? [] : o.values.map((v) => ({ ...(v.id && { id: v.id }), label: v.label, priceDeltaCents: Math.round(Number(v.price || 0) * 100), isActive: v.isActive })),
        })),
      };
      return isNew ? adminApi.send<{ product: ProductApi }>("POST", "/products", body) : adminApi.send<{ product: ProductApi }>("PUT", `/products/${id}`, body);
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      notify("Producto guardado.");
      if (isNew) navigate(`/admin/productos/${r.product.id}`, { replace: true });
      setErrors({});
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fieldErrors : {});
      notify(errorMessage(e), "error");
    },
  });
  const remove = useMutation({
    mutationFn: () => adminApi.send<{ archived: boolean }>("DELETE", `/products/${id}`),
    onSuccess: (r) => { notify(r.archived ? "El producto tiene pedidos: se archivó para conservar el historial." : "Producto eliminado."); qc.invalidateQueries({ queryKey: ["admin"] }); navigate("/admin/productos"); },
    onError: (e) => notify(errorMessage(e), "error"),
  });

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return notify("La imagen supera 5 MB.", "error");
    setUploading(true);
    try {
      const { url } = await adminApi.upload(file);
      setImages((imgs) => [...imgs, { url, alt: f.name }]);
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setUploading(false);
    }
  };
  const move = <T,>(arr: T[], i: number, d: number) => { const a = [...arr]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); return a; };
  const bind = (k: keyof typeof blank) => ({ value: String(f[k]), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value }) });
  const err = (k: string) => errors[k]?.[0];

  if (!isNew && isLoading) return <Spinner />;
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}>
      <PageHeader
        title={isNew ? "Nuevo producto" : f.name || "Editar producto"}
        subtitle={isNew ? "Los productos nuevos se crean como borrador hasta que los publiques." : undefined}
        actions={<>
          <Link to="/admin/productos" className="btn-fantasma">Volver</Link>
          {!isNew && <button type="button" className="btn-fantasma text-error" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" /> Eliminar</button>}
          <LoadingButton type="submit" loading={save.isPending}>Guardar</LoadingButton>
        </>}
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="tarjeta space-y-4 p-5">
            <h2 className="text-lg">Información</h2>
            <Field label="Nombre" required {...bind("name")} error={err("name")} />
            <Field label="Slug (URL)" placeholder="se genera desde el nombre" {...bind("slug")} error={err("slug")} hint="Solo minúsculas, números y guiones." />
            <Field label="Descripción breve" required maxLength={200} {...bind("shortDescription")} error={err("shortDescription")} />
            <TextArea label="Descripción detallada" required rows={5} {...bind("description")} error={err("description")} />
          </section>

          <section className="tarjeta space-y-4 p-5">
            <h2 className="text-lg">Imágenes</h2>
            <ul className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <li key={img.url + i} className="relative">
                  <ProductImage src={img.url} alt={img.alt} className="size-24 rounded-xl" />
                  <div className="absolute inset-x-1 bottom-1 flex justify-between">
                    <button type="button" className="grid size-7 place-items-center rounded-full bg-white/90 disabled:opacity-40" disabled={i === 0} onClick={() => setImages(move(images, i, -1))} aria-label="Mover antes"><ArrowUp className="size-3.5 -rotate-90" /></button>
                    <button type="button" className="grid size-7 place-items-center rounded-full bg-white/90 text-error" onClick={() => setImages(images.filter((_, k) => k !== i))} aria-label="Quitar imagen"><Trash2 className="size-3.5" /></button>
                  </div>
                  {i === 0 && <span className="absolute top-1 left-1 rounded-full bg-cafe-900 px-2 text-[10px] font-bold text-white">Principal</span>}
                </li>
              ))}
              <li>
                <label className={`grid size-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-crema-300 text-cafe-400 hover:border-empolvado ${uploading ? "opacity-50" : ""}`}>
                  <ImagePlus className="size-6" />
                  <span className="sr-only">Subir imagen</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file); e.target.value = ""; }} />
                </label>
              </li>
            </ul>
            <p className="ayuda">JPG, PNG o WEBP de hasta 5 MB. También puedes pegar una URL https.</p>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="img-url">URL de imagen</label>
              <input id="img-url" className="campo" placeholder="https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              <button type="button" className="btn-secundario" disabled={!imageUrl.startsWith("https://")} onClick={() => { setImages([...images, { url: imageUrl, alt: f.name }]); setImageUrl(""); }}>Agregar</button>
            </div>
          </section>

          <section className="tarjeta space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Presentaciones / tamaños</h2>
              <button type="button" className="btn-secundario btn-sm" onClick={() => setVariants([...variants, { name: "", price: "0", isActive: true }])}><Plus className="size-3.5" /> Agregar</button>
            </div>
            <p className="ayuda">Opcional. Si agregas presentaciones, el cliente debe elegir una. El recargo se suma al precio base.</p>
            {variants.map((v, i) => (
              <div key={v.id ?? i} className="flex flex-wrap items-end gap-2">
                <div className="min-w-48 flex-1"><Field label="Nombre" value={v.name} onChange={(e) => setVariants(variants.map((x, k) => k === i ? { ...x, name: e.target.value } : x))} /></div>
                <div className="w-32"><Field label="Recargo ($)" inputMode="decimal" value={v.price} onChange={(e) => setVariants(variants.map((x, k) => k === i ? { ...x, price: e.target.value } : x))} /></div>
                <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="accent-rosa-600" checked={v.isActive} onChange={(e) => setVariants(variants.map((x, k) => k === i ? { ...x, isActive: e.target.checked } : x))} /> Activa</label>
                <button type="button" className="btn-fantasma btn-sm" disabled={i === 0} onClick={() => setVariants(move(variants, i, -1))} aria-label="Subir"><ArrowUp className="size-4" /></button>
                <button type="button" className="btn-fantasma btn-sm text-error" onClick={() => setVariants(variants.filter((_, k) => k !== i))} aria-label="Eliminar presentación"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </section>

          <section className="tarjeta space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Opciones de personalización</h2>
              <button type="button" className="btn-secundario btn-sm" onClick={() => setOptions([...options, { name: "", type: "SINGLE", isRequired: false, isActive: true, maxLength: "120", values: [{ label: "", price: "0", isActive: true }] }])}><Plus className="size-3.5" /> Agregar opción</button>
            </div>
            {options.length === 0 && <p className="ayuda">Sin opciones: el producto se vende tal cual.</p>}
            {options.map((o, i) => {
              const setO = (patch: Partial<OptionForm>) => setOptions(options.map((x, k) => (k === i ? { ...x, ...patch } : x)));
              return (
                <div key={o.id ?? i} className="space-y-3 rounded-2xl border border-crema-200 p-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-48 flex-1"><Field label="Nombre de la opción" placeholder="Sabor del pan, Relleno, Mensaje…" value={o.name} onChange={(e) => setO({ name: e.target.value })} /></div>
                    <div className="w-44">
                      <Select label="Tipo" value={o.type} onChange={(e) => setO({ type: e.target.value as OptionForm["type"] })}>
                        <option value="SINGLE">Elegir una</option>
                        <option value="MULTIPLE">Elegir varias</option>
                        <option value="TEXT">Texto libre</option>
                      </Select>
                    </div>
                    {o.type === "TEXT" && <div className="w-28"><Field label="Máx. caracteres" inputMode="numeric" value={o.maxLength} onChange={(e) => setO({ maxLength: e.target.value })} /></div>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" className="accent-rosa-600" checked={o.isRequired} onChange={(e) => setO({ isRequired: e.target.checked })} /> Obligatoria</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="accent-rosa-600" checked={o.isActive} onChange={(e) => setO({ isActive: e.target.checked })} /> Habilitada</label>
                    <button type="button" className="ml-auto text-xs font-semibold text-cafe-500 hover:text-cafe-900 disabled:opacity-40" disabled={i === 0} onClick={() => setOptions(move(options, i, -1))}><ArrowUp className="inline size-3" /> Subir</button>
                    <button type="button" className="text-xs font-semibold text-cafe-500 hover:text-cafe-900 disabled:opacity-40" disabled={i === options.length - 1} onClick={() => setOptions(move(options, i, 1))}><ArrowDown className="inline size-3" /> Bajar</button>
                    <button type="button" className="text-xs font-semibold text-error" onClick={() => setOptions(options.filter((_, k) => k !== i))}>Eliminar opción</button>
                  </div>
                  {o.type !== "TEXT" && (
                    <div className="space-y-2 border-t border-crema-100 pt-3">
                      {o.values.map((v, j) => {
                        const setV = (patch: Partial<OptionValueForm>) => setO({ values: o.values.map((x, k) => (k === j ? { ...x, ...patch } : x)) });
                        return (
                          <div key={v.id ?? j} className="flex flex-wrap items-center gap-2">
                            <input aria-label="Valor" className="campo min-w-40 flex-1" placeholder="Valor (p. ej. Chocolate)" value={v.label} onChange={(e) => setV({ label: e.target.value })} />
                            <input aria-label="Recargo en pesos" className="campo w-28" inputMode="decimal" placeholder="+ $" value={v.price} onChange={(e) => setV({ price: e.target.value })} />
                            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" className="accent-rosa-600" checked={v.isActive} onChange={(e) => setV({ isActive: e.target.checked })} /> Activo</label>
                            <button type="button" className="btn-fantasma btn-sm text-error" onClick={() => setO({ values: o.values.filter((_, k) => k !== j) })} aria-label="Eliminar valor"><Trash2 className="size-3.5" /></button>
                          </div>
                        );
                      })}
                      <button type="button" className="btn-fantasma btn-sm" onClick={() => setO({ values: [...o.values, { label: "", price: "0", isActive: true }] })}><Plus className="size-3.5" /> Agregar valor</button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>

        <div className="space-y-6">
          <section className="tarjeta space-y-4 p-5">
            <h2 className="text-lg">Publicación</h2>
            <Select label="Estado" {...bind("status")}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Select label="Categoría" {...bind("categoryId")} error={err("categoryId")}>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5 accent-rosa-600" checked={f.isFeatured} onChange={(e) => setF({ ...f, isFeatured: e.target.checked })} /> Producto destacado</label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5 accent-rosa-600" checked={f.isAvailable} onChange={(e) => setF({ ...f, isAvailable: e.target.checked })} /> Disponible para la venta</label>
          </section>
          <section className="tarjeta space-y-4 p-5">
            <h2 className="text-lg">Precio (MXN)</h2>
            <Field label="Precio" inputMode="decimal" required {...bind("price")} error={err("priceCents")} />
            <Field label="Precio promocional" inputMode="decimal" placeholder="Opcional" {...bind("salePrice")} error={err("salePriceCents")} hint="Debe ser menor al precio normal. Déjalo vacío para quitar la promoción." />
          </section>
          <section className="tarjeta space-y-4 p-5">
            <h2 className="text-lg">Inventario y preparación</h2>
            <Select label="Control de inventario" {...bind("inventoryMode")}>
              <option value="MADE_TO_ORDER">Bajo pedido (sin existencias)</option>
              <option value="TRACKED">Existencias cuantificables</option>
            </Select>
            {f.inventoryMode === "TRACKED" && (
              <>
                <Field label="Alerta de inventario bajo" inputMode="numeric" {...bind("lowStockThreshold")} />
                <p className="ayuda">Existencias actuales: <strong>{product?.stock ?? 0}</strong>. Ajústalas desde <Link to="/admin/inventario" className="font-bold text-rosa-600 hover:underline">Inventario</Link> para que quede registro del movimiento.</p>
              </>
            )}
            <Field label="Tiempo de preparación (horas)" inputMode="numeric" {...bind("prepTimeHours")} hint="Se usa para calcular la fecha mínima de entrega." />
          </section>
          {save.error && <Alert kind="error">{(save.error as Error).message}</Alert>}
        </div>
      </div>
      <ConfirmDialog open={confirmDelete} title="¿Eliminar este producto?" danger confirmLabel="Eliminar" loading={remove.isPending} onConfirm={() => remove.mutate()} onClose={() => setConfirmDelete(false)}>
        Si el producto ya tiene pedidos, se archivará en lugar de eliminarse para conservar el historial.
      </ConfirmDialog>
    </form>
  );
}
