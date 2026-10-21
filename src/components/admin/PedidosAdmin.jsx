import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase.js";
import { formatearTalle } from "@/utils/talles.js";
import { normalizarTelefono } from "@/utils/meta.js";
import { DATOS_DE_PAGO } from "@/config.js";
import { ENTREGAS, getMedioDePago } from "@/utils/pedido.js";

// "Por confirmar" primero: hay alguien esperando que se revise su
// transferencia. Despues lo que hay que preparar.
const FILTROS = [
    { id: "por-confirmar", label: "Por confirmar" },
    { id: "pagado", label: "Para despachar" },
    { id: "entregado", label: "Entregados" },
    { id: "pendiente", label: "Sin pagar" },
    { id: "todos", label: "Todos" },
];

const ETIQUETAS = {
    pendiente: { texto: "Sin pagar", clase: "bg-black/5 text-black/60" },
    pagado: { texto: "Pagado", clase: "bg-green-50 text-green-700" },
    entregado: { texto: "Entregado", clase: "bg-blue-50 text-blue-700" },
    cancelado: { texto: "Cancelado", clase: "bg-red-50 text-red-700" },
};

// Un pedido sin pagar y sin comprobante, pasadas 48 horas, es un carrito
// abandonado: deja de verse en "Sin pagar" (sigue en "Todos").
const HORAS_SIN_PAGAR = 48;

const LIMITE = 100;

// Cada boton tiene el color de lo que hace: verde confirma la plata, azul
// cierra la entrega (como la etiqueta "Entregado"), rojo borra. Los de
// consulta van con contorno.
const claseBase =
    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 hover:scale-102 active:scale-97 disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100 cursor-pointer";
const BOTONES = {
    confirmar: `${claseBase} bg-green-600 text-white hover:bg-green-700`,
    entregar: `${claseBase} bg-blue-600 text-white hover:bg-blue-700`,
    whatsapp: `${claseBase} text-green-700 ring-1 ring-green-600/40 hover:bg-green-50`,
    consulta: `${claseBase} text-black ring-1 ring-black/20 hover:bg-black/5`,
    borrar: `${claseBase} text-red-700 ring-1 ring-red-600/40 hover:bg-red-600 hover:text-white`,
    deshacer: `${claseBase} text-black/70 ring-1 ring-black/20 hover:bg-black/5 hover:text-black`,
};

// Paths de Heroicons (outline, 24px).
const ICONOS = {
    check: "M4.5 12.75l6 6 9-13.5",
    camion: "M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12",
    documento:
        "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    link: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
    tacho: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
    deshacer: "M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3",
    cruz: "M6 18L18 6M6 6l12 12",
};

// El logo de WhatsApp del sitio (public/whatsapp.svg), relleno con el color
// del boton.
const LOGO_WHATSAPP =
    "M3.50002 12C3.50002 7.30558 7.3056 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C10.3278 20.5 8.77127 20.0182 7.45798 19.1861C7.21357 19.0313 6.91408 18.9899 6.63684 19.0726L3.75769 19.9319L4.84173 17.3953C4.96986 17.0955 4.94379 16.7521 4.77187 16.4751C3.9657 15.176 3.50002 13.6439 3.50002 12ZM12 1.5C6.20103 1.5 1.50002 6.20101 1.50002 12C1.50002 13.8381 1.97316 15.5683 2.80465 17.0727L1.08047 21.107C0.928048 21.4637 0.99561 21.8763 1.25382 22.1657C1.51203 22.4552 1.91432 22.5692 2.28599 22.4582L6.78541 21.1155C8.32245 21.9965 10.1037 22.5 12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5ZM14.2925 14.1824L12.9783 15.1081C12.3628 14.7575 11.6823 14.2681 10.9997 13.5855C10.2901 12.8759 9.76402 12.1433 9.37612 11.4713L10.2113 10.7624C10.5697 10.4582 10.6678 9.94533 10.447 9.53028L9.38284 7.53028C9.23954 7.26097 8.98116 7.0718 8.68115 7.01654C8.38113 6.96129 8.07231 7.046 7.84247 7.24659L7.52696 7.52195C6.76823 8.18414 6.3195 9.2723 6.69141 10.3741C7.07698 11.5163 7.89983 13.314 9.58552 14.9997C11.3991 16.8133 13.2413 17.5275 14.3186 17.8049C15.1866 18.0283 16.008 17.7288 16.5868 17.2572L17.1783 16.7752C17.4313 16.5691 17.5678 16.2524 17.544 15.9269C17.5201 15.6014 17.3389 15.308 17.0585 15.1409L15.3802 14.1409C15.0412 13.939 14.6152 13.9552 14.2925 14.1824Z";

