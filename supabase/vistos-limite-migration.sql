-- La tabla de "Vistos recientemente" guarda solo lo que muestra la pagina: al
-- anotar una visita se borra todo lo que quede fuera de los ultimos 24.
-- Si cambias el 24, cambialo tambien en getVistosRecientes (src/utils/productos.js).
-- Correr despues de vistos-migration.sql.

CREATE OR REPLACE FUNCTION public.registrar_visto(p_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.producto_visto (id_producto, visto)
    SELECT id_producto, now() FROM public.producto WHERE id_producto = p_id
    ON CONFLICT (id_producto) DO UPDATE SET visto = excluded.visto;

    DELETE FROM public.producto_visto
    WHERE id_producto NOT IN (
        SELECT id_producto FROM public.producto_visto
        ORDER BY visto DESC
        LIMIT 24
    );
$$;
