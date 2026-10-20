-- "Vistos recientemente": la ultima vez que alguien abrio cada producto.
-- Una fila por producto (cada visita pisa la fecha), asi que la tabla nunca
-- tiene mas filas que productos. Si se borra el producto, se borra su fila.

CREATE TABLE public.producto_visto (
    id_producto bigint PRIMARY KEY
        REFERENCES public.producto (id_producto) ON DELETE CASCADE,
    visto timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.producto_visto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read producto_visto"
ON public.producto_visto
FOR SELECT
TO anon, authenticated
USING (true);

-- Sin policies de escritura: la unica forma de anotar una visita es esta
-- funcion, que solo puede tocar la fecha y solo de un producto que existe.
CREATE FUNCTION public.registrar_visto(p_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.producto_visto (id_producto, visto)
    SELECT id_producto, now() FROM public.producto WHERE id_producto = p_id
    ON CONFLICT (id_producto) DO UPDATE SET visto = excluded.visto;
$$;

REVOKE ALL ON FUNCTION public.registrar_visto(bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.registrar_visto(bigint) TO anon, authenticated;
