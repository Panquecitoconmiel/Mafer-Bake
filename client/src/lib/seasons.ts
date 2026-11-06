import { useEffect, useState } from "react";
import { useStore } from "../hooks/useShop";
import { DEMO_MODE } from "../services/api";

export type SeasonId = "BASE" | "NAVIDAD" | "AMOR" | "MUERTOS" | "HALLOWEEN";
export type SeasonSetting = SeasonId | "AUTO";

export interface Season {
  id: SeasonId;
  name: string;
  /** Como se escribe dentro de una frase («Colección de …»). */
  inline: string;
  /** Slug de la categoría con la colección de temporada (null en la temporada base). */
  category: string | null;
  title: string;
  subtitle: string;
  cta: string;
  /** Ilustración de la portada. */
  hero: string;
  /** Fechas de la temporada automática: [mes, día] de inicio y fin (incluidos). */
  range?: [[number, number], [number, number]];
}

export const SEASONS: Record<SeasonId, Season> = {
  BASE: {
    id: "BASE",
    name: "Sin temporada",
    inline: "temporada",
    category: null,
    title: "Velas artesanales para cada momento",
    subtitle: "Recuerdos para bautizos, baby showers, bodas y XV años, y velas aromáticas hechas a mano para tu casa.",
    cta: "Ver recuerdos para eventos",
    hero: "/productos/velas/ambar.svg",
  },
  NAVIDAD: {
    id: "NAVIDAD",
    name: "Navidad",
    inline: "Navidad",
    category: "navidad",
    title: "Esta Navidad, enciende algo especial",
    subtitle: "Velas de pino, ponche y jengibre hechas a mano para regalar, intercambiar y decorar tu mesa.",
    cta: "Ver colección de Navidad",
    hero: "/productos/velas/pino-nevado.svg",
    range: [[11, 15], [1, 6]],
  },
  AMOR: {
    id: "AMOR",
    name: "Amor y amistad",
    inline: "amor y amistad",
    category: "amor-y-amistad",
    title: "Para quien hace brillar tus días",
    subtitle: "Corazones, rosas y vainilla: detalles hechos a mano para el 14 de febrero.",
    cta: "Ver colección de amor y amistad",
    hero: "/productos/velas/frasco-te-quiero.svg",
    range: [[2, 1], [2, 14]],
  },
  MUERTOS: {
    id: "MUERTOS",
    name: "Día de muertos",
    inline: "Día de muertos",
    category: "dia-de-muertos",
    title: "Una luz para quienes recordamos",
    subtitle: "Cempasúchil, pan de muerto y calaveritas para iluminar tu ofrenda.",
    cta: "Ver colección de Día de muertos",
    hero: "/productos/velas/cempasuchil.svg",
    range: [[10, 28], [11, 2]],
  },
  HALLOWEEN: {
    id: "HALLOWEEN",
    name: "Halloween",
    inline: "Halloween",
    category: "halloween",
    title: "Noche de brujas con aroma a calabaza",
    subtitle: "Calabaza especiada, fantasmas de vainilla y lunas doradas para tu decoración de octubre.",
    cta: "Ver colección de Halloween",
    hero: "/productos/velas/calabaza-especiada.svg",
    range: [[10, 1], [10, 27]],
  },
};

export const SEASON_OPTIONS: { value: SeasonSetting; label: string }[] = [
  { value: "AUTO", label: "Automática según la fecha" },
  { value: "BASE", label: "Sin temporada (nude)" },
  { value: "NAVIDAD", label: "Navidad" },
  { value: "AMOR", label: "Amor y amistad" },
  { value: "MUERTOS", label: "Día de muertos" },
  { value: "HALLOWEEN", label: "Halloween" },
];

const inRange = (date: Date, [[m1, d1], [m2, d2]]: [[number, number], [number, number]]) => {
  const v = (date.getMonth() + 1) * 100 + date.getDate();
  const a = m1 * 100 + d1;
  const b = m2 * 100 + d2;
  return a <= b ? v >= a && v <= b : v >= a || v <= b; // rangos que cruzan el año (Navidad)
};

/** Temporada vigente: la elegida en el panel o, en automático, la que marca el calendario. */
export function resolveSeason(setting: string | null | undefined, date = new Date()): SeasonId {
  if (setting && setting !== "AUTO" && setting in SEASONS) return setting as SeasonId;
  const found = Object.values(SEASONS).find((s) => s.range && inRange(date, s.range));
  return found?.id ?? "BASE";
}

// En la demostración se puede previsualizar cualquier temporada sin entrar al panel.
const PREVIEW_KEY = "mafer:temporada";
const listeners = new Set<() => void>();
export function setSeasonPreview(id: SeasonId | null) {
  try {
    if (id) sessionStorage.setItem(PREVIEW_KEY, id);
    else sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    /* sin almacenamiento: solo dura esta vista */
  }
  previewMemory = id;
  listeners.forEach((l) => l());
}
let previewMemory: SeasonId | null = null;
function readPreview(): SeasonId | null {
  if (!DEMO_MODE) return null;
  try {
    const v = sessionStorage.getItem(PREVIEW_KEY);
    if (v && v in SEASONS) return v as SeasonId;
  } catch {
    /* ignorado */
  }
  return previewMemory;
}

export function useSeason(): Season {
  const { data: store } = useStore();
  const [preview, setPreview] = useState(readPreview);
  useEffect(() => {
    const l = () => setPreview(readPreview());
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return SEASONS[preview ?? resolveSeason(store?.season)];
}
