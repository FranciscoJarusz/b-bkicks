import { useState } from "react";
import { supabase } from "@/lib/supabase.js";

const ADMIN_EMAIL =
    import.meta.env.PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ?? "";

// Supabase responde en ingles; estos son los errores que se ven al loguearse.
function traducirError(error) {
    const mensaje = error?.message ?? "";
    if (/invalid login credentials/i.test(mensaje))
        return "Email o contraseña incorrectos.";
    if (/email not confirmed/i.test(mensaje))
        return "Falta confirmar el email de esta cuenta.";
    if (/rate limit|too many/i.test(mensaje))
        return "Demasiados intentos. Esperá unos minutos y probá de nuevo.";
    if (/fetch|network/i.test(mensaje))
        return "No hay conexión con el servidor. Revisá internet y probá de nuevo.";
    return mensaje || "No pudimos iniciar sesión.";
}

const INPUT =
    "w-full rounded-2xl border-2 border-black/10 px-4 py-3 text-black outline-none transition-all duration-300 focus:border-primary";

/**
 * Pantalla de ingreso del panel. Al loguearse, AdminPanel se entera por el
 * onAuthStateChange de Supabase.
 */
export default function LoginAdmin({ status, setStatus }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [verPassword, setVerPassword] = useState(false);
    const [entrando, setEntrando] = useState(false);
    const [authError, setAuthError] = useState("");

    async function handleLogin(event) {
        event.preventDefault();
        setAuthError("");
        setEntrando(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            setAuthError(traducirError(error));
            setEntrando(false);
            return;
        }

        if (!ADMIN_EMAIL || data.user.email?.toLowerCase() !== ADMIN_EMAIL) {
            await supabase.auth.signOut();
            setAuthError("Esta cuenta no esta autorizada para el panel.");
            setEntrando(false);
            return;
        }

        // El panel reemplaza esta pantalla en cuanto llega la sesion.
        setPassword("");
        setStatus("");
    }

    return (
        <section className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10 sm:px-6 sm:py-12">
            <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-32">
                <div className="flex flex-col justify-center">
                    <span className="text-xs uppercase tracking-[0.35em] text-black">
                        Admin B&B KICKS
                    </span>
                    <h1 className="mt-4 max-w-xl font-accent text-4xl uppercase leading-none text-primary sm:text-5xl">
                        Controla stock, talles y productos desde un solo lugar.
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-black/70 sm:mt-6">
                        Catálogo, encargos, pedidos y reels de la tienda.
                        Ingresá con la cuenta de administrador.
                    </p>
                </div>

                <form
                    onSubmit={handleLogin}
                    className="flex flex-col gap-5 rounded-4xl border border-black/10 p-6 shadow-2xl shadow-black/20 sm:p-8"
                >
                    <div className="flex flex-col items-start">
                        <h2 className="text-2xl font-bold text-black">
                            Iniciar Sesión
                        </h2>
                        {status && (
                            <p className="mt-2 text-sm text-black/50">
                                {status}
                            </p>
                        )}
                    </div>

                    <label className="flex flex-col gap-2 text-sm">
                        <span className="text-lg font-semibold text-primary">
                            Email
                        </span>
                        <input
                            type="email"
                            autoComplete="username"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className={INPUT}
                            placeholder="admin@tudominio.com"
                            required
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                        <span className="text-lg font-semibold text-primary">
                            Contraseña
                        </span>
                        <div className="relative">
                            <input
                                type={verPassword ? "text" : "password"}
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                className={`${INPUT} pr-20`}
                                placeholder="********"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setVerPassword((ver) => !ver)}
                                aria-pressed={verPassword}
                                className="absolute inset-y-0 right-2 my-auto h-9 rounded-xl px-3 text-xs font-semibold text-black/60 transition-all duration-300 hover:text-primary cursor-pointer"
                            >
                                {verPassword ? "Ocultar" : "Mostrar"}
                            </button>
                        </div>
                    </label>

                    {authError && (
                        <p
                            role="alert"
                            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
                        >
                            {authError}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={entrando}
                        className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 font-semibold text-secondary transition-all duration-300 hover:bg-primary-accent disabled:cursor-wait disabled:bg-black/40 cursor-pointer lg:mt-10"
                    >
                        {entrando ? "Entrando..." : "Entrar al panel"}
                    </button>
                </form>
            </div>
        </section>
    );
}
