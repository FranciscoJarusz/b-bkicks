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
            className="relative flex items-center gap-2 text-secondary hover:text-primary transition-colors duration-300 cursor-pointer"
            aria-label="Abrir carrito"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" nfill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 10a4 4 0 01-8 0"/>
            </svg>

            {cantidad > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-secondary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cantidad}
                </span>
            )}
        </button>

        {abierto && (
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setAbierto(false)}/>
        )}

        <aside
            className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
            abierto ? "translate-x-0" : "translate-x-full"
            }`}
        >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray/20">
            
                <h2 className="text-lg font-bold text-gray-900">Carrito de compras</h2>

                <button
                    onClick={() => setAbierto(false)}
                    className="text-gray/50 hover:text-black transition-colors duration-300 cursor-pointer"
                    aria-label="Cerrar carrito"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-8">
                
                {items.length === 0 ? (
                    
                    <div className="flex items-center justify-center h-full gap-3 text-gray-accent">
                        
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
                            
                            <p className="text-xs text-gray/50 uppercase font-semibold truncate">
                                {[item.category, item.marca].filter(Boolean).join(" ")}
                            </p>

                            <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                                {item.name}
                                {item.talle ? ` (${item.talle})` : ""}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 border border-gray/30 rounded-xl px-3 py-1 w-fit">
                                    <button
                                        onClick={() => restarDelCarrito(item.slug, item.talle)}
                                        disabled={item.cantidad <= 1}
                                        className={`w-6 h-6 flex items-center justify-center cursor-pointer leading-none text-gray/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${item.cantidad > 1 ? "hover:text-primary" : ""}`}
                                        aria-label="Restar uno"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4"/>
                                        </svg>
                                    </button>

                                    <span className="text-sm font-semibold w-4 text-center">
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
                                        className={`w-6 h-6 flex items-center justify-center cursor-pointer leading-none text-gray/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${item.stock == null || item.cantidad < item.stock ? "hover:text-primary" : ""}`}
                                        aria-label="Sumar uno"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                                        </svg>
                                    </button>
                                </div>

                                <button
                                    onClick={() => quitarDelCarrito(item.slug, item.talle)}
                                    className="text-sm ml-auto text-gray/80 hover:text-black transition-all duration-300 cursor-pointer"
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
                <div className="px-6 py-5 border-t border-gray/20 flex flex-col gap-3">

                    <div className="flex text-xl font-bold text-black justify-between items-center">
                        <span>Total:</span>
                        
                        <span>
                            ${total.toLocaleString("es-AR")}
                        </span> 
                    </div>

                    <button
                        onClick={finalizarCompra}
                        className="w-full bg-primary hover:bg-primary-accent text-secondary font-semibold py-3 rounded-xl transition-all duration-300 cursor-pointer"
                    >
                        Finalizar compra
                    </button>

                    <button
                    onClick={vaciarCarrito}
                    className="text-xs text-gray/80 hover:text-black transition-all duration-300 text-center cursor-pointer"
                    >
                        Vaciar carrito
                    </button>
                    
                </div>
            )}

        </aside>
        
        </>
    );
}
