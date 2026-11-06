import { Camera as Instagram, ChevronDown, Globe as Facebook, LayoutDashboard, LogOut, Menu, MessageCircle, Package, Palette, Search, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { useCart, useStore } from "../hooks/useShop";
import { SEASONS, setSeasonPreview, useSeason, type SeasonId } from "../lib/seasons";
import { DEMO_MODE } from "../services/api";

/** Menú principal: la colección de la temporada vigente aparece en segundo lugar. */
function useNav() {
  const season = useSeason();
  return [
    { to: "/", label: "Inicio", end: true },
    ...(season.category ? [{ to: `/categoria/${season.category}`, label: season.name }] : []),
    { to: "/catalogo", label: "Catálogo", end: true },
    { to: "/categoria/bautizo", label: "Bautizo" },
    { to: "/categoria/baby-shower", label: "Baby shower" },
    { to: "/categoria/bodas", label: "Bodas" },
    { to: "/categoria/xv-y-cumpleanos", label: "XV y cumpleaños" },
    { to: "/categoria/aromaticas", label: "Aromáticas" },
    { to: "/promociones", label: "Promociones" },
  ];
}

function SearchBox({ onDone, id }: { onDone?: () => void; id: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/catalogo?q=${encodeURIComponent(q.trim())}` : "/catalogo");
    onDone?.();
  };
  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <label htmlFor={id} className="sr-only">Buscar productos</label>
      <input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar velas, recuerdos, aromas…" className="campo min-h-10 rounded-full pr-11 pl-4 text-sm" />
      <button type="submit" className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-rosa-600 text-white hover:bg-rosa-700" aria-label="Buscar">
        <Search className="size-4" />
      </button>
    </form>
  );
}

/** Botón de cuenta con menú: muestra quién inició sesión y permite cerrar sesión. */
function AccountMenu() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  if (!user) return null;
  const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-cafe-700 hover:bg-rosa-50 hover:text-rosa-700";
  return (
    <div ref={ref} className="relative">
      <button
        className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold hover:bg-rosa-50"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${user.firstName}`}
      >
        <User className="size-5" />
        <span className="hidden sm:inline">Mi cuenta</span>
        <ChevronDown className={`hidden size-4 transition sm:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-rosa-100 bg-white p-2 shadow-[var(--shadow-elevada)]">
          <div className="border-b border-rosa-100 px-3 pt-2 pb-3">
            <p className="font-display text-[15px] font-semibold text-cafe-900">{user.firstName} {user.lastName}</p>
            <p className="truncate text-[13px] text-cafe-500">{user.email}</p>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${isAdmin ? "bg-cafe-700 text-white" : "bg-rosa-100 text-rosa-700"}`}>
              {isAdmin ? "Administradora" : "Cliente"}
            </span>
          </div>
          <div className="pt-1.5">
            {isAdmin && <Link role="menuitem" to="/admin" className={item}><LayoutDashboard className="size-4" /> Panel de administración</Link>}
            <Link role="menuitem" to="/cuenta" className={item}><User className="size-4" /> Mi cuenta</Link>
            <Link role="menuitem" to="/cuenta/pedidos" className={item}><Package className="size-4" /> Mis pedidos</Link>
            <button
              role="menuitem"
              className={item}
              onClick={async () => {
                await logout();
                navigate("/ingresar");
              }}
            >
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileLogout({ tabIndex }: { tabIndex: number }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <p className="px-1 text-center text-[13px] text-cafe-500">Sesión iniciada como {user?.email}</p>
      <button className="btn-fantasma" tabIndex={tabIndex} onClick={async () => { await logout(); navigate("/ingresar"); }}>
        <LogOut className="size-4" /> Cerrar sesión
      </button>
    </>
  );
}

function Header() {
  const NAV = useNav();
  const { user, isAdmin } = useAuth();
  const { data: cart } = useCart();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);
  const count = cart?.itemCount ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-rosa-100 bg-white/92 backdrop-blur-md">
      <div className="contenedor grid h-[72px] grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center">
          <button className="-ml-2 grid size-10 place-items-center rounded-full text-rosa-600 hover:bg-rosa-50 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open} aria-controls="menu-movil">
            <Menu className="size-5" />
          </button>
          <div className="hidden w-full max-w-[15rem] md:block">
            <SearchBox id="buscar-escritorio" />
          </div>
        </div>
        <Link to="/" aria-label="Mafer — inicio" className="justify-self-center">
          <Logo />
        </Link>
        <div className="flex items-center justify-end gap-1 text-rosa-600">
          {isAdmin && (
            <Link to="/admin" className="btn-secundario btn-sm hidden sm:inline-flex">Panel admin</Link>
          )}
          {user ? (
            <AccountMenu />
          ) : (
            <>
              <Link to="/ingresar" className="btn-primario btn-sm hidden sm:inline-flex"><User className="size-4" /> Iniciar sesión</Link>
              <Link to="/ingresar" className="grid size-10 place-items-center rounded-full hover:bg-rosa-50 sm:hidden" aria-label="Iniciar sesión"><User className="size-5" /></Link>
            </>
          )}
          <Link to="/carrito" className="relative grid size-10 place-items-center rounded-full hover:bg-rosa-50" aria-label={`Carrito, ${count} artículo${count === 1 ? "" : "s"}`}>
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-rosa-600 px-1 text-[11px] font-bold text-white">{count > 99 ? "99+" : count}</span>
            )}
          </Link>
        </div>
      </div>
      <nav className="contenedor hidden h-11 items-center justify-center gap-1 lg:flex" aria-label="Principal">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `rounded-full px-3.5 py-1.5 text-[15px] font-semibold transition ${isActive ? "bg-rosa-100 text-rosa-700" : "text-cafe-700 hover:text-rosa-600"}`}>
            {n.label}
          </NavLink>
        ))}
      </nav>

      {/* Menú móvil: se monta en <body> porque el backdrop-filter del encabezado
          convertiría al header en el contenedor de los elementos "fixed". */}
      {createPortal(
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-cafe-900/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <div id="menu-movil" role="dialog" aria-modal="true" aria-label="Menú" className={`absolute inset-y-0 left-0 flex w-[min(86vw,22rem)] flex-col gap-5 bg-white p-5 shadow-[var(--shadow-elevada)] transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between">
            <Logo />
            <button className="grid size-10 place-items-center rounded-full hover:bg-crema-200" onClick={() => setOpen(false)} aria-label="Cerrar menú" tabIndex={open ? 0 : -1}>
              <X className="size-5" />
            </button>
          </div>
          {open && <SearchBox id="buscar-movil" onDone={() => setOpen(false)} />}
          <nav className="flex flex-col" aria-label="Principal móvil">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} tabIndex={open ? 0 : -1} className={({ isActive }) => `rounded-xl px-3 py-3 font-display text-lg font-medium ${isActive ? "bg-rosa-100 text-rosa-700" : "text-cafe-700 hover:bg-rosa-50"}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2 border-t border-crema-200 pt-4">
            <Link to={user ? "/cuenta" : "/ingresar"} className="btn-secundario" tabIndex={open ? 0 : -1}>{user ? "Mi cuenta" : "Iniciar sesión"}</Link>
            {isAdmin && <Link to="/admin" className="btn-cafe" tabIndex={open ? 0 : -1}>Panel administrativo</Link>}
            {user && <MobileLogout tabIndex={open ? 0 : -1} />}
          </div>
        </div>
      </div>,
        document.body,
      )}
    </header>
  );
}

