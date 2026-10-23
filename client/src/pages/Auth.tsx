import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Alert, Field, LoadingButton, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../services/api";

/** Diseño de autenticación: ilustración + tarjeta (inspirado en la referencia visual de Mafer). */
function AuthShell({ title, subtitle, children, image = "/demo/pastel-fresas.svg" }: { title: string; subtitle?: string; children: ReactNode; image?: string }) {
  return (
    <div className="contenedor flex justify-center py-8 sm:py-14">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] bg-crema-50 shadow-[var(--shadow-elevada)] md:grid-cols-2">
        <div className="relative h-44 overflow-hidden md:h-auto">
          <img src={image} alt="" className="size-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-crema-50 md:hidden" />
          <div className="absolute bottom-6 left-6 hidden rounded-2xl bg-white/85 px-4 py-3 backdrop-blur md:block">
            <Logo tagline />
          </div>
        </div>
        <div className="px-6 pt-2 pb-8 sm:px-10 md:py-12">
          <h1 className="text-center text-3xl md:text-left">{title}</h1>
          {subtitle && <p className="mt-2 text-center text-sm text-cafe-500 md:text-left">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, error, autoComplete, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false);
  const id = label.replace(/\s/g, "-").toLowerCase();
  return (
    <div>
      <label htmlFor={id} className="etiqueta">{label} <span className="text-rosa-600">*</span></label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} className="campo pr-12" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required aria-invalid={!!error} />
        <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-cafe-500 hover:bg-crema-200" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error ? <p className="error-campo">{error}</p> : hint && <p className="ayuda">{hint}</p>}
    </div>
  );
}

