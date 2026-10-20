export const MAXIMO_REELS = 9;

const CODIGO = /^[\w-]{5,40}$/;

export function codigoDeReel(texto: string) {
    const valor = texto.trim();
    const link = valor.match(
        /instagram\.com\/(?:[\w.]+\/)?(?:reels?|p)\/([\w-]+)/
    );
    const codigo = link ? link[1] : valor;
    return CODIGO.test(codigo) ? codigo : null;
}

export function esListaDeReels(valor: unknown): valor is string[] {
    return (
        Array.isArray(valor) &&
        valor.length <= MAXIMO_REELS &&
        valor.every(
            (codigo) => typeof codigo === "string" && CODIGO.test(codigo)
        ) &&
        new Set(valor).size === valor.length
    );
}

export const linkDeReel = (codigo: string) =>
    `https://www.instagram.com/reel/${codigo}/`;

// Se muestran si la tabla todavia no existe o devuelve algo invalido, para que
// la seccion nunca quede vacia por un error de la base.
export const REELS_INICIALES = ["DWmYM97gjRJ", "DWhTadygujk", "DRk-CK6AO_o"];
