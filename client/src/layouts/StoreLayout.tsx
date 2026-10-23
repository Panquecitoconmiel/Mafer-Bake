import { Camera as Instagram, Globe as Facebook, Menu, MessageCircle, Search, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { useCart, useStore } from "../hooks/useShop";

const NAV = [
  { to: "/", label: "Inicio", end: true },
  { to: "/catalogo", label: "Catálogo", end: true },
  { to: "/categoria/cupcakes", label: "Cupcakes" },
  { to: "/categoria/pasteles", label: "Pasteles" },
  { to: "/categoria/galletas", label: "Galletas" },
  { to: "/categoria/pasteles-personalizados", label: "Personalizados" },
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
      <button type="submit" className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-cafe-700 text-crema-50 hover:bg-cafe-900" aria-label="Buscar">
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
    <header className="sticky top-0 z-40 border-b border-crema-200/80 bg-crema-100/90 backdrop-blur-md">
      <div className="contenedor flex h-[68px] items-center gap-4">
        <button className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-crema-200 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open} aria-controls="menu-movil">
          <Menu className="size-5" />
        </button>
        <Link to="/" aria-label="Mafer — inicio" className="shrink-0">
          <Logo />
        </Link>
        <div className="mx-auto hidden w-full max-w-sm md:block">
          <SearchBox id="buscar-escritorio" />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {isAdmin && (
            <Link to="/admin" className="btn-fantasma btn-sm hidden sm:inline-flex">Panel</Link>
          )}
          <Link to={user ? "/cuenta" : "/ingresar"} className="flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-crema-200">
            <User className="size-5" />
            <span className="hidden sm:inline">{user ? user.firstName : "Ingresar"}</span>
          </Link>
          <Link to="/carrito" className="relative grid size-10 place-items-center rounded-full hover:bg-crema-200" aria-label={`Carrito, ${count} artículo${count === 1 ? "" : "s"}`}>
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-rosa-600 px-1 text-[11px] font-bold text-white">{count > 99 ? "99+" : count}</span>
            )}
          </Link>
        </div>
      </div>
      <nav className="contenedor hidden h-11 items-center gap-1 lg:flex" aria-label="Principal">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${isActive ? "bg-white text-rosa-600 shadow-[var(--shadow-suave)]" : "text-cafe-700 hover:text-rosa-600"}`}>
            {n.label}
          </NavLink>
        ))}
      </nav>

      {/* Menú móvil: se monta en <body> porque el backdrop-filter del encabezado
          convertiría al header en el contenedor de los elementos "fixed". */}
      {createPortal(
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-cafe-900/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <div id="menu-movil" role="dialog" aria-modal="true" aria-label="Menú" className={`absolute inset-y-0 left-0 flex w-[min(86vw,22rem)] flex-col gap-5 bg-crema-50 p-5 shadow-[var(--shadow-elevada)] transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between">
            <Logo />
            <button className="grid size-10 place-items-center rounded-full hover:bg-crema-200" onClick={() => setOpen(false)} aria-label="Cerrar menú" tabIndex={open ? 0 : -1}>
              <X className="size-5" />
            </button>
          </div>
          {open && <SearchBox id="buscar-movil" onDone={() => setOpen(false)} />}
          <nav className="flex flex-col" aria-label="Principal móvil">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} tabIndex={open ? 0 : -1} className={({ isActive }) => `rounded-xl px-3 py-3 font-display text-lg ${isActive ? "bg-rosa-100 text-rosa-700" : "text-cafe-900 hover:bg-crema-200"}`}>
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

  return (
    <footer className="mt-20 bg-cafe-900 text-crema-200">
      <div className="contenedor grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo tone="claro" tagline />
          <p className="mt-4 max-w-xs font-display text-lg text-crema-100 italic">«{s?.slogan ?? "Pequeños antojos, grandes momentos"}»</p>
          {social.length > 0 && (
            <div className="mt-5 flex gap-2">
              {social.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer noopener" aria-label={label} className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-3 font-sans text-xs font-bold tracking-[0.18em] text-rosa-200 uppercase">Tienda</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/catalogo">Catálogo completo</Link></li>
            <li><Link className="hover:text-white" to="/categoria/pasteles-personalizados">Pasteles personalizados</Link></li>
            <li><Link className="hover:text-white" to="/promociones">Promociones</Link></li>
            <li><Link className="hover:text-white" to="/cuenta/pedidos">Mis pedidos</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-xs font-bold tracking-[0.18em] text-rosa-200 uppercase">Ayuda</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/ayuda#entregas">Pedidos y entregas</Link></li>
            <li><Link className="hover:text-white" to="/ayuda#preguntas">Preguntas frecuentes</Link></li>
            <li><Link className="hover:text-white" to="/ayuda#contacto">Contacto</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-xs font-bold tracking-[0.18em] text-rosa-200 uppercase">Legal</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/legal/terminos">Términos y condiciones</Link></li>
            <li><Link className="hover:text-white" to="/legal/privacidad">Aviso de privacidad</Link></li>
            <li><Link className="hover:text-white" to="/legal/compras">Condiciones de compra</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="contenedor py-5 text-xs text-cafe-400">© {new Date().getFullYear()} Mafer. Pagos procesados de forma segura por Stripe.</p>
      </div>
    </footer>
  );
}

function DemoNotice() {
  if (import.meta.env.VITE_DEMO_NOTICE === "false") return null;
  return (
    <div className="bg-cafe-700 px-4 py-1.5 text-center text-xs font-semibold text-crema-100">
      Sitio en desarrollo · Productos y precios de demostración
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