function Footer() {
  const { data: s } = useStore();
  const social = [
    s?.instagramUrl && { href: s.instagramUrl, label: "Instagram", Icon: Instagram },
    s?.facebookUrl && { href: s.facebookUrl, label: "Facebook", Icon: Facebook },
    s?.whatsapp && { href: `https://wa.me/${s.whatsapp.replace(/\D/g, "")}`, label: "WhatsApp", Icon: MessageCircle },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof Instagram }[];

  const col = "mb-3 font-display text-base font-semibold text-cafe-900";
  const link = "hover:text-rosa-600";
  return (
    <footer className="relative z-[1] mt-20">
      <div className="rayas h-3" aria-hidden="true" />
      <div className="bg-rosa-100 text-cafe-700">
        <div className="contenedor grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col items-start">
            <Logo tagline align="start" />
            <p className="mt-4 max-w-xs font-display text-lg text-cafe-700">«{s?.slogan ?? "Velas artesanales para cada momento"}»</p>
            {social.length > 0 && (
              <div className="mt-5 flex gap-2">
                {social.map(({ href, label, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer noopener" aria-label={label} className="grid size-10 place-items-center rounded-full bg-white text-rosa-600 hover:bg-rosa-50">
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className={col}>Tienda</h2>
            <ul className="space-y-2 text-sm">
              <li><Link className={link} to="/catalogo">Catálogo completo</Link></li>
              <li><Link className={link} to="/categoria/aromaticas">Velas aromáticas</Link></li>
              <li><Link className={link} to="/categoria/velas">Velas postre</Link></li>
              <li><Link className={link} to="/promociones">Promociones</Link></li>
              <li><Link className={link} to="/cuenta/pedidos">Mis pedidos</Link></li>
            </ul>
          </div>
          <div>
            <h2 className={col}>Ayuda</h2>
            <ul className="space-y-2 text-sm">
              <li><Link className={link} to="/ayuda#entregas">Pedidos y entregas</Link></li>
              <li><Link className={link} to="/ayuda#preguntas">Preguntas frecuentes</Link></li>
              <li><Link className={link} to="/ayuda#contacto">Contacto</Link></li>
            </ul>
          </div>
          <div>
            <h2 className={col}>Legal</h2>
            <ul className="space-y-2 text-sm">
              <li><Link className={link} to="/legal/terminos">Términos y condiciones</Link></li>
              <li><Link className={link} to="/legal/privacidad">Aviso de privacidad</Link></li>
              <li><Link className={link} to="/legal/compras">Condiciones de compra</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-rosa-200">
          <p className="contenedor py-5 text-xs text-cafe-500">© {new Date().getFullYear()} Mafer. Pagos procesados de forma segura por Stripe.</p>
        </div>
      </div>
    </footer>
  );
}

function DemoNotice() {
  if (DEMO_MODE) {
    return (
      <div className="bg-coral px-4 py-2 text-center text-[13px] font-semibold text-white">
        Sitio de demostración: las imágenes son ilustrativas y no se procesan pedidos ni pagos reales.
      </div>
    );
  }
  if (import.meta.env.VITE_DEMO_NOTICE === "false") return null;
  return (
    <div className="bg-coral px-4 py-2 text-center text-[13px] font-semibold text-white">
      Sitio en desarrollo: productos, precios e imágenes de demostración.
    </div>
  );
}

/** Partículas de temporada (nieve, corazones, pétalos de cempasúchil o chispas). Decorativas. */
const DECOR: Partial<Record<SeasonId, { colors: string[]; shape: "circle" | "heart" | "petal" | "spark"; count: number }>> = {
  NAVIDAD: { colors: ["#fff7ea", "#ffffff", "#f5e6d1"], shape: "circle", count: 42 },
  AMOR: { colors: ["#f39aac", "#c21d3c", "#ffc2cd"], shape: "heart", count: 18 },
  MUERTOS: { colors: ["#f4a742", "#f29e1f", "#c2185b"], shape: "petal", count: 24 },
  HALLOWEEN: { colors: ["#f08a3c", "#8a6bb0", "#f0b45c"], shape: "spark", count: 22 },
};
function SeasonDecor({ id }: { id: SeasonId }) {
  const cfg = DECOR[id];
  const items = useMemo(() => {
    if (!cfg) return [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: cfg.count }, (_, i) => ({
      left: `${rnd() * 100}%`,
      size: cfg.shape === "circle" ? 3 + rnd() * 5 : 9 + rnd() * 9,
      duration: `${9 + rnd() * 12}s`,
      delay: `${-rnd() * 20}s`,
      deriva: `${(rnd() - 0.5) * 120}px`,
      color: cfg.colors[i % cfg.colors.length],
    }));
  }, [cfg]);
  if (!cfg) return null;
  const shape = (color: string): CSSProperties => {
    if (cfg.shape === "circle") return { background: color, borderRadius: "50%" };
    if (cfg.shape === "petal") return { background: color, borderRadius: "70% 0 70% 0" };
    if (cfg.shape === "heart") return { background: color, clipPath: "path('M5 9 C1 6 0 4 0 2.5 C0 1 1 0 2.5 0 C3.6 0 4.5 0.7 5 1.6 C5.5 0.7 6.4 0 7.5 0 C9 0 10 1 10 2.5 C10 4 9 6 5 9Z')", transform: "scale(1.4)" };
    return { background: color, clipPath: "polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)" };
  };
  return (
    <div className="temporada-decor" aria-hidden="true">
      {items.map((it, i) => (
        <i key={i} style={{ left: it.left, width: it.size, height: it.size, animationDuration: it.duration, animationDelay: it.delay, ["--deriva" as string]: it.deriva, ...shape(it.color) }} />
      ))}
    </div>
  );
}

/** Solo en la demostración: permite mostrar al cliente cómo se ve cada temporada. */
function SeasonPreview({ current }: { current: SeasonId }) {
  const [open, setOpen] = useState(false);
  if (!DEMO_MODE) return null;
  return (
    <div className="fixed bottom-4 left-4 z-40">
      {open && (
        <div role="menu" className="mb-2 w-60 rounded-2xl border border-rosa-100 bg-white p-2 shadow-[var(--shadow-elevada)]">
          <p className="px-3 pt-1 pb-2 text-xs font-semibold text-cafe-500">Ver el sitio en temporada…</p>
          {(Object.keys(SEASONS) as SeasonId[]).map((id) => (
            <button key={id} role="menuitemradio" aria-checked={id === current} onClick={() => { setSeasonPreview(id); setOpen(false); }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold ${id === current ? "bg-rosa-100 text-rosa-700" : "text-cafe-700 hover:bg-rosa-50"}`}>
              {SEASONS[id].name}
              {id === current && <span aria-hidden="true">●</span>}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="btn-cafe btn-sm shadow-[var(--shadow-elevada)]">
        <Palette className="size-4" /> Temporada: {SEASONS[current].name}
      </button>
    </div>
  );
}

export function StoreLayout() {
  const { pathname } = useLocation();
  const season = useSeason();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    document.documentElement.dataset.season = season.id;
    return () => void delete document.documentElement.dataset.season;
  }, [season.id]);
  return (
    <div className="relative flex min-h-dvh flex-col">
      <SeasonDecor key={season.id} id={season.id} />
      <SeasonPreview current={season.id} />
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">Saltar al contenido</a>
      <DemoNotice />
      <Header />
      <main id="contenido" className="relative z-[1] flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
