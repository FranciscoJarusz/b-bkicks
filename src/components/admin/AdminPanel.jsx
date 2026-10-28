import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase.js";
import LoginAdmin from "@/components/admin/LoginAdmin.jsx";
import ProductosAdmin from "@/components/admin/ProductosAdmin.jsx";
import ReelsAdmin from "@/components/admin/ReelsAdmin.jsx";
import PedidosAdmin from "@/components/admin/PedidosAdmin.jsx";
import { BOTON } from "@/components/admin/lib/estilos.js";

const ADMIN_EMAIL =
    import.meta.env.PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ?? "";

const TABS = [
    { id: "catalogo", label: "Catalogo" },
    { id: "encargos", label: "Encargos" },
    { id: "reels", label: "Reels" },
    { id: "pedidos", label: "Pedidos" },
];

const TEXTO_INGRESO = "Ingresa con tu cuenta para administrar la tienda.";

export default function AdminPanel() {
    const [session, setSession] = useState(null);
    // Hasta saber si hay sesion no mostramos nada: si no, el login aparece un
    // instante aunque ya estes logueado.
    const [listo, setListo] = useState(false);
    const [status, setStatus] = useState(TEXTO_INGRESO);
    const [tab, setTab] = useState("catalogo");

    useEffect(() => {
        let alive = true;

        supabase.auth.getSession().then(({ data, error }) => {
            if (!alive) return;
            if (error) setStatus("No pudimos recuperar la sesion.");
            setSession(data?.session ?? null);
            setListo(true);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, nextSession) => {
                if (!alive) return;
                setSession(nextSession);
                if (!nextSession) setStatus(TEXTO_INGRESO);
            }
        );

        return () => {
            alive = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Sin PUBLIC_ADMIN_EMAIL no habilitamos a nadie, igual que la API.
    const isAuthorized =
        session &&
        Boolean(ADMIN_EMAIL) &&
        session.user.email?.toLowerCase() === ADMIN_EMAIL;

    useEffect(() => {
        if (session && !isAuthorized) {
            setStatus("Esta cuenta no esta habilitada para el panel.");
        }
    }, [session, isAuthorized]);

    if (!listo) {
        return (
            <section className="flex min-h-screen items-center justify-center px-4">
                <p className="text-sm text-black/50" role="status">
                    Cargando panel...
                </p>
            </section>
        );
    }

    if (!isAuthorized) {
        return <LoginAdmin status={status} setStatus={setStatus} />;
    }

    const token = session.access_token;

    return (
        <section className="min-h-screen px-4 py-6 text-black md:px-6 md:py-10">
            <div className="mx-auto flex max-w-7xl flex-col gap-8 md:gap-10">
                <header className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <span className="text-xs uppercase tracking-[0.3em] text-black/50">
                                Panel Admin
                            </span>
                            <h1 className="mt-2 font-accent text-4xl uppercase leading-none text-primary sm:text-5xl">
                                B&B KICKS
                            </h1>
                            <p className="mt-2 truncate text-sm text-black/60">
                                Sesion activa: {session.user.email}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => supabase.auth.signOut()}
                            className={`${BOTON.oscuro} self-start sm:self-auto`}
                        >
                            Cerrar sesion
                        </button>
                    </div>

                    <nav
                        aria-label="Secciones del panel"
                        className="grid grid-cols-2 gap-2 sm:flex"
                    >
                        {TABS.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setTab(item.id)}
                                aria-current={
                                    tab === item.id ? "page" : undefined
                                }
                                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300 cursor-pointer ${
                                    tab === item.id
                                        ? "bg-primary text-secondary"
                                        : "ring ring-black/20 text-black hover:ring-primary"
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </header>

                <div className="border-t border-black/10 pt-8 md:pt-10">
                    {tab === "reels" ? (
                        <ReelsAdmin />
                    ) : tab === "pedidos" ? (
                        <PedidosAdmin />
                    ) : (
                        // Cada pestaña arranca de cero: sin seleccion ni
                        // producto abierto de la otra.
                        <ProductosAdmin
                            key={tab}
                            esEncargo={tab === "encargos"}
                            token={token}
                        />
                    )}
                </div>
            </div>
        </section>
    );
}
