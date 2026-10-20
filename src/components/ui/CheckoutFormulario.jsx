import { formatearTalle } from "@/utils/talles.js";
import { ENTREGAS, MEDIOS_DE_PAGO, calcularTotales } from "@/utils/pedido.js";

const claseInput =
    "w-full rounded-xl border border-secondary/15 bg-white/2 px-4 py-3 text-sm text-secondary outline-none transition-colors duration-300 placeholder:text-secondary/30 focus:border-primary";
const claseLabel = "text-[0.7rem] font-semibold uppercase text-secondary/45";

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

/** El formulario de datos del checkout, dentro del panel del carrito. */
export default function CheckoutFormulario({
    items,
    cotizacion,
    enviando,
    errorEnvio,
    datos,
    errores,
    actualizarDato,
    onSubmit,
    onCancelar,
}) {
    const { total, totalAPagar, totalARS, precioSegunPago } = calcularTotales(
        items,
        datos.pago,
        cotizacion
    );

    return (
        <form
            onSubmit={onSubmit}
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
                                    precioSegunPago(item) * item.cantidad
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
                        ${totalAPagar.toLocaleString("es-AR")}
                    </span>
                </div>

                {totalARS && (
                    <p className="text-right text-sm text-secondary/75">
                        ≈{" "}
                        <span className="font-bold text-secondary">
                            ${totalARS.toLocaleString("es-AR")} ARS
                        </span>{" "}
                        (dólar a ${cotizacion.toLocaleString("es-AR")})
                    </p>
                )}

                {!datos.pago && (
                    <p className="text-right text-xs text-secondary/60">
                        ($
                        <span className="font-bold">
                            {total.toLocaleString("es-AR")}
                        </span>{" "}
                        en efectivo o transferencia)
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="checkout-nombre" className={claseLabel}>
                    Nombre completo <span className="text-primary">*</span>
                </label>

                <input
                    id="checkout-nombre"
                    type="text"
                    autoComplete="name"
                    placeholder="Tu nombre"
                    value={datos.nombre}
                    onChange={(e) => actualizarDato("nombre", e.target.value)}
                    className={claseInput}
                />

                {errores.nombre && (
                    <p className="text-xs text-primary">{errores.nombre}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <label htmlFor="checkout-telefono" className={claseLabel}>
                        Teléfono <span className="text-primary">*</span>
                    </label>

                    <input
                        id="checkout-telefono"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="11 1111 1111"
                        value={datos.telefono}
                        onChange={(e) =>
                            actualizarDato("telefono", e.target.value)
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
                    <label htmlFor="checkout-email" className={claseLabel}>
                        Email <span className="text-primary">*</span>
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
                        <p className="text-xs text-primary">{errores.email}</p>
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
                            onClick={() => actualizarDato("entrega", opcion.id)}
                            aria-pressed={datos.entrega === opcion.id}
                            className={`${claseTarjeta(
                                datos.entrega === opcion.id
                            )} py-3`}
                        >
                            {opcion.label}
                        </button>
                    ))}
                </div>

                {errores.entrega && (
                    <p className="text-xs text-primary">{errores.entrega}</p>
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
                                actualizarDato("direccion", e.target.value)
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
                                DNI <span className="text-primary">*</span>
                            </label>

                            <input
                                id="checkout-dni"
                                type="text"
                                inputMode="numeric"
                                placeholder="12345678"
                                value={datos.dni}
                                onChange={(e) =>
                                    actualizarDato("dni", e.target.value)
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
                                <span className="text-primary">*</span>
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
                    Medio de pago <span className="text-primary">*</span>
                </p>

                <div className="grid grid-cols-2 gap-3">
                    {MEDIOS_DE_PAGO.map((medio, indice) => (
                        <button
                            key={medio.id}
                            type="button"
                            onClick={() => actualizarDato("pago", medio.id)}
                            aria-pressed={datos.pago === medio.id}
                            className={`${claseTarjeta(
                                datos.pago === medio.id
                            )} py-4 ${
                                // Con una cantidad impar de medios, el ultimo
                                // queda solo: que ocupe toda la fila.
                                indice === MEDIOS_DE_PAGO.length - 1 &&
                                MEDIOS_DE_PAGO.length % 2 !== 0
                                    ? "col-span-2"
                                    : ""
                            }`}
                        >
                            <span aria-hidden="true">{medio.icono}</span>

                            {medio.label}
                        </button>
                    ))}
                </div>

                {errores.pago && (
                    <p className="text-xs text-primary">{errores.pago}</p>
                )}
            </div>

            <div className="flex flex-col gap-3">
                {errorEnvio && (
                    <p className="text-sm text-primary">{errorEnvio}</p>
                )}

                <button
                    type="submit"
                    disabled={enviando}
                    className="w-full cursor-pointer rounded-xl bg-primary py-3.5 text-2xl uppercase text-secondary font-accent transition-all duration-300 hover:bg-primary-accent disabled:cursor-wait disabled:opacity-60"
                >
                    {enviando ? "Un momento..." : "Confirmar y pagar"}
                </button>

                <button
                    type="button"
                    onClick={onCancelar}
                    className="w-full cursor-pointer rounded-xl border border-secondary/15 py-3 text-sm text-secondary/65 transition-all duration-300 hover:border-secondary/30 hover:text-secondary"
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
}
