import { CreditCard, LayoutDashboard, LogOut, Menu, Package, Settings, ShoppingCart, Store, Tags, TicketPercent, Users, Warehouse, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/admin/pedidos", label: "Pedidos", Icon: ShoppingCart },
  { to: "/admin/productos", label: "Productos", Icon: Package },
  { to: "/admin/categorias", label: "Categorías", Icon: Tags },
  { to: "/admin/inventario", label: "Inventario", Icon: Warehouse },
  { to: "/admin/clientes", label: "Clientes", Icon: Users },
  { to: "/admin/pagos", label: "Pagos", Icon: CreditCard },
  { to: "/admin/promociones", label: "Cupones", Icon: TicketPercent },
  { to: "/admin/configuracion", label: "Configuración", Icon: Settings },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Administración">
      {NAV.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-rosa-600 text-white" : "text-crema-200 hover:bg-white/10"}`}>
          <Icon className="size-4" /> {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-crema-100 lg:grid lg:grid-cols-[250px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col gap-6 bg-cafe-900 p-5 transition-transform lg:sticky lg:top-0 lg:h-dvh lg:w-auto lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <Link to="/admin"><Logo tone="claro" /></Link>
          <button className="grid size-9 place-items-center rounded-full text-crema-100 hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X className="size-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="space-y-1 border-t border-white/10 pt-4 text-sm">
          <p className="px-3 text-xs text-cafe-400">{user?.firstName} {user?.lastName}</p>
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2 font-semibold text-crema-200 hover:bg-white/10"><Store className="size-4" /> Ver tienda</Link>
          <button onClick={async () => { await logout(); navigate("/"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 font-semibold text-crema-200 hover:bg-white/10"><LogOut className="size-4" /> Cerrar sesión</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-cafe-900/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-crema-200 bg-crema-100/90 px-4 backdrop-blur lg:hidden">
          <button className="grid size-10 place-items-center rounded-full hover:bg-crema-200" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu className="size-5" /></button>
          <span className="font-display text-lg italic">Mafer · Admin</span>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8"><Outlet /></main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-cafe-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="tarjeta overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-crema-200 text-xs tracking-wide text-cafe-500 uppercase">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-bold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-crema-100">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-sm text-cafe-500">No hay registros.</p>}
    </div>
  );
}
