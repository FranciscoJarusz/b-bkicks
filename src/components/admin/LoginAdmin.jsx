import { useState } from "react";
import { supabase } from "@/lib/supabase.js";

const ADMIN_EMAIL =
    import.meta.env.PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ?? "";

/**
 * Pantalla de ingreso del panel. Al loguearse, AdminPanel se entera por el
 * onAuthStateChange de Supabase.
 */
export default function LoginAdmin({ status, setStatus }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");

    async function handleLogin(event) {
        event.preventDefault();
        setAuthError("");
        setStatus("Entrando...");

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setAuthError(error.message);
            setStatus("Ingresa con tu cuenta para administrar el stock.");
            return;
        }

        if (!ADMIN_EMAIL || data.user.email?.toLowerCase() !== ADMIN_EMAIL) {
            await supabase.auth.signOut();
            setAuthError("Esta cuenta no esta autorizada para el panel.");
            setStatus("Ingresa con tu cuenta para administrar el stock.");
            return;
        }

        setPassword("");
        setStatus("");
    }

    return (
        <section className="flex min-h-screen items-center justify-center bg-secondary px-6 py-12 text-secondary">
            <div className="mx-auto grid w-full max-w-6xl items-center gap-20 lg:gap-60 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="flex flex-col justify-center">
                    <span className="text-xs uppercase tracking-[0.35em] text-black">
                        Admin B&B KICKS
                    </span>
                    <h1 className="mt-4 max-w-xl font-accent text-5xl uppercase leading-none text-primary">
                        Controla stock, talles y productos desde un solo lugar.
                    </h1>
                    <p className="mt-6 max-w-xl text-sm leading-6 text-black">
                        Este panel trabaja directo contra Supabase. Para que
                        quede realmente seguro, necesitas policies RLS y
                        permisos del bucket para escribir solo al admin
                        autenticado.
                    </p>
                </div>

                <form
                    onSubmit={handleLogin}
                    className="flex flex-col gap-5 rounded-4xl border border-black/10 p-8 shadow-2xl shadow-black/20"
                >
                    <div className="flex flex-col items-start">
                        <h2 className="text-2xl font-bold text-black">
                            Iniciar Sesión
                        </h2>
                        <p className="mt-2 text-sm text-black/50">{status}</p>
                    </div>

                    <label className="text-sm flex flex-col gap-2">
                        <span className="font-semibold text-primary text-lg">
                            Email
                        </span>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-2xl border-2 border-black/10 px-4 py-3 text-black outline-none transition-all duration-300 focus:border-primary"
                            placeholder="admin@tudominio.com"
                            required
                        />
                    </label>

                    <label className="text-sm flex flex-col gap-2">
                        <span className="font-semibold text-primary text-lg">
                            Contraseña
                        </span>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            className="w-full rounded-2xl border-2 border-black/10 px-4 py-3 text-black outline-none transition-all duration-300 focus:border-primary"
                            placeholder="********"
                            required
                        />
                    </label>

                    {authError && (
                        <p className="mt-4 text-sm text-red-300">{authError}</p>
                    )}

                    <button
                        type="submit"
                        className="mt-10 lg:mt-20 w-full rounded-2xl bg-primary px-4 py-3 font-semibold text-secondary transition-all duration-300 hover:bg-primary-accent cursor-pointer"
                    >
                        Entrar al panel
                    </button>
                </form>
            </div>
        </section>
    );
}
