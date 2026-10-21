import { useState, useEffect } from "react";
import {
    getCarrito,
    agregarAlCarrito,
    restarDelCarrito,
    quitarDelCarrito,
    vaciarCarrito,
    actualizarPreciosCarrito,
    getDatosCheckout,
    guardarDatosCheckout,
    limpiarDatosCheckout,
} from "@/utils/carrito.js";
import { formatearTalle } from "@/utils/talles.js";
import { cloudinaryUrl } from "@/utils/cloudinary.js";
import { DATOS_DE_PAGO, META_PIXEL_ID, urlWhatsApp } from "@/config.js";
import {
    DATOS_INICIALES,
    ENTREGAS,
    MEDIOS_DE_PAGO,
    armarMensajePedido,
    calcularTotales,
    validarCheckout,
} from "@/utils/pedido.js";
import CheckoutFormulario from "@/components/ui/CheckoutFormulario.jsx";
import {
    CLAVE_COMPRA_PENDIENTE,
    datosCoincidenciaAvanzada,
    guardarCoincidenciaAvanzada,
} from "@/utils/meta.js";

export default function Carrito() {
    const [abierto, setAbierto] = useState(false);
    const [items, setItems] = useState([]);
    // "carrito" = listado de productos, "checkout" = formulario de datos.
    const [vista, setVista] = useState("carrito");
    const [datos, setDatos] = useState(DATOS_INICIALES);
    const [errores, setErrores] = useState({});
    // Pesos por dolar; null mientras carga o si la API no responde.
    const [cotizacion, setCotizacion] = useState(null);
    // Mientras se arma el pago de MercadoPago, y el error si falla.
    const [enviando, setEnviando] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState("");

    function sincronizar() {
        setItems(getCarrito());
    }

    useEffect(() => {
        sincronizar();
        // Si el precio cambio en el admin desde que se agrego el producto.
        actualizarPreciosCarrito();
        window.addEventListener("carrito-actualizado", sincronizar);
        // El evento "carrito-actualizado" no cruza documentos: si Chrome
        // prerenderizo esta pagina antes de que el usuario tocara el carrito,
        // arranca con datos viejos. Releemos localStorage al activarse.
        document.addEventListener("prerenderingchange", sincronizar);
        // Idem entre pestañas abiertas.
        window.addEventListener("storage", sincronizar);

        return () => {
            window.removeEventListener("carrito-actualizado", sincronizar);
            document.removeEventListener("prerenderingchange", sincronizar);
            window.removeEventListener("storage", sincronizar);
        };
    }, []);

    // Si el cliente vuelve atras desde MercadoPago, el navegador restaura la
    // pagina tal como estaba: el boton no puede quedar trabado en "enviando".
    useEffect(() => {
        const alVolver = (e) => e.persisted && setEnviando(false);
        window.addEventListener("pageshow", alVolver);
        return () => window.removeEventListener("pageshow", alVolver);
    }, []);

    // El borrador no se puede leer en el useState: en el render del servidor no
    // hay localStorage y no queremos romper la hidratación.
    useEffect(() => {
        const guardado = getDatosCheckout();
        if (!guardado) return;

        setDatos({
            ...DATOS_INICIALES,
            ...guardado,
            // Una opción que ya no ofrecemos no puede quedar elegida.
            entrega: ENTREGAS.some((e) => e.id === guardado.entrega)
                ? guardado.entrega
                : "",
            pago: MEDIOS_DE_PAGO.some((m) => m.id === guardado.pago)
                ? guardado.pago
                : "",
        });
    }, []);

    useEffect(() => {
        // Nada tipeado todavía (o recién enviado): no ensuciamos el storage.
        if (Object.values(datos).every((valor) => !valor)) return;

        guardarDatosCheckout(datos);
    }, [datos]);

    // Si el carrito queda vacío mientras se completaba el formulario, no tiene
    // sentido seguir en el checkout.
    useEffect(() => {
        if (items.length === 0) setVista("carrito");
    }, [items.length]);

    // Con el panel abierto (carrito o checkout) el scroll tiene que quedar
    // adentro: frenamos Lenis y fijamos el body. En iOS `overflow: hidden` no
    // alcanza, por eso el body pasa a `position: fixed` compensando el offset.
    useEffect(() => {
        if (!abierto) return;

        const { body } = document;
        const scrollPrevio = window.scrollY;
        const anchoScrollbar =
            window.innerWidth - document.documentElement.clientWidth;
        const estilosPrevios = {
            position: body.style.position,
            top: body.style.top,
            width: body.style.width,
            overflow: body.style.overflow,
            paddingRight: body.style.paddingRight,
        };

        window.lenisInstance?.stop();
        body.style.position = "fixed";
        body.style.top = `-${scrollPrevio}px`;
        body.style.width = "100%";
        body.style.overflow = "hidden";
        if (anchoScrollbar > 0) body.style.paddingRight = `${anchoScrollbar}px`;

        return () => {
            Object.assign(body.style, estilosPrevios);
            window.scrollTo(0, scrollPrevio);
            window.lenisInstance?.start();
        };
    }, [abierto]);

    const enCheckout = vista === "checkout";

    // La cotizacion solo hace falta en el checkout, y se pide cada vez que se
    // entra para que no quede vieja con el panel abierto un rato.
    useEffect(() => {
        if (!enCheckout) return;

        let vigente = true;
        fetch("/api/cotizacion")
            .then((res) => (res.ok ? res.json() : null))
            .then((cot) => {
                if (vigente) setCotizacion(cot?.venta ?? null);
            })
            .catch(() => {
                if (vigente) setCotizacion(null);
            });

        return () => {
            vigente = false;
        };
    }, [enCheckout]);

    const { total, totalLista, totalAPagar } = calcularTotales(
        items,
        datos.pago,
        cotizacion
    );
    const cantidad = items.reduce((acc, i) => acc + i.cantidad, 0);

    function actualizarDato(campo, valor) {
        setDatos((d) => ({ ...d, [campo]: valor }));
        setErrores((e) => ({ ...e, [campo]: undefined }));
    }

    function iniciarCompra() {
        if (typeof window.fbq === "function") {
            window.fbq("track", "InitiateCheckout", {
                contents: items.map((i) => ({
                    id: i.slug,
                    quantity: i.cantidad,
                })),
                num_items: cantidad,
                value: total,
                currency: "USD",
            });
        }

        setVista("checkout");
    }

    function validar() {
        const nuevos = validarCheckout(datos, cotizacion);
        setErrores(nuevos);
        return Object.keys(nuevos).length === 0;
    }

    function cuerpoDelPedido() {
        return JSON.stringify({
            items: items.map(({ slug, talle, cantidad }) => ({
                slug,
                talle,
                cantidad,
            })),
            datos,
        });
    }

    /**
     * MercadoPago, transferencia y cripto: el servidor guarda el pedido y
     * devuelve a donde seguir (MercadoPago o /pedido/<id> con los datos para
     * pagar).
     */
    async function enviarPedido() {
        setEnviando(true);
        setErrorEnvio("");

        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: cuerpoDelPedido(),
            });
            const cuerpo = await res.json().catch(() => null);

            if (!res.ok || !cuerpo?.url) {
                throw new Error(cuerpo?.error);
            }

            if (datos.pago !== "mercadopago") {
                // El pedido ya esta guardado y su pagina tiene todo: el
                // carrito no hace mas falta.
                vaciarCarrito();
                limpiarDatosCheckout();
                window.location.href = cuerpo.url;
                return;
            }

            // El Purchase del pixel sale en /pago/exito, cuando ya no tenemos
            // el carrito a mano: le dejamos los datos en esta pestaña.
            try {
                sessionStorage.setItem(
                    CLAVE_COMPRA_PENDIENTE,
                    JSON.stringify({
                        contents: items.map((i) => ({
                            id: i.slug,
                            quantity: i.cantidad,
                        })),
                        num_items: cantidad,
                        value: totalAPagar,
                        currency: "USD",
                    })
                );
            } catch {
                // Sin storage no hay Purchase, pero el pago sigue.
            }

            // Se va a MercadoPago con el carrito intacto: se vacia recien
            // cuando vuelve con el pago aprobado (/pago/exito).
            window.location.href = cuerpo.url;
        } catch (error) {
            setErrorEnvio(
                error?.message || "No pudimos tomar el pedido. Probá de nuevo."
            );
            setEnviando(false);
        }
    }

    function confirmarCompra(evento) {
        evento.preventDefault();
        if (enviando || !validar()) return;

        // Las visitas siguientes arrancan el pixel con estos datos.
        guardarCoincidenciaAvanzada(datos);

        if (typeof window.fbq === "function") {
            // Las coincidencias avanzadas se cargan re-inicializando el pixel:
            // aplican a los eventos que se disparan despues de este init.
            window.fbq("init", META_PIXEL_ID, datosCoincidenciaAvanzada(datos));

            window.fbq("track", "Lead", {
                contents: items.map((i) => ({
                    id: i.slug,
                    quantity: i.cantidad,
                })),
                num_items: cantidad,
                value: totalAPagar,
                currency: "USD",
            });
        }

        if (datos.pago === "mercadopago" || datos.pago in DATOS_DE_PAGO) {
            enviarPedido();
            return;
        }

        // Efectivo: sigue por WhatsApp. El pedido se guarda igual para que
        // quede en el admin, pero sin esperar la respuesta: window.open
        // despues de un await lo bloquean los navegadores. keepalive hace que
        // el envio termine aunque esta pagina se cierre o navegue.
        fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: cuerpoDelPedido(),
            keepalive: true,
        }).catch(() => {});

        const mensaje = armarMensajePedido(items, datos, cotizacion);

        const url = urlWhatsApp(mensaje);

        // Sin "noopener" en las features: con esa opcion window.open devuelve
        // siempre null y no podriamos saber si la pestaña se abrio. El opener
        // lo cortamos a mano.
        const pestaña = window.open(url, "_blank");

        // El pedido ya salio: vaciamos el carrito y borramos el borrador. La
        // conversacion sigue en WhatsApp.
        vaciarCarrito();
        limpiarDatosCheckout();

        if (pestaña) {
            pestaña.opener = null;
            window.location.href = "/";
        } else {
            // Los navegadores internos de Instagram y Facebook a veces bloquean
            // la pestaña nueva: abrimos WhatsApp en esta misma para que el
            // pedido no se pierda.
            window.location.href = url;
        }
    }

    return (
        <>
            <button
                onClick={() => setAbierto(true)}
                className="relative flex h-11 w-11 items-center justify-center text-secondary rounded-full transition-all duration-300 hover:bg-white/8 cursor-pointer"
                aria-label="Abrir carrito"
            >
                <img
                    src="/shop.svg"
                    alt="Carrito de compras"
                    className="w-8 h-8"
                />

                {cantidad > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary text-secondary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {cantidad}
                    </span>
                )}
            </button>

            {abierto && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setAbierto(false)}
                />
            )}

            {abierto && (
                <button
                    onClick={() => setAbierto(false)}
                    className="fixed right-4 top-[calc(env(safe-area-inset-top)+2.85rem)] z-70 flex h-11 w-11 items-center justify-center rounded-full text-secondary transition-all duration-300 hover:bg-white/8 md:hidden cursor-pointer"
                    aria-label="Cerrar carrito"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            )}

            <aside
                className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-black text-secondary shadow-2xl transition-transform duration-300 md:max-w-md ${
                    abierto ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <div className="flex min-h-[calc(env(safe-area-inset-top)+6.7rem)] items-end justify-between border-b border-secondary/10 px-6 pb-6 pt-[env(safe-area-inset-top)] md:min-h-0 md:items-center md:px-6 md:py-5">
                    <div className="flex min-w-0 items-center gap-2">
                        {enCheckout && (
                            <button
                                onClick={() => setVista("carrito")}
                                className="-ml-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-secondary/75 transition-all duration-300 hover:bg-white/8 hover:text-secondary"
                                aria-label="Volver al carrito"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-5 h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 19l-7-7 7-7"
                                    />
                                </svg>
                            </button>
                        )}

                        <h2 className="truncate text-lg font-bold text-secondary">
                            {enCheckout
                                ? "Finalizar compra"
                                : "Carrito de compras"}
                        </h2>
                    </div>

                    <button
                        onClick={() => setAbierto(false)}
                        className="hidden cursor-pointer text-secondary/55 transition-colors duration-300 hover:text-secondary md:inline-flex"
                        aria-label="Cerrar carrito"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-6 h-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {enCheckout ? (
                    <CheckoutFormulario
                        items={items}
                        cotizacion={cotizacion}
                        enviando={enviando}
                        errorEnvio={errorEnvio}
                        datos={datos}
                        errores={errores}
                        actualizarDato={actualizarDato}
                        onSubmit={confirmarCompra}
                        onCancelar={() => setVista("carrito")}
                    />
                ) : (
                    <div
                        data-lenis-prevent
                        className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-8"
                    >
                        {items.length === 0 ? (
                            <div className="flex h-full items-center justify-center gap-3 text-secondary/55">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-6 h-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                    />
                                    <line
                                        x1="12"
                                        y1="9"
                                        x2="12"
                                        y2="13"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <line
                                        x1="12"
                                        y1="17"
                                        x2="12.01"
                                        y2="17"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>

                                <p className="text-sm">
                                    El carrito de compras esta vacío.
                                </p>
                            </div>
                        ) : (
                            items.map((item) => (
                                <div
                                    key={`${item.slug}-${item.talle}`}
                                    className="flex flex-col gap-s"
                                >
                                    <div className="flex gap-4 items-stretch">
                                        <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0">
                                            {item.image ? (
                                                <img
                                                    src={cloudinaryUrl(
                                                        item.image,
                                                        {
                                                            width: 150,
                                                            height: 150,
                                                        }
                                                    )}
                                                    alt={item.name}
                                                    className="object-cover w-full h-full"
                                                />
                                            ) : (
                                                <span className="text-black/50 text-xs">
                                                    Sin img
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <p className="truncate text-xs font-semibold uppercase text-secondary/45">
                                                {[item.category, item.marca]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                            </p>

                                            <p className="truncate text-sm leading-tight font-semibold text-secondary">
                                                {item.name}
                                                {item.talle
                                                    ? ` (${formatearTalle(item.talle)})`
                                                    : ""}
                                            </p>

                                            <div className="flex items-center justify-between">
                                                <div className="flex w-fit items-center gap-2 rounded-xl border border-secondary/15 px-3 py-1">
                                                    <button
                                                        onClick={() =>
                                                            restarDelCarrito(
                                                                item.slug,
                                                                item.talle
                                                            )
                                                        }
                                                        disabled={
                                                            item.cantidad <= 1
                                                        }
                                                        className={`flex h-6 w-6 items-center justify-center cursor-pointer leading-none text-secondary/75 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${item.cantidad > 1 ? "hover:text-primary" : ""}`}
                                                        aria-label="Restar uno"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="w-3 h-3"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={2.5}
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M20 12H4"
                                                            />
                                                        </svg>
                                                    </button>

                                                    <span className="w-4 text-center text-sm font-semibold text-secondary">
                                                        {item.cantidad}
                                                    </span>

                                                    <button
                                                        onClick={() =>
                                                            agregarAlCarrito({
                                                                slug: item.slug,
                                                                name: item.name,
                                                                marca: item.marca,
                                                                category:
                                                                    item.category,
                                                                image: item.image,
                                                                price: item.price,
                                                                talle: item.talle,
                                                                stock: item.stock,
                                                            })
                                                        }
                                                        disabled={
                                                            item.stock !=
                                                                null &&
                                                            item.cantidad >=
                                                                item.stock
                                                        }
                                                        className={`flex h-6 w-6 items-center justify-center cursor-pointer leading-none text-secondary/75 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${item.stock == null || item.cantidad < item.stock ? "hover:text-primary" : ""}`}
                                                        aria-label="Sumar uno"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="w-3 h-3"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={2.5}
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M12 4v16m8-8H4"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() =>
                                                        quitarDelCarrito(
                                                            item.slug,
                                                            item.talle
                                                        )
                                                    }
                                                    className="ml-auto cursor-pointer text-sm text-secondary/65 transition-all duration-300 hover:text-secondary"
                                                    aria-label="Eliminar"
                                                >
                                                    Borrar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {!enCheckout && items.length > 0 && (
                    <div className="flex flex-col gap-3 border-t border-secondary/10 px-6 py-5">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xl font-bold text-secondary">
                                <span>Total:</span>

                                <span>
                                    ${totalLista.toLocaleString("es-AR")}
                                </span>
                            </div>

                            <p className="text-right text-xs text-secondary/60">
                                ($
                                <span className="font-bold">
                                    {total.toLocaleString("es-AR")}
                                </span>{" "}
                                en efectivo o transferencia)
                            </p>
                        </div>

                        <button
                            onClick={iniciarCompra}
                            className="w-full cursor-pointer rounded-xl bg-primary py-3 font-semibold text-secondary transition-all duration-300 hover:bg-primary-accent"
                        >
                            Iniciar compra
                        </button>

                        <button
                            onClick={vaciarCarrito}
                            className="cursor-pointer text-center text-xs text-secondary/65 transition-all duration-300 hover:text-secondary"
                        >
                            Vaciar carrito
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
}
