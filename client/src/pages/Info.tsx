import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ContactInfo, DeliveryInfo, FAQ } from "../components/StoreInfo";
import { Spinner } from "../components/ui";
import { useStore } from "../hooks/useShop";

export function Help() {
  const { data: s } = useStore();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash && s) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
  }, [hash, s]);
  if (!s) return <Spinner className="py-24" />;
  return (
    <div className="contenedor max-w-4xl space-y-14 pt-10">
      <h1 className="text-4xl">Ayuda</h1>
      <section id="entregas"><h2 className="titulo-seccion mb-5">Pedidos y entregas</h2><DeliveryInfo s={s} /></section>
      <section id="preguntas"><h2 className="titulo-seccion mb-5">Preguntas frecuentes</h2><FAQ s={s} /></section>
      <section id="contacto"><h2 className="titulo-seccion mb-5">Contacto</h2><div className="tarjeta p-6"><ContactInfo s={s} /></div></section>
    </div>
  );
}

const LEGAL: Record<string, { title: string; sections: [string, string][] }> = {
  terminos: {
    title: "Términos y condiciones",
    sections: [
      ["Uso del sitio", "Al crear una cuenta o realizar una compra en Mafer aceptas utilizar el sitio de forma lícita y proporcionar información veraz."],
      ["Cuenta", "Eres responsable de mantener la confidencialidad de tu contraseña. Mafer puede suspender cuentas que hagan un uso indebido del sitio."],
      ["Productos", "Las fotografías e ilustraciones son representativas. Al ser productos artesanales, la decoración final puede variar ligeramente."],
    ],
  },
  privacidad: {
    title: "Aviso de privacidad",
    sections: [
      ["Datos que recabamos", "Nombre, correo electrónico, teléfono y direcciones de entrega, así como el historial de tus pedidos."],
      ["Finalidad", "Usamos tus datos para procesar y entregar tus pedidos, darte seguimiento y atender tus solicitudes."],
      ["Pagos", "Los pagos se procesan con Stripe. Mafer no recibe ni almacena los datos completos de tu tarjeta."],
      ["Tus derechos", "Puedes solicitar el acceso, rectificación, cancelación u oposición al tratamiento de tus datos (derechos ARCO) mediante los datos de contacto publicados en el sitio."],
    ],
  },
  compras: {
    title: "Condiciones de compra",
    sections: [
      ["Precios", "Los precios se expresan en pesos mexicanos (MXN). El total definitivo se confirma en el resumen de compra antes de pagar."],
      ["Fecha de entrega", "La fecha y el horario que eliges son una solicitud sujeta a disponibilidad; Mafer los confirma al preparar tu pedido."],
      ["Pago", "El pedido se confirma únicamente cuando Stripe verifica el pago. Los pedidos no pagados se cancelan automáticamente al expirar la sesión de pago."],
      ["Cancelaciones y reembolsos", "Consulta la política de cancelación publicada en la sección de Ayuda. Los reembolsos se realizan al mismo método de pago."],
    ],
  },
};

export function Legal() {
  const { doc = "" } = useParams();
  const page = LEGAL[doc];
  if (!page) return <NotFound />;
  return (
    <div className="contenedor max-w-3xl pt-10">
      <h1 className="text-4xl">{page.title}</h1>
      <p className="mt-4 rounded-xl bg-[#fbf0dc] p-4 text-sm font-semibold text-aviso">
        Documento base pendiente de revisión: Mafer debe completarlo con sus datos fiscales y validarlo con asesoría legal antes de publicar la tienda.
      </p>
      <div className="mt-8 space-y-6">
        {page.sections.map(([h, p]) => (
          <section key={h}><h2 className="text-xl">{h}</h2><p className="mt-2 leading-relaxed text-cafe-500">{p}</p></section>
        ))}
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="contenedor py-24 text-center">
      <p className="font-display text-7xl text-empolvado">404</p>
      <h1 className="mt-4 text-3xl">Esta página se nos quemó en el horno</h1>
      <p className="mt-2 text-cafe-500">No encontramos lo que buscabas.</p>
      <Link to="/" className="btn-primario mt-8">Volver al inicio</Link>
    </div>
  );
}