const safeReturn = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : null);

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const back = safeReturn(params.get("volver"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const m = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: (u) => navigate(back ?? (u.role === "ADMIN" ? "/admin" : "/cuenta"), { replace: true }),
  });
  if (user && !m.isSuccess) return <Navigate to={back ?? "/cuenta"} replace />;

  return (
    <AuthShell title="Iniciar sesión" subtitle="Qué gusto verte de nuevo.">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <Field label="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="text-right"><Link to="/recuperar-contrasena" className="text-sm font-semibold text-rosa-600 hover:underline">¿Olvidaste tu contraseña?</Link></div>
        {m.error && <Alert kind="error">{m.error instanceof ApiError ? m.error.message : "No pudimos iniciar sesión."}</Alert>}
        <LoadingButton type="submit" loading={m.isPending} className="btn-cafe w-full">Entrar</LoadingButton>
      </form>
      <p className="mt-6 text-center text-sm text-cafe-500">¿Aún no tienes cuenta? <Link to={`/registro${back ? `?volver=${back}` : ""}`} className="font-bold text-rosa-600 hover:underline">Crear una cuenta</Link></p>
    </AuthShell>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const back = safeReturn(params.get("volver"));
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", acceptTerms: false });
  const [local, setLocal] = useState<Record<string, string>>({});
  const m = useMutation({ mutationFn: () => register(f), onSuccess: () => navigate(back ?? "/cuenta?bienvenida=1", { replace: true }) });
  if (user && !m.isSuccess) return <Navigate to="/cuenta" replace />;

  const server = m.error instanceof ApiError ? m.error.fieldErrors : {};
  const err = (k: string) => local[k] ?? server[k]?.[0];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.password.length < 8) errs.password = "Usa al menos 8 caracteres.";
    else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) errs.password = "Incluye letras y números.";
    if (f.password !== f.confirmPassword) errs.confirmPassword = "Las contraseñas no coinciden.";
    if (!f.acceptTerms) errs.acceptTerms = "Debes aceptar los términos y el aviso de privacidad.";
    setLocal(errs);
    if (!Object.keys(errs).length) m.mutate();
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <AuthShell title="Crear cuenta" subtitle="Guarda tus direcciones, favoritos y sigue tus pedidos." image="/demo/cupcakes-surtidos.svg">
      <form className="space-y-4" onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" autoComplete="given-name" required value={f.firstName} onChange={set("firstName")} error={err("firstName")} />
          <Field label="Apellidos" autoComplete="family-name" required value={f.lastName} onChange={set("lastName")} error={err("lastName")} />
        </div>
        <Field label="Correo electrónico" type="email" autoComplete="email" required value={f.email} onChange={set("email")} error={err("email")} />
        <PasswordField label="Contraseña" value={f.password} onChange={(v) => setF({ ...f, password: v })} autoComplete="new-password" error={err("password")} hint="Mínimo 8 caracteres, con letras y números." />
        <PasswordField label="Confirmar contraseña" value={f.confirmPassword} onChange={(v) => setF({ ...f, confirmPassword: v })} autoComplete="new-password" error={err("confirmPassword")} />
        <div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-rosa-600" checked={f.acceptTerms} onChange={(e) => setF({ ...f, acceptTerms: e.target.checked })} />
            <span>Acepto los <Link to="/legal/terminos" target="_blank" className="font-bold text-rosa-600 hover:underline">términos y condiciones</Link> y el <Link to="/legal/privacidad" target="_blank" className="font-bold text-rosa-600 hover:underline">aviso de privacidad</Link>.</span>
          </label>
          {err("acceptTerms") && <p className="error-campo">{err("acceptTerms")}</p>}
        </div>
        {m.error && <Alert kind="error">{(m.error as Error).message}</Alert>}
        <LoadingButton type="submit" loading={m.isPending} className="btn-cafe w-full">Crear cuenta</LoadingButton>
      </form>
      <p className="mt-6 text-center text-sm text-cafe-500">¿Ya tienes cuenta? <Link to="/ingresar" className="font-bold text-rosa-600 hover:underline">Inicia sesión</Link></p>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const m = useMutation({ mutationFn: () => api.forgot(email.trim()) });
  return (
    <AuthShell title="Recuperar contraseña" subtitle="Te enviaremos un enlace para crear una nueva." image="/demo/galletas-decoradas.svg">
      {m.isSuccess ? (
        <Alert kind="exito">{m.data.message}</Alert>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <Field label="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {m.error && <Alert kind="error">{(m.error as Error).message}</Alert>}
          <LoadingButton type="submit" loading={m.isPending} className="btn-cafe w-full">Enviar enlace</LoadingButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link to="/ingresar" className="font-bold text-rosa-600 hover:underline">Volver a iniciar sesión</Link></p>
    </AuthShell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const m = useMutation({ mutationFn: () => api.reset({ token, password, confirmPassword: confirm }) });
  const fe = m.error instanceof ApiError ? m.error.fieldErrors : {};
  return (
    <AuthShell title="Nueva contraseña" image="/demo/galletas-decoradas.svg">
      {!token ? (
        <Alert kind="error">El enlace no es válido. Solicita uno nuevo.</Alert>
      ) : m.isSuccess ? (
        <div className="space-y-4">
          <Alert kind="exito">{m.data.message}</Alert>
          <Link to="/ingresar" className="btn-cafe w-full">Iniciar sesión</Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <PasswordField label="Nueva contraseña" value={password} onChange={setPassword} autoComplete="new-password" error={fe.password?.[0]} hint="Mínimo 8 caracteres, con letras y números." />
          <PasswordField label="Confirmar contraseña" value={confirm} onChange={setConfirm} autoComplete="new-password" error={fe.confirmPassword?.[0]} />
          {m.error && <Alert kind="error">{(m.error as Error).message}</Alert>}
          <LoadingButton type="submit" loading={m.isPending} className="btn-cafe w-full">Guardar contraseña</LoadingButton>
        </form>
      )}
    </AuthShell>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { setUser, user } = useAuth();
  const ran = useRef(false);
  const m = useMutation({ mutationFn: () => api.verifyEmail(token), onSuccess: () => user && setUser({ ...user, emailVerified: true }) });
  useEffect(() => {
    if (token && !ran.current) {
      ran.current = true;
      m.mutate();
    }
  }, [token, m]);
  return (
    <AuthShell title="Verificación de correo">
      {!token || m.isError ? (
        <Alert kind="error">{m.error instanceof ApiError ? m.error.message : "El enlace no es válido."}</Alert>
      ) : m.isSuccess ? (
        <div className="space-y-4 text-center md:text-left">
          <CheckCircle2 className="size-10 text-exito" />
          <p>{m.data.message}</p>
          <Link to="/catalogo" className="btn-cafe">Ir al catálogo</Link>
        </div>
      ) : (
        <Spinner label="Verificando…" />
      )}
    </AuthShell>
  );
}
