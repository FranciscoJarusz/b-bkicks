import { useState, useEffect } from "react";
import {
    getCarrito,
    agregarAlCarrito,
    restarDelCarrito,
    quitarDelCarrito,
    vaciarCarrito,
    getDatosCheckout,
    guardarDatosCheckout,
    limpiarDatosCheckout,
} from "@/utils/carrito.js";
import { formatearTalle } from "@/utils/talles.js";
import { cloudinaryUrl } from "@/utils/cloudinary.js";
import {
    META_PIXEL_ID,
    datosCoincidenciaAvanzada,
    guardarCoincidenciaAvanzada,
} from "@/utils/meta.js";

const WHATSAPP_NUMERO = "5491125322786";

const MEDIOS_DE_PAGO = [
    { id: "mercadopago", icono: "💳", label: "MercadoPago" },
    { id: "transferencia", icono: "🏦", label: "Transferencia" },
    { id: "efectivo", icono: "💵", label: "Efectivo" },
];

const ENTREGAS = [
    { id: "envio", label: "Envío" },
    { id: "coordinar", label: "Coordinar entrega" },
];

const DATOS_INICIALES = {
    nombre: "",
    telefono: "",
    email: "",
    entrega: "",
    direccion: "",
    codigoPostal: "",
    dni: "",
    pago: "",
};

// Las tarjetas de entrega y de medio de pago comparten el mismo estilo. El
// padding vertical lo pone cada grupo: las de pago llevan emoji y necesitan
// mas alto que las de entrega, que son solo texto.
function claseTarjeta(activa) {
    return `flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-3 text-sm font-semibold transition-all duration-300 ${
        activa
            ? "border-primary bg-primary/15 text-secondary"
            : "border-secondary/15 bg-white/2 text-secondary/75 hover:border-primary/60 hover:text-secondary"
    }`;
}

