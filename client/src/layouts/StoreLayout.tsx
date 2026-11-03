import { Camera as Instagram, Globe as Facebook, Menu, MessageCircle, Search, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { useCart, useStore } from "../hooks/useShop";
import { DEMO_MODE } from "../services/api";

const NAV = [
  { to: "/", label: "Inicio", end: true },
  { to: "/catalogo", label: "Catálogo", end: true },
  { to: "/categoria/pasteles", label: "Pasteles" },
  { to: "/categoria/cupcakes", label: "Cupcakes" },
  { to: "/categoria/donas", label: "Donas" },
  { to: "/categoria/galletas", label: "Galletas" },
  { to: "/categoria/pan-dulce", label: "Pan dulce" },
  { to: "/categoria/velas", label: "Velas" },
  { to: "/promociones", label: "Promociones" },
];

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
      <input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pasteles, cupcakes, galletas…" className="campo min-h-10 rounded-full pr-11 pl-4 text-sm" />
      <button type="submit" className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-rosa-600 text-white hover:bg-rosa-700" aria-label="Buscar">
        <Search className="size-4" />
      </button>
    </form>
  );
}

function Header() {
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
            <Link to="/cuenta" className="flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-bold hover:bg-rosa-50">
              <User className="size-5" />
              <span className="hidden sm:inline">{user.firstName}</span>
            </Link>
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
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `rounded-full px-3.5 py-1.5 font-display text-[13px] font-semibold tracking-[0.08em] uppercase transition ${isActive ? "bg-rosa-100 text-rosa-700" : "text-rosa-600/85 hover:text-rosa-700"}`}>
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

  const col = "mb-3 font-display text-sm font-semibold tracking-[0.12em] text-rosa-600 uppercase";
  const link = "hover:text-rosa-600";
  return (
    <footer className="mt-20">
      <div className="rayas h-3" aria-hidden="true" />
      <div className="bg-rosa-100 text-cafe-700">
        <div className="contenedor grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col items-start">
            <Logo tagline />
            <p className="mt-4 max-w-xs font-display text-lg text-cafe-700">«{s?.slogan ?? "Pequeños antojos, grandes momentos"}»</p>
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
              <li><Link className={link} to="/categoria/velas">Velas de postre</Link></li>
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
      <div className="bg-coral px-4 py-2 text-center text-xs font-bold tracking-wide text-white">
        Demostración de diseño · Imágenes ilustrativas · No se procesan pedidos ni pagos reales
      </div>
    );
  }
  if (import.meta.env.VITE_DEMO_NOTICE === "false") return null;
  return (
    <div className="bg-coral px-4 py-2 text-center text-xs font-bold tracking-wide text-white">
      Sitio en desarrollo · Productos, precios e imágenes de demostración
    </div>
  );
}

export function StoreLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">Saltar al contenido</a>
      <DemoNotice />
      <Header />
      <main id="contenido" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
