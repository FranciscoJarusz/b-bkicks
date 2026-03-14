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

    function handleAgregar() {
        if (sinStock || (talles.length > 0 && !talleSeleccionado)) return;
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
        setCantidad(1);
        setAgregado(true);
        setTimeout(() => setAgregado(false), 2000);
    }

    if (talles.length === 0) {
        return <p class="text-sm font-semibold text-gray/50 uppercase">Sin stock</p>;
    }

    return (
        <div class="flex flex-col gap-4">

        {talles.length > 0 && (
            <div class="flex flex-col gap-2 justify-center">

                <p class="text-xs font-semibold uppercase text-gray/50">
                    {talleSeleccionado ? `Talle: ${talleSeleccionado}` : 'Talle'}
                </p>

                <div class="flex flex-wrap gap-2">
                    {talles.map((t) => (
                        <button
                            key={t.nombre}
                            onClick={() => setTalleSeleccionado(t.nombre)}
                            class={`border text-sm px-3 py-1 rounded-full transition-colors cursor-pointer
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
                <p class="text-xs font-semibold text-primary uppercase min-h-4">
                    {!sinStock && cantidad >= disponible ? (disponible === 1 ? '¡Es el último!' : '¡Son los últimos!') : ''}
                </p>

                <div class="flex items-center gap-3">
                    
                    <div class="flex items-center gap-2 border border-gray/30 rounded-xl px-3 py-2">
                        <button
                            onClick={restar}
                            disabled={sinStock || cantidad <= 1}
                            class={`w-6 h-6 flex items-center justify-center text-lg cursor-pointer leading-none text-gray/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${!sinStock && cantidad > 1 ? 'hover:text-primary' : ''}`}
                            aria-label="Restar uno"
                        >

                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>

                        </button>

                        <span class="text-sm font-semibold w-5 text-center">{cantidad}</span>
                        
                        <button
                            onClick={sumar}
                            disabled={sinStock || cantidad >= disponible}
                            class={`w-6 h-6 flex items-center justify-center text-lg cursor-pointer leading-none text-gray/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${!sinStock && cantidad < disponible ? 'hover:text-primary' : ''}`}
                            aria-label="Sumar uno"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>

                    <button
                        onClick={!sinStock ? handleAgregar : undefined}
                        disabled={sinStock}
                        class={`flex-1 max-w-sm font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm ${sinStock ? 'bg-gray/10 text-gray cursor-not-allowed' : 'bg-primary hover:bg-primary-accent text-white cursor-pointer'}`}
                        >
                        {sinStock ? 'Sin stock para este talle' : (agregado ? '¡Agregado!' : 'Agregar al carrito')}
                    </button>

                </div>
            </>

        </div>
    );
}