import { useState, useEffect } from "react";
import {
    getCarrito,
    agregarAlCarrito,
    restarDelCarrito,
    quitarDelCarrito,
    vaciarCarrito,
} from "@/utils/carrito.js";

const WHATSAPP_NUMERO = "5491125322786";

export default function Carrito() {
    const [abierto, setAbierto] = useState(false);
    const [items, setItems] = useState([]);

    function sincronizar() {
        setItems(getCarrito());
    }

    useEffect(() => {
        sincronizar();
        window.addEventListener("carrito-actualizado", sincronizar);
        return () => window.removeEventListener("carrito-actualizado", sincronizar);
    }, 
    
    []);

    const total = items.reduce((acc, i) => acc + i.price * i.cantidad, 0);
    const cantidad = items.reduce((acc, i) => acc + i.cantidad, 0);

    function finalizarCompra() {
        const lineas = items.map(
            (i) =>
                `- *${i.name}*${i.talle ? ` (Talle: *${i.talle}*)` : ""} *x${i.cantidad}* — $*${(i.price * i.cantidad).toLocaleString("es-AR")}*`
        );
        const mensaje =
            `*Nuevo pedido a través de la tienda online:*\n\n` +
            `¡Hola B&B KICKS! Acabo de elegir estos productos en la web:\n\n` +
            lineas.join("\n") +
            `\n\n*Total: $${total.toLocaleString("es-AR")}*`;
        const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    }

    return (
        <>
        
        <button
            onClick={() => setAbierto(true)}
            className="relative flex h-11 w-11 items-center justify-center text-secondary rounded-full transition-all duration-300 hover:bg-white/8 cursor-pointer"
            aria-label="Abrir carrito"
        >
            <img src="/shop.svg" alt="Carrito de compras" className="w-8 h-8"/>

            {cantidad > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-secondary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cantidad}
                </span>
            )}
        </button>

        {abierto && (
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setAbierto(false)}/>
        )}

        {abierto && (
            <button
                onClick={() => setAbierto(false)}
                className="fixed right-4 top-[calc(env(safe-area-inset-top)+2.85rem)] z-70 flex h-11 w-11 items-center justify-center rounded-full text-secondary transition-all duration-300 hover:bg-white/8 md:hidden cursor-pointer"
                aria-label="Cerrar carrito"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        )}

        <aside
            className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-black text-secondary shadow-2xl transition-transform duration-300 md:max-w-md ${
            abierto ? "translate-x-0" : "translate-x-full"
            }`}
        >
            <div className="flex min-h-[calc(env(safe-area-inset-top)+6.7rem)] items-end justify-between border-b border-secondary/10 px-6 pb-6 pt-[env(safe-area-inset-top)] md:min-h-0 md:items-center md:px-6 md:py-5">
            
                <h2 className="text-lg font-bold text-secondary">Carrito de compras</h2>

                <button
                    onClick={() => setAbierto(false)}
                    className="hidden cursor-pointer text-secondary/55 transition-colors duration-300 hover:text-secondary md:inline-flex"
                    aria-label="Cerrar carrito"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-8">
                
                {items.length === 0 ? (
                    
                    <div className="flex h-full items-center justify-center gap-3 text-secondary/55">
                        
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>

                        <p className="text-sm">El carrito de compras esta vacío.</p>
                        
                    </div>

                ) : (
                
                items.map((item) => (
                    <div key={`${item.slug}-${item.talle}`} className="flex flex-col gap-s">
                    
                        <div className="flex gap-4 items-stretch">
                        
                        <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0">
                            {item.image ? (
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <span className="text-gray text-xs">Sin img</span>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                            
                            <p className="truncate text-xs font-semibold uppercase text-secondary/45">
                                {[item.category, item.marca].filter(Boolean).join(" ")}
                            </p>

                            <p className="truncate text-sm leading-tight font-semibold text-secondary">
                                {item.name}
                                {item.talle ? ` (${item.talle})` : ""}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className="flex w-fit items-center gap-2 rounded-xl border border-secondary/15 px-3 py-1">
                                    <button
                                        onClick={() => restarDelCarrito(item.slug, item.talle)}
                                        disabled={item.cantidad <= 1}
                                        className={`flex h-6 w-6 items-center justify-center cursor-pointer leading-none text-secondary/75 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${item.cantidad > 1 ? "hover:text-primary" : ""}`}
                                        aria-label="Restar uno"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4"/>
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
                                        category: item.category,
                                        image: item.image,
                                        price: item.price,
                                        talle: item.talle,
                                        stock: item.stock,
                                        })
                                        }
                                        disabled={item.stock != null && item.cantidad >= item.stock}
                                        className={`flex h-6 w-6 items-center justify-center cursor-pointer leading-none text-secondary/75 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${item.stock == null || item.cantidad < item.stock ? "hover:text-primary" : ""}`}
                                        aria-label="Sumar uno"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                                        </svg>
                                    </button>
                                </div>

                                <button
                                    onClick={() => quitarDelCarrito(item.slug, item.talle)}
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

            {items.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-secondary/10 px-6 py-5">

                    <div className="flex items-center justify-between text-xl font-bold text-secondary">
                        <span>Total:</span>
                        
                        <span>
                            ${total.toLocaleString("es-AR")}
                        </span> 
                    </div>

                    <button
                        onClick={finalizarCompra}
                        className="w-full cursor-pointer rounded-xl bg-primary py-3 font-semibold text-secondary transition-all duration-300 hover:bg-primary-accent"
                    >
                        Finalizar compra
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
