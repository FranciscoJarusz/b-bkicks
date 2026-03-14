export default function TextoLoop({ textos = ["ENCARGOS POR WHATSAPP", "ENVÍOS EN EL DÍA"], repeticiones = 15, velocidad = 150 }) {
    const items = Array.from({ length: repeticiones }, (_, i) => i);

    return (
        <div className="overflow-hidden whitespace-nowrap bg-primary py-1 select-none flex items-center">
            <div
                className="inline-flex items-center"
                style={{
                    animation: `marquee ${velocidad}s linear infinite`,
                }}
            >
                {items.map((i) =>
                    textos.map((texto, j) => (
                        <span key={`${i}-${j}`} className="mx-4 text-[10px] text-secondary font-semibold uppercase tracking-widest">
                            {texto}
                        </span>
                    ))
                )}
            </div>

            <style>{`
                @keyframes marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
}
