import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LoadingButton, Spinner } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../hooks/useShop";
import { longDate, money } from "../lib/format";
import { api } from "../services/api";

/**
 * Página de regreso desde Stripe. NO marca el pedido como pagado:
 * consulta al servidor, que verifica el estado real con Stripe y los webhooks.
 */
export function PaymentSuccess() {
  const [params] = useSearchParams();
  const orderId = params.get("pedido") ?? "";
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (orderId) api.syncPayment(orderId).catch(() => undefined);
  }, [orderId]);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      setAttempts((a) => a + 1);
      return api.order(orderId);
    },
    enabled: !!orderId,
    refetchInterval: (q) => (q.state.data?.paymentStatus === "PAID" || attempts > 15 ? false : 2000),
  });

  if (!orderId) return <div className="contenedor py-20 text-center"><p>No encontramos el pedido.</p></div>;
  if (isLoading || !order) return <Spinner className="py-24" label="Confirmando tu pago…" />;

  const paid = order.paymentStatus === "PAID";
  return (
    <div className="contenedor max-w-xl py-16 text-center">
      {paid ? (
        <>
          <CheckCircle2 className="mx-auto size-16 text-exito" />
          <h1 className="mt-4 text-4xl">¡Gracias por tu compra!</h1>
          <p className="mt-3 text-cafe-500">Tu pago fue confirmado. Pedido <strong className="text-cafe-900">{order.number}</strong> por {money(order.totalCents)}.</p>
          <p className="mt-2 text-sm text-cafe-500">Fecha solicitada: {longDate(order.requestedDate)} · {order.requestedSlot}</p>
        </>
      ) : (
        <>
          <Clock className="mx-auto size-16 text-aviso" />
          <h1 className="mt-4 text-3xl">Estamos confirmando tu pago</h1>
          <p className="mt-3 text-cafe-500">
            {attempts > 15
              ? "Tu pago se está procesando. En cuanto Stripe lo confirme, verás tu pedido como pagado en «Mis pedidos»."
              : "Esto puede tardar unos segundos. No cierres esta página."}
          </p>
          {attempts <= 15 && <Spinner className="py-4" label="Verificando con Stripe…" />}
        </>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to={`/cuenta/pedidos/${order.id}`} className="btn-primario">Ver mi pedido</Link>
        <Link to="/catalogo" className="btn-secundario">Seguir comprando</Link>
      </div>
    </div>
  );
}

export function PaymentCancelled() {
  const [params] = useSearchParams();
  const orderId = params.get("pedido") ?? "";
  const notify = useToast();
  const [loading, setLoading] = useState(false);

  const retry = async () => {
    setLoading(true);
    try {
      const { url } = await api.checkout(orderId);
      window.location.assign(url);
    } catch (e) {
      notify(errorMessage(e), "error");
      setLoading(false);
    }
  };

  return (
    <div className="contenedor max-w-xl py-16 text-center">
      <XCircle className="mx-auto size-16 text-cafe-400" />
      <h1 className="mt-4 text-3xl">El pago no se completó</h1>
      <p className="mt-3 text-cafe-500">No se realizó ningún cargo. Tu pedido queda pendiente de pago por un tiempo limitado; puedes intentarlo de nuevo.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {orderId && <LoadingButton loading={loading} onClick={retry}>Intentar pagar de nuevo</LoadingButton>}
        {orderId && <Link to={`/cuenta/pedidos/${orderId}`} className="btn-secundario">Ver mi pedido</Link>}
      </div>
    </div>
  );
}
