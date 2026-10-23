import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Spinner } from "./components/ui";
import { useAuth } from "./context/AuthContext";
import { AdminLayout } from "./layouts/AdminLayout";
import { StoreLayout } from "./layouts/StoreLayout";
import { AccountAddresses, AccountFavorites, AccountLayout, AccountOrderDetail, AccountOrders, AccountOverview, AccountProfile } from "./pages/Account";
import { ForgotPassword, Login, Register, ResetPassword, VerifyEmail } from "./pages/Auth";
import CartPage from "./pages/Cart";
import Catalog from "./pages/Catalog";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import { Help, Legal, NotFound } from "./pages/Info";
import { PaymentCancelled, PaymentSuccess } from "./pages/PaymentResult";
import ProductDetail from "./pages/ProductDetail";

// El panel administrativo se carga bajo demanda: no pesa en la tienda pública.
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminProducts = lazy(() => import("./pages/admin/Products").then((m) => ({ default: m.AdminProducts })));
const AdminProductForm = lazy(() => import("./pages/admin/Products").then((m) => ({ default: m.AdminProductForm })));
const AdminOrders = lazy(() => import("./pages/admin/Orders").then((m) => ({ default: m.AdminOrders })));
const AdminOrderDetail = lazy(() => import("./pages/admin/Orders").then((m) => ({ default: m.AdminOrderDetail })));
const AdminCategories = lazy(() => import("./pages/admin/Manage").then((m) => ({ default: m.AdminCategories })));
const AdminInventory = lazy(() => import("./pages/admin/Manage").then((m) => ({ default: m.AdminInventory })));
const AdminCustomers = lazy(() => import("./pages/admin/Manage").then((m) => ({ default: m.AdminCustomers })));
const AdminCustomerDetail = lazy(() => import("./pages/admin/Manage").then((m) => ({ default: m.AdminCustomerDetail })));
const AdminPayments = lazy(() => import("./pages/admin/Manage").then((m) => ({ default: m.AdminPayments })));
const AdminCoupons = lazy(() => import("./pages/admin/Manage").then((m) => ({ default: m.AdminCoupons })));

/** Protección visual de rutas. La autorización real siempre ocurre en el servidor. */
function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner className="py-24" />;
  if (!user) return <Navigate to={`/ingresar?volver=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (admin && user.role !== "ADMIN") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<Spinner className="py-24" />}>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<Home />} />
          <Route path="catalogo" element={<Catalog />} />
          <Route path="categoria/:slug" element={<Catalog />} />
          <Route path="promociones" element={<Catalog promotions />} />
          <Route path="producto/:slug" element={<ProductDetail />} />
          <Route path="carrito" element={<CartPage />} />
          <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="pago/exito" element={<RequireAuth><PaymentSuccess /></RequireAuth>} />
          <Route path="pago/cancelado" element={<RequireAuth><PaymentCancelled /></RequireAuth>} />
          <Route path="ingresar" element={<Login />} />
          <Route path="registro" element={<Register />} />
          <Route path="recuperar-contrasena" element={<ForgotPassword />} />
          <Route path="restablecer-contrasena" element={<ResetPassword />} />
          <Route path="verificar-correo" element={<VerifyEmail />} />
          <Route path="ayuda" element={<Help />} />
          <Route path="legal/:doc" element={<Legal />} />
          <Route path="cuenta" element={<RequireAuth><AccountLayout /></RequireAuth>}>
            <Route index element={<AccountOverview />} />
            <Route path="pedidos" element={<AccountOrders />} />
            <Route path="pedidos/:id" element={<AccountOrderDetail />} />
            <Route path="direcciones" element={<AccountAddresses />} />
            <Route path="favoritos" element={<AccountFavorites />} />
            <Route path="datos" element={<AccountProfile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="pedidos" element={<AdminOrders />} />
          <Route path="pedidos/:id" element={<AdminOrderDetail />} />
          <Route path="productos" element={<AdminProducts />} />
          <Route path="productos/:id" element={<AdminProductForm />} />
          <Route path="categorias" element={<AdminCategories />} />
          <Route path="inventario" element={<AdminInventory />} />
          <Route path="clientes" element={<AdminCustomers />} />
          <Route path="clientes/:id" element={<AdminCustomerDetail />} />
          <Route path="pagos" element={<AdminPayments />} />
          <Route path="promociones" element={<AdminCoupons />} />
          <Route path="configuracion" element={<AdminSettings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
