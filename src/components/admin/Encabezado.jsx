/**
 * Titulo de cada pestaña del panel. Las acciones van a la derecha en
 * pantallas anchas y debajo del texto en el celular.
 */
export default function Encabezado({ antetitulo, titulo, children, acciones }) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <span className="text-xs uppercase tracking-[0.3em] text-black/50">
                    {antetitulo}
                </span>
                <h2 className="mt-2 text-2xl font-semibold text-black sm:text-3xl">
                    {titulo}
                </h2>
                {children && (
                    <p className="mt-2 max-w-2xl text-sm text-black/50">
                        {children}
                    </p>
                )}
            </div>
            {acciones && (
                <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>
            )}
        </div>
    );
}