function Icono({ nombre }) {
    if (nombre === "whatsapp") {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
            >
                <path fillRule="evenodd" clipRule="evenodd" d={LOGO_WHATSAPP} />
            </svg>
        );
    }

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={ICONOS[nombre]}
            />
        </svg>
    );
}

function formatearFecha(iso) {
    return new Date(iso).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function consultaDe(filtro) {
    let consulta = supabase
        .from("pedido")
        .select("*")
        .order("creado", { ascending: false })
        .limit(LIMITE);

    if (filtro === "por-confirmar") {
        return consulta
            .eq("estado", "pendiente")
            .not("comprobante_path", "is", null);
    }
    if (filtro === "pendiente") {
        const desde = new Date(
            Date.now() - HORAS_SIN_PAGAR * 60 * 60 * 1000
        ).toISOString();
        return consulta
            .eq("estado", "pendiente")
            .is("comprobante_path", null)
            .gte("creado", desde);
    }
    if (filtro !== "todos") return consulta.eq("estado", filtro);

    return consulta;
}

export default function PedidosAdmin() {
    const [filtro, setFiltro] = useState("por-confirmar");
    const [pedidos, setPedidos] = useState([]);
    const [status, setStatus] = useState("Cargando pedidos...");
    const [actualizando, setActualizando] = useState("");

    useEffect(() => {
        let vigente = true;
        setStatus("Cargando pedidos...");

        consultaDe(filtro).then(({ data, error }) => {
            if (!vigente) return;
            if (error) {
                setStatus(
                    "No pudimos cargar los pedidos. Revisa que exista la tabla pedido."
                );
                return;
            }
            setPedidos(data ?? []);
            setStatus("");
        });

        return () => {
            vigente = false;
        };
    }, [filtro]);

    // Con un filtro puesto, un pedido que cambio de estado ya no pertenece a
    // esta lista.
    function reflejarEstado(pedido, estado) {
        setPedidos((lista) =>
            filtro === "todos"
                ? lista.map((p) => (p.id === pedido.id ? { ...p, estado } : p))
                : lista.filter((p) => p.id !== pedido.id)
        );
    }

    async function cambiarEstado(pedido, estado) {
        setActualizando(pedido.id);

        const { error } = await supabase
            .from("pedido")
            .update({
                estado,
                entregado:
                    estado === "entregado" ? new Date().toISOString() : null,
            })
            .eq("id", pedido.id);

        setActualizando("");

        if (error) {
            setStatus(`No pudimos actualizar el pedido. ${error.message}`);
            return;
        }

        reflejarEstado(pedido, estado);
    }

    // Confirmar y borrar pasan por el servidor: uno descuenta stock y el otro
    // borra el comprobante del bucket, y ninguna de las dos cosas se puede
    // hacer con los permisos del panel.
    async function pedirAlServidor(ruta, pedido) {
        const { data } = await supabase.auth.getSession();
        const res = await fetch(ruta, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.session?.access_token ?? ""}`,
            },
            body: JSON.stringify({ pedido: pedido.id }),
        });
        const cuerpo = await res.json().catch(() => null);
        if (!res.ok) throw new Error(cuerpo?.error);
    }

    async function confirmarPago(pedido) {
        if (
            !window.confirm(
                `¿Confirmás que entró el pago de ${pedido.cliente.nombre}? Se descuenta el stock.`
            )
        ) {
            return;
        }

        setActualizando(pedido.id);

        try {
            await pedirAlServidor("/api/pedido-confirmar", pedido);

            reflejarEstado(pedido, "pagado");
            setStatus(
                `Pago de ${pedido.cliente.nombre} confirmado. Ya está en "Para despachar".`
            );
        } catch (error) {
            setStatus(
                `No pudimos confirmar el pago. ${error?.message ?? ""}`.trim()
            );
        } finally {
            setActualizando("");
        }
    }

    function descartar(pedido) {
        if (
            window.confirm(
                `¿Descartar el pedido de ${pedido.cliente.nombre}? No se toca el stock.`
            )
        ) {
            cambiarEstado(pedido, "cancelado");
        }
    }

    async function borrar(pedido) {
        const aviso = ["pagado", "entregado"].includes(pedido.estado)
            ? " El stock que descontó NO vuelve."
            : "";
        if (
            !window.confirm(
                `¿Borrar para siempre el pedido de ${pedido.cliente.nombre}? No se puede deshacer.${aviso}`
            )
        ) {
            return;
        }

        setActualizando(pedido.id);

        try {
            await pedirAlServidor("/api/pedido-borrar", pedido);

            setPedidos((lista) => lista.filter((p) => p.id !== pedido.id));
            setStatus(`Pedido de ${pedido.cliente.nombre} borrado.`);
        } catch (error) {
            setStatus(
                `No pudimos borrar el pedido. ${error?.message ?? ""}`.trim()
            );
        } finally {
            setActualizando("");
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <span className="text-xs uppercase tracking-[0.3em] text-black/50">
                    Tienda
                </span>
                <h2 className="mt-2 text-3xl font-semibold text-black">
                    Pedidos
                </h2>
                <p className="mt-2 text-sm text-black/50">
                    Los pagos con MercadoPago se confirman solos. Las
                    transferencias, revisá que haya entrado la plata y
                    confirmalas: recién ahí se descuenta el stock.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {FILTROS.map((opcion) => (
                    <button
                        key={opcion.id}
                        type="button"
                        onClick={() => setFiltro(opcion.id)}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-300 cursor-pointer ${
                            filtro === opcion.id
                                ? "bg-black text-secondary"
                                : "ring ring-black/20 text-black hover:ring-primary"
                        }`}
                    >
                        {opcion.label}
                    </button>
                ))}
            </div>

            {status && <p className="text-sm text-black/50">{status}</p>}

            {!status && pedidos.length === 0 && (
                <p className="text-sm text-black/50">
                    No hay pedidos en esta lista.
                </p>
            )}

            <ul className="flex flex-col gap-4">
                {pedidos.map((pedido) => (
                    <TarjetaPedido
                        key={pedido.id}
                        pedido={pedido}
                        ocupado={actualizando === pedido.id}
                        cambiarEstado={cambiarEstado}
                        confirmarPago={confirmarPago}
                        descartar={descartar}
                        borrar={borrar}
                        avisar={setStatus}
                    />
                ))}
            </ul>
        </div>
    );
}

