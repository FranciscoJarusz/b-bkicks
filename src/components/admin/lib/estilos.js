// Clases que comparten las secciones del panel, para que un campo o un boton
// se vea igual en cualquier pestaña.

export const INPUT =
    "h-11 w-full rounded-xl bg-secondary px-3 text-sm text-black ring ring-black/15 outline-none transition-all duration-300 placeholder:text-black/40 focus:ring-primary";

export const ETIQUETA = "text-xs font-semibold text-black/60";

const base =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed cursor-pointer";

export const BOTON = {
    primario: `${base} bg-primary text-secondary hover:bg-primary-accent disabled:bg-black/40`,
    oscuro: `${base} bg-black text-secondary hover:bg-primary disabled:bg-black/40`,
    contorno: `${base} text-black ring ring-black/20 hover:ring-primary disabled:text-black/30 disabled:hover:ring-black/20`,
    peligro: `${base} bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:bg-red-50/50 disabled:text-red-300`,
};

export const TARJETA = "rounded-2xl bg-secondary ring-1 ring-black/10";
