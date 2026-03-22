import { useState, useEffect } from 'react';
import { agregarAlCarrito, getCarrito } from '@/utils/carrito.js';

const ORDEN_TALLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function normalizarTalles(talles) {
    return talles
    .filter(Boolean)
    .map(t => typeof t === 'string' ? { nombre: t, stock: 1 } : t)
    .filter(t => t.nombre);
}

function ordenarTalles(talles) {
    return [...talles].sort((a, b) => {
        const ia = ORDEN_TALLES.indexOf(a.nombre.toUpperCase());
        const ib = ORDEN_TALLES.indexOf(b.nombre.toUpperCase());
        if (ia === -1 && ib === -1) return a.nombre.localeCompare(b.nombre);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}

export default function AgregarAlCarrito({ producto }) {
    const talles = ordenarTalles(normalizarTalles(producto.specs?.talle ?? []));
    const [talleSeleccionado, setTalleSeleccionado] = useState(talles[0]?.nombre ?? null);
    const [cantidad, setCantidad] = useState(1);
    const [cantidadEnCarrito, setCantidadEnCarrito] = useState(0);
    const [agregando, setAgregando] = useState(false);
    const [agregado, setAgregado] = useState(false);

    const stockDelTalle = talles.find(t => t.nombre === talleSeleccionado)?.stock ?? 0;

    useEffect(() => {
        function sincronizar() {
            const carrito = getCarrito();
            const item = carrito.find(i => i.slug === producto.slug && i.talle === talleSeleccionado);
            setCantidadEnCarrito(item?.cantidad ?? 0);
        }
        sincronizar();
        window.addEventListener('carrito-actualizado', sincronizar);
        return () => window.removeEventListener('carrito-actualizado', sincronizar);
    }, 
    
    [talleSeleccionado]);

    useEffect(() => {
        setCantidad(1);
    }, 
    
    [talleSeleccionado]);

    const disponible = stockDelTalle - cantidadEnCarrito;
    const sinStock = disponible <= 0 || talles.length === 0;

    function sumar() {
        setCantidad(c => Math.min(c + 1, disponible));
    }

    function restar() {
        setCantidad(c => Math.max(c - 1, 1));
    }

    async function handleAgregar() {
        
        if (sinStock || agregando) return;
        if (talles.length > 0 && !talleSeleccionado) {
            return;
        }

        setAgregando(true);

        setTimeout(() => {
            agregarAlCarrito({
            slug: producto.slug,
            name: producto.name,
            marca: producto.marca,
            category: producto.category,
            image: producto.images?.[0] ?? producto.image ?? null,
            price: producto.price,
            talle: talleSeleccionado,
            stock: stockDelTalle,
            }, cantidad);

            setAgregado(true);
            setTimeout(() => {
                setAgregado(false);
                setAgregando(false);
            }, 2000);
        }, 1000); 
    }

    if (talles.length === 0) {
        return <p className="text-sm font-semibold text-gray-accent uppercase">Sin stock</p>;
    }

    return (
        <>

        {talles.length > 0 && (
            <div className="flex flex-col gap-2 justify-center">

                <p className="text-xs font-semibold uppercase text-gray-accent">
                    {talleSeleccionado ? `Talle: ${talleSeleccionado}` : 'Talle'}
                </p>

                <div className="flex flex-wrap gap-2">
                    {talles.map((t) => (
                        <button
                            key={t.nombre}
                            onClick={() => setTalleSeleccionado(t.nombre)}
                            className={`border text-sm px-3 py-1 rounded-full uppercase transition-colors cursor-pointer
                            ${talleSeleccionado === t.nombre
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray/30 text-gray hover:border-primary hover:text-primary'
                            }`}
                            >
                            {t.nombre}
                        </button>
                    ))}
                </div>

            </div>
        )}

            <>
                <p className="text-xs font-semibold text-primary uppercase min-h-4">
                    {!sinStock && cantidad >= disponible ? (disponible === 1 ? '¡Es el último!' : '¡Son los últimos!') : ''}
                </p>

                <div className="flex items-center gap-3">
                    
                    <div className="flex items-center gap-2 border border-gray/30 rounded-xl px-3 py-2">
                        <button
                            onClick={restar}
                            disabled={sinStock || cantidad <= 1}
                            className={`w-6 h-6 flex items-center justify-center text-lg cursor-pointer leading-none text-gray/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${!sinStock && cantidad > 1 ? 'hover:text-primary' : ''}`}
                            aria-label="Restar uno"
                        >

                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>

                        </button>

                        <span className="text-sm font-semibold w-5 text-center">{cantidad}</span>
                        
                        <button
                            onClick={sumar}
                            disabled={sinStock || cantidad >= disponible}
                            className={`w-6 h-6 flex items-center justify-center text-lg cursor-pointer leading-none text-gray/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${!sinStock && cantidad < disponible ? 'hover:text-primary' : ''}`}
                            aria-label="Sumar uno"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>

                    <button
                        onClick={!sinStock ? handleAgregar : undefined}
                        disabled={sinStock}
                        className={`flex-1 max-w-sm font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm ${sinStock ? 'bg-gray/10 text-gray cursor-not-allowed' : 'bg-primary hover:bg-primary-accent text-white cursor-pointer'}`}
                        >
                        {sinStock ? 'Sin stock para este talle' : agregando ? 'Agregando al carrito...' : agregado ? '¡Agregado!' : 'Agregar al carrito'}
                    </button>

                </div>
            </>

        <div
            style={{
                position: 'fixed',
                bottom: '1.5rem',
                left: '1rem',
                right: '1rem',
                display: 'flex',
                justifyContent: 'center',
                transform: agregado ? 'translateY(0)' : 'translateY(120%)',
                opacity: agregado ? 1 : 0,
                transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
                zIndex: 9999,
                pointerEvents: 'none',
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'var(--color-black)',
                color: 'var(--color-white)',
                borderRadius: '1rem',
                padding: '0.75rem 1.25rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                fontSize: '0.9rem',
                fontWeight: 600,
                maxWidth: '100%',
                wordBreak: 'break-word',
            }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#4ade80" strokeWidth={2.5} style={{ flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{producto.name} agregado al carrito</span>
            </div>
        </div>

    </>
    );
}