export default function Carrito() {
    const [abierto, setAbierto] = useState(false);
    const [items, setItems] = useState([]);
    // "carrito" = listado de productos, "checkout" = formulario de datos.
    const [vista, setVista] = useState("carrito");
    const [datos, setDatos] = useState(DATOS_INICIALES);
    const [errores, setErrores] = useState({});

    function sincronizar() {
        setItems(getCarrito());
    }

    useEffect(() => {
        sincronizar();
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

    const total = items.reduce((acc, i) => acc + i.price * i.cantidad, 0);
    const cantidad = items.reduce((acc, i) => acc + i.cantidad, 0);

    const enCheckout = vista === "checkout";

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
                currency: "ARS",
            });
        }

        setVista("checkout");
    }

    function validar() {
        const nuevos = {};

        if (!datos.nombre.trim()) {
            nuevos.nombre = "Ingresá tu nombre completo.";
        }

        const telefono = datos.telefono.replace(/\D/g, "");
        if (!telefono) {
            nuevos.telefono = "Ingresá tu teléfono.";
        } else if (telefono.length < 8) {
            nuevos.telefono = "El teléfono no parece válido.";
        }

        const email = datos.email.trim();
        if (!email) {
            nuevos.email = "Ingresá tu email.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            nuevos.email = "El email no parece válido.";
        }

        if (!datos.entrega) {
            nuevos.entrega = "Elegí cómo querés recibir el pedido.";
        }

        // Coordinando la entrega no hace falta ninguno de estos datos.
        if (datos.entrega === "envio") {
            if (!datos.direccion.trim()) {
                nuevos.direccion = "Ingresá tu dirección de envío.";
            }

            const dni = datos.dni.replace(/\D/g, "");
            if (!dni) {
                nuevos.dni = "Ingresá tu DNI.";
            } else if (dni.length < 7 || dni.length > 8) {
                nuevos.dni = "El DNI no parece válido.";
            }

            const codigoPostal = datos.codigoPostal.trim();
            if (!codigoPostal) {
                nuevos.codigoPostal = "Ingresá tu código postal.";
                // Sirven tanto el viejo (1714) como el actual (B1714XYZ).
            } else if (!/^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/.test(codigoPostal)) {
                nuevos.codigoPostal = "El código postal no parece válido.";
            }
        }

        if (!datos.pago) {
            nuevos.pago = "Elegí un medio de pago.";
        }

        setErrores(nuevos);
        return Object.keys(nuevos).length === 0;
    }

    function confirmarCompra(evento) {
        evento.preventDefault();
        if (!validar()) return;

        const lineas = items.map(
            (i) =>
                `- *${i.name}*${i.talle ? ` (Talle: *${formatearTalle(i.talle)}*)` : ""} *x${i.cantidad}* — $*${(i.price * i.cantidad).toLocaleString("es-AR")}*`
        );

        const medioDePago = MEDIOS_DE_PAGO.find(
            (m) => m.id === datos.pago
        )?.label;

        const entrega = ENTREGAS.find((e) => e.id === datos.entrega)?.label;

        const misDatos = [
            `- *Nombre:* ${datos.nombre.trim()}`,
            `- *Teléfono:* ${datos.telefono.trim()}`,
            `- *Email:* ${datos.email.trim()}`,
            `- *Entrega:* ${entrega}`,
            // Coordinando la entrega estos datos no se piden.
            ...(datos.entrega === "envio"
                ? [
                      `- *Dirección:* ${datos.direccion.trim()}`,
                      `- *Código postal:* ${datos.codigoPostal.trim().toUpperCase()}`,
                      `- *DNI:* ${datos.dni.trim()}`,
                  ]
                : []),
            `- *Medio de pago:* ${medioDePago}`,
        ];

        const mensaje =
            `*Nuevo pedido a través de la tienda online:*\n\n` +
            `¡Hola B&B KICKS! Acabo de elegir estos productos en la web:\n\n` +
            lineas.join("\n") +
            `\n\n*Total: $${total.toLocaleString("es-AR")}*` +
            `\n\n*Mis datos:*\n\n` +
            misDatos.join("\n");

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
                value: total,
                currency: "ARS",
            });
        }

        const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, "_blank", "noopener,noreferrer");

        // El pedido ya salio: vaciamos el carrito, borramos el borrador y
        // volvemos al inicio. La conversacion sigue en WhatsApp.
        vaciarCarrito();
        limpiarDatosCheckout();
        window.location.href = "/";
    }

    const claseInput =
        "w-full rounded-xl border border-secondary/15 bg-white/2 px-4 py-3 text-sm text-secondary outline-none transition-colors duration-300 placeholder:text-secondary/30 focus:border-primary";
    const claseLabel =
        "text-[0.7rem] font-semibold uppercase text-secondary/45";

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
                    <form
                        onSubmit={confirmarCompra}
                        noValidate
                        data-lenis-prevent
                        className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6"
                    >
                        <div className="flex flex-col gap-1">
                            <h3 className="text-4xl uppercase font-accent">
                                Finalizar compra
                            </h3>

                            <p className="text-sm text-secondary/55">
                                Completá tus datos para continuar.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 rounded-2xl bg-white/4 p-4">
                            <p className={claseLabel}>Resumen</p>

                            <div className="flex flex-col gap-2">
                                {items.map((item) => (
                                    <div
                                        key={`${item.slug}-${item.talle}`}
                                        className="flex items-baseline justify-between gap-3 text-sm"
                                    >
                                        <span className="min-w-0 truncate text-secondary/85">
                                            {item.name}
                                            {item.talle
                                                ? ` (${formatearTalle(item.talle)})`
                                                : ""}{" "}
                                            ×{item.cantidad}
                                        </span>

                                        <span className="shrink-0 font-bold text-secondary">
                                            $
                                            {(
                                                item.price * item.cantidad
                                            ).toLocaleString("es-AR")}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between border-t border-secondary/10 pt-3">
                                <span className="text-2xl uppercase text-secondary font-accent">
                                    Total
                                </span>

                                <span className="text-2xl font-bold">
                                    ${total.toLocaleString("es-AR")}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="checkout-nombre"
                                className={claseLabel}
                            >
                                Nombre completo{" "}
                                <span className="text-primary">*</span>
                            </label>

                            <input
                                id="checkout-nombre"
                                type="text"
                                autoComplete="name"
                                placeholder="Tu nombre"
                                value={datos.nombre}
                                onChange={(e) =>
                                    actualizarDato("nombre", e.target.value)
                                }
                                className={claseInput}
                            />

                            {errores.nombre && (
                                <p className="text-xs text-primary">
                                    {errores.nombre}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="checkout-telefono"
                                    className={claseLabel}
                                >
                                    Teléfono{" "}
                                    <span className="text-primary">*</span>
                                </label>

                                <input
                                    id="checkout-telefono"
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    placeholder="11 1111 1111"
                                    value={datos.telefono}
                                    onChange={(e) =>
                                        actualizarDato(
                                            "telefono",
                                            e.target.value
                                        )
                                    }
                                    className={claseInput}
                                />

                                {errores.telefono && (
                                    <p className="text-xs text-primary">
                                        {errores.telefono}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="checkout-email"
                                    className={claseLabel}
                                >
                                    Email{" "}
                                    <span className="text-primary">*</span>
                                </label>

                                <input
                                    id="checkout-email"
                                    type="email"
                                    inputMode="email"
                                    autoComplete="email"
                                    placeholder="tuemail@gmail.com"
                                    value={datos.email}
                                    onChange={(e) =>
                                        actualizarDato("email", e.target.value)
                                    }
                                    className={claseInput}
                                />

                                {errores.email && (
                                    <p className="text-xs text-primary">
                                        {errores.email}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <p className={claseLabel}>
                                Entrega <span className="text-primary">*</span>
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                {ENTREGAS.map((opcion) => (
                                    <button
                                        key={opcion.id}
                                        type="button"
                                        onClick={() =>
                                            actualizarDato("entrega", opcion.id)
                                        }
                                        aria-pressed={
                                            datos.entrega === opcion.id
                                        }
                                        className={`${claseTarjeta(
                                            datos.entrega === opcion.id
                                        )} py-3`}
                                    >
                                        {opcion.label}
                                    </button>
                                ))}
                            </div>

                            {errores.entrega && (
                                <p className="text-xs text-primary">
                                    {errores.entrega}
                                </p>
                            )}
                        </div>

                        {/* Coordinando la entrega no hace falta pedir nada de esto. */}
                        {datos.entrega === "envio" && (
                            <>
                                <div className="flex flex-col gap-2">
                                    <label
                                        htmlFor="checkout-direccion"
                                        className={claseLabel}
                                    >
                                        Dirección de envío{" "}
                                        <span className="text-primary">*</span>
                                    </label>

                                    <input
                                        id="checkout-direccion"
                                        type="text"
                                        autoComplete="street-address"
                                        placeholder="Av. Corrientes 1234"
                                        value={datos.direccion}
                                        onChange={(e) =>
                                            actualizarDato(
                                                "direccion",
                                                e.target.value
                                            )
                                        }
                                        className={claseInput}
                                    />

                                    {errores.direccion && (
                                        <p className="text-xs text-primary">
                                            {errores.direccion}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label
                                            htmlFor="checkout-dni"
                                            className={claseLabel}
                                        >
                                            DNI{" "}
                                            <span className="text-primary">
                                                *
                                            </span>
                                        </label>

                                        <input
                                            id="checkout-dni"
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="12345678"
                                            value={datos.dni}
                                            onChange={(e) =>
                                                actualizarDato(
                                                    "dni",
                                                    e.target.value
                                                )
                                            }
                                            className={claseInput}
                                        />

                                        {errores.dni && (
                                            <p className="text-xs text-primary">
                                                {errores.dni}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label
                                            htmlFor="checkout-codigo-postal"
                                            className={claseLabel}
                                        >
                                            Código postal{" "}
                                            <span className="text-primary">
                                                *
                                            </span>
                                        </label>

                                        <input
                                            id="checkout-codigo-postal"
                                            type="text"
                                            autoComplete="postal-code"
                                            placeholder="1714"
                                            value={datos.codigoPostal}
                                            onChange={(e) =>
                                                actualizarDato(
                                                    "codigoPostal",
                                                    e.target.value
                                                )
                                            }
                                            className={claseInput}
                                        />

                                        {errores.codigoPostal && (
                                            <p className="text-xs text-primary">
                                                {errores.codigoPostal}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex flex-col gap-2">
                            <p className={claseLabel}>
                                Medio de pago{" "}
                                <span className="text-primary">*</span>
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                {MEDIOS_DE_PAGO.map((medio, indice) => (
                                    <button
                                        key={medio.id}
                                        type="button"
                                        onClick={() =>
                                            actualizarDato("pago", medio.id)
                                        }
                                        aria-pressed={datos.pago === medio.id}
                                        className={`${claseTarjeta(
                                            datos.pago === medio.id
                                        )} py-4 ${
                                            // Con una cantidad impar de medios, el ultimo
                                            // queda solo: que ocupe toda la fila.
                                            indice ===
                                                MEDIOS_DE_PAGO.length - 1 &&
                                            MEDIOS_DE_PAGO.length % 2 !== 0
                                                ? "col-span-2"
                                                : ""
                                        }`}
                                    >
                                        <span aria-hidden="true">
                                            {medio.icono}
                                        </span>

                                        {medio.label}
                                    </button>
                                ))}
                            </div>

                            {errores.pago && (
                                <p className="text-xs text-primary">
                                    {errores.pago}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                type="submit"
                                className="w-full cursor-pointer rounded-xl bg-primary py-3.5 text-2xl uppercase text-secondary font-accent transition-all duration-300 hover:bg-primary-accent"
                            >
                                Confirmar y pagar
                            </button>

                            <button
                                type="button"
                                onClick={() => setVista("carrito")}
                                className="w-full cursor-pointer rounded-xl border border-secondary/15 py-3 text-sm text-secondary/65 transition-all duration-300 hover:border-secondary/30 hover:text-secondary"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
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
                        <div className="flex items-center justify-between text-xl font-bold text-secondary">
                            <span>Total:</span>

                            <span>${total.toLocaleString("es-AR")}</span>
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
