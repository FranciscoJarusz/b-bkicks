import { useEffect, useRef, useState } from "react";

/**
 * Select propio que reemplaza al nativo para poder estilar la lista abierta,
 * que el navegador dibuja con el tema del sistema operativo.
 *
 * @param {{
 *   value: string,
 *   options: { value: string, label: string }[],
 *   onChange: (value: string) => void,
 *   placeholder?: string,
 *   disabled?: boolean,
 *   size?: "md" | "lg",
 *   ariaLabel?: string,
 * }} props
 */
export default function SelectMenu({
    value,
    options,
    onChange,
    placeholder = "Seleccionar",
    disabled = false,
    size = "md",
    ariaLabel,
}) {
    const [abierto, setAbierto] = useState(false);
    const [indiceActivo, setIndiceActivo] = useState(-1);
    const contenedorRef = useRef(null);
    const botonRef = useRef(null);
    const listaRef = useRef(null);

    // La opcion vacia es una mas de la lista: asi se puede volver a "sin valor".
    const opciones = [{ value: "", label: placeholder }, ...options];
    const seleccionada = opciones.find((opcion) => opcion.value === value);
    const indiceSeleccionado = opciones.findIndex(
        (opcion) => opcion.value === value
    );

    useEffect(() => {
        if (!abierto) return;

        function handlePointerDown(event) {
            if (!contenedorRef.current?.contains(event.target)) {
                setAbierto(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        return () =>
            document.removeEventListener("mousedown", handlePointerDown);
    }, [abierto]);

    useEffect(() => {
        if (abierto) {
            listaRef.current?.focus();
            setIndiceActivo(indiceSeleccionado === -1 ? 0 : indiceSeleccionado);
        }
    }, [abierto, indiceSeleccionado]);

    function abrir() {
        if (disabled) return;
        setAbierto(true);
    }

    function cerrar({ devolverFoco = true } = {}) {
        setAbierto(false);
        if (devolverFoco) botonRef.current?.focus();
    }

    function elegir(opcion) {
        onChange(opcion.value);
        cerrar();
    }

    function handleKeyDownBoton(event) {
        if (
            event.key === "ArrowDown" ||
            event.key === "Enter" ||
            event.key === " "
        ) {
            event.preventDefault();
            abrir();
        }
    }

    function handleKeyDownLista(event) {
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                setIndiceActivo((prev) => (prev + 1) % opciones.length);
                break;
            case "ArrowUp":
                event.preventDefault();
                setIndiceActivo(
                    (prev) => (prev - 1 + opciones.length) % opciones.length
                );
                break;
            case "Home":
                event.preventDefault();
                setIndiceActivo(0);
                break;
            case "End":
                event.preventDefault();
                setIndiceActivo(opciones.length - 1);
                break;
            case "Enter":
            case " ":
                event.preventDefault();
                if (opciones[indiceActivo]) elegir(opciones[indiceActivo]);
                break;
            case "Escape":
                event.preventDefault();
                cerrar();
                break;
            case "Tab":
                cerrar({ devolverFoco: false });
                break;
            default:
                break;
        }
    }

    const estiloBoton =
        size === "lg"
            ? "rounded-2xl px-4 py-3"
            : "h-11 rounded-xl px-3 text-sm";

    return (
        <div ref={contenedorRef} className="relative">
            <button
                ref={botonRef}
                type="button"
                disabled={disabled}
                onClick={() => (abierto ? cerrar() : abrir())}
                onKeyDown={handleKeyDownBoton}
                aria-haspopup="listbox"
                aria-expanded={abierto}
                aria-label={ariaLabel}
                className={`flex w-full items-center justify-between gap-3 bg-secondary text-left ring ring-black/15 outline-none transition-all duration-300 hover:ring-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${estiloBoton} ${
                    abierto ? "ring-2 ring-primary" : ""
                } ${value ? "text-black" : "text-black/50"}`}
            >
                <span className="truncate">
                    {seleccionada?.label ?? placeholder}
                </span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 shrink-0 text-primary transition-transform duration-300 ${
                        abierto ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19 9-7 7-7-7"
                    />
                </svg>
            </button>

            {abierto && (
                <ul
                    ref={listaRef}
                    role="listbox"
                    tabIndex={-1}
                    aria-label={ariaLabel}
                    aria-activedescendant={
                        opciones[indiceActivo]
                            ? `opcion-${opciones[indiceActivo].value || "vacia"}`
                            : undefined
                    }
                    onKeyDown={handleKeyDownLista}
                    className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl bg-secondary p-1 shadow-xl shadow-black/10 ring-1 ring-black/10 outline-none"
                >
                    {opciones.map((opcion, indice) => {
                        const activa = indice === indiceActivo;
                        const elegida = opcion.value === value;

                        return (
                            <li
                                key={opcion.value || "vacia"}
                                id={`opcion-${opcion.value || "vacia"}`}
                                role="option"
                                aria-selected={elegida}
                                onClick={() => elegir(opcion)}
                                onMouseEnter={() => setIndiceActivo(indice)}
                                className={`cursor-pointer rounded-xl px-3 py-2 text-sm transition-colors duration-150 ${
                                    elegida
                                        ? "bg-primary font-semibold text-secondary"
                                        : activa
                                          ? "bg-black/5 text-black"
                                          : "text-black"
                                } ${!opcion.value && !elegida ? "text-black/50" : ""}`}
                            >
                                {opcion.label}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