function TarjetaPedido({
    pedido,
    ocupado,
    cambiarEstado,
    confirmarPago,
    descartar,
    borrar,
    avisar,
}) {
    const { cliente } = pedido;
    const etiqueta = ETIQUETAS[pedido.estado] ?? ETIQUETAS.pendiente;
    const entrega = ENTREGAS.find((e) => e.id === cliente.entrega)?.label;
    const medio = getMedioDePago(pedido.medio_pago)?.label ?? pedido.medio_pago;
    const whatsapp = `https://wa.me/${normalizarTelefono(cliente.telefono)}`;
    const esMercadoPago = pedido.medio_pago === "mercadopago";
    const pendiente = pedido.estado === "pendiente";

    async function verComprobante() {
        // La pestaña se abre ya, en el click: despues de un await el navegador
        // la bloquearia como popup.
        const pestaña = window.open("", "_blank");

        const { data, error } = await supabase.storage
            .from("comprobantes")
            .createSignedUrl(pedido.comprobante_path, 5 * 60);

        if (error || !data?.signedUrl) {
            pestaña?.close();
            avisar("No pudimos abrir el comprobante.");
            return;
        }

        if (pestaña) pestaña.location.href = data.signedUrl;
        else window.location.href = data.signedUrl;
    }

    async function copiarLinkDePago() {
        try {
            await navigator.clipboard.writeText(
                `${window.location.origin}/pedido/${pedido.id}`
            );
            avisar(
                `Link de pago de ${cliente.nombre} copiado: pegáselo por WhatsApp.`
            );
        } catch {
            avisar(
                `Link de pago: ${window.location.origin}/pedido/${pedido.id}`
            );
        }
    }

    return (
        <li className="flex flex-col gap-4 bg-secondary p-5 ring-1 ring-black/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-lg font-semibold text-black">
                        {cliente.nombre}
                    </p>
                    <p className="text-xs text-black/50">
                        {formatearFecha(pedido.creado)} ·{" "}
                        <span className="font-bold text-black/80">{medio}</span>
                    </p>
                </div>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${etiqueta.clase}`}
                >
                    {pendiente && pedido.comprobante_path
                        ? "Comprobante subido"
                        : etiqueta.texto}
                </span>
            </div>

            <ul className="flex flex-col gap-1 text-sm text-black">
                {pedido.items.map((item) => (
                    <li key={`${item.slug}-${item.talle}`}>
                        {item.name}
                        {item.talle
                            ? ` (Talle ${formatearTalle(item.talle)})`
                            : ""}{" "}
                        <span className="font-semibold">x{item.cantidad}</span>
                    </li>
                ))}
            </ul>

            <p className="text-sm text-black">
                <span className="font-semibold">Total:</span>{" "}
                {pedido.total_ars
                    ? `$${Number(pedido.total_ars).toLocaleString("es-AR")} · `
                    : ""}
                USD {Number(pedido.total_usd).toLocaleString("es-AR")}
                {pedido.cotizacion
                    ? ` (dólar a $${Number(pedido.cotizacion).toLocaleString("es-AR")})`
                    : ""}
            </p>

            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <Dato titulo="Teléfono" valor={cliente.telefono} />
                <Dato titulo="Email" valor={cliente.email} />
                <Dato titulo="Entrega" valor={entrega} />
                {cliente.entrega === "envio" && (
                    <>
                        <Dato titulo="Dirección" valor={cliente.direccion} />
                        <Dato
                            titulo="Código postal"
                            valor={cliente.codigoPostal?.toUpperCase()}
                        />
                        <Dato titulo="DNI" valor={cliente.dni} />
                    </>
                )}
                {pedido.mp_payment_id && (
                    <Dato
                        titulo="Pago MercadoPago"
                        valor={`#${pedido.mp_payment_id}`}
                    />
                )}
                {pedido.comprobante_subido && (
                    <Dato
                        titulo="Comprobante"
                        valor={formatearFecha(pedido.comprobante_subido)}
                    />
                )}
            </dl>

            {/* La accion principal primero; descartar queda aparte, a la
                derecha, para no tocarlo sin querer. */}
            <div className="flex flex-wrap items-center gap-2">
                {pendiente && !esMercadoPago && (
                    <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => confirmarPago(pedido)}
                        className={BOTONES.confirmar}
                    >
                        <Icono nombre="check" />
                        Confirmar pago
                    </button>
                )}

                {pedido.estado === "pagado" && (
                    <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => cambiarEstado(pedido, "entregado")}
                        className={BOTONES.entregar}
                    >
                        <Icono nombre="camion" />
                        Marcar entregado
                    </button>
                )}

                {pedido.comprobante_path && (
                    <button
                        type="button"
                        onClick={verComprobante}
                        className={BOTONES.consulta}
                    >
                        <Icono nombre="documento" />
                        Ver comprobante
                    </button>
                )}

                <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={BOTONES.whatsapp}
                >
                    <Icono nombre="whatsapp" />
                    Escribirle por WhatsApp
                </a>

                {pendiente && pedido.medio_pago in DATOS_DE_PAGO && (
                    <button
                        type="button"
                        onClick={copiarLinkDePago}
                        className={BOTONES.consulta}
                    >
                        <Icono nombre="link" />
                        Copiar link de pago
                    </button>
                )}

                {pedido.estado === "entregado" && (
                    <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => cambiarEstado(pedido, "pagado")}
                        className={BOTONES.deshacer}
                    >
                        <Icono nombre="deshacer" />
                        Deshacer entregado
                    </button>
                )}

                <div className="flex flex-wrap gap-2 sm:ml-auto">
                    {pendiente && (
                        <button
                            type="button"
                            disabled={ocupado}
                            onClick={() => descartar(pedido)}
                            className={BOTONES.deshacer}
                        >
                            <Icono nombre="cruz" />
                            Descartar
                        </button>
                    )}

                    <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => borrar(pedido)}
                        className={BOTONES.borrar}
                    >
                        <Icono nombre="tacho" />
                        Borrar
                    </button>
                </div>
            </div>
        </li>
    );
}

function Dato({ titulo, valor }) {
    if (!valor) return null;

    return (
        <div className="flex gap-2">
            <dt className="text-black/50">{titulo}:</dt>
            <dd className="min-w-0 break-words text-black">{valor}</dd>
        </div>
    );
}
