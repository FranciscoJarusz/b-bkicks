import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase.js";
import { formatearTalle } from "@/utils/talles.js";
import { normalizarTelefono } from "@/utils/meta.js";
import { ENTREGAS, getMedioDePago } from "@/utils/pedido.js";

// "pagado" primero: son los que hay que preparar.
const FILTROS = [
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

const LIMITE = 100;

function formatearFecha(iso) {
    return new Date(iso).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function PedidosAdmin() {
    const [filtro, setFiltro] = useState("pagado");
    const [pedidos, setPedidos] = useState([]);
    const [status, setStatus] = useState("Cargando pedidos...");
    const [actualizando, setActualizando] = useState("");

    useEffect(() => {
        let vigente = true;
        setStatus("Cargando pedidos...");

        let consulta = supabase
            .from("pedido")
            .select("*")
            .order("creado", { ascending: false })
            .limit(LIMITE);
        if (filtro !== "todos") consulta = consulta.eq("estado", filtro);

        consulta.then(({ data, error }) => {
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

        // Con un filtro puesto, el pedido ya no pertenece a esta lista.
        setPedidos((lista) =>
            filtro === "todos"
                ? lista.map((p) => (p.id === pedido.id ? { ...p, estado } : p))
                : lista.filter((p) => p.id !== pedido.id)
        );
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
                    Los pagos con MercadoPago aparecen solos y ya descuentan el
                    stock. Al despacharlos, marcalos como entregados.
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
                    />
                ))}
            </ul>
        </div>
    );
}

function TarjetaPedido({ pedido, ocupado, cambiarEstado }) {
    const { cliente } = pedido;
    const etiqueta = ETIQUETAS[pedido.estado] ?? ETIQUETAS.pendiente;
    const entrega = ENTREGAS.find((e) => e.id === cliente.entrega)?.label;
    const medio = getMedioDePago(pedido.medio_pago)?.label ?? pedido.medio_pago;
    const whatsapp = `https://wa.me/${normalizarTelefono(cliente.telefono)}`;

    return (
        <li className="flex flex-col gap-4 bg-secondary p-5 ring-1 ring-black/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-lg font-semibold text-black">
                        {cliente.nombre}
                    </p>
                    <p className="text-xs text-black/50">
                        {formatearFecha(pedido.creado)} · {medio}
                    </p>
                </div>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${etiqueta.clase}`}
                >
                    {etiqueta.texto}
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
            </dl>

            <div className="flex flex-wrap gap-2">
                <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-black ring ring-black/20 transition-all duration-300 hover:ring-primary"
                >
                    Escribirle por WhatsApp
                </a>

                {pedido.estado === "pagado" && (
                    <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => cambiarEstado(pedido, "entregado")}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-secondary transition-all duration-300 hover:bg-primary-accent disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                    >
                        Marcar entregado
                    </button>
                )}

                {pedido.estado === "entregado" && (
                    <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => cambiarEstado(pedido, "pagado")}
                        className="rounded-xl px-4 py-2 text-sm font-semibold text-black/60 ring ring-black/10 transition-all duration-300 hover:text-black disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                    >
                        Deshacer entregado
                    </button>
                )}
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
