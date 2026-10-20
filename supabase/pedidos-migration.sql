-- Pedidos de la tienda. Hoy se crean al pagar con MercadoPago: nacen
-- "pendiente", el webhook los pasa a "pagado" cuando MercadoPago confirma y
-- el admin los marca "entregado" cuando los despacha.
--
-- Contiene datos personales (nombre, telefono, email, DNI, direccion): el
-- publico no puede leer ni escribir. El servidor entra con la secret key
-- (SUPABASE_SECRET_KEY, se saltea RLS) y el admin con las policies de abajo.
--
-- Reemplaza admin@tu-dominio.com por el mail real del dueño, igual que en
-- admin-policies.sql.

CREATE TABLE public.pedido (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creado timestamptz NOT NULL DEFAULT now(),
    estado text NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'pagado', 'entregado', 'cancelado')),
    medio_pago text NOT NULL,
    cliente jsonb NOT NULL,
    items jsonb NOT NULL,
    total_usd numeric NOT NULL,
    cotizacion numeric,
    total_ars numeric,
    mp_payment_id text,
    mp_estado text,
    pagado timestamptz,
    entregado timestamptz
);

ALTER TABLE public.pedido ENABLE ROW LEVEL SECURITY;

CREATE INDEX pedido_creado_idx ON public.pedido (creado DESC);

-- Pasa el pedido de "pendiente" a "pagado" y descuenta el stock de cada talle,
-- todo junto: o pasan las dos cosas o ninguna. Si el pedido ya no estaba
-- pendiente (MercadoPago repite los avisos) no hace nada y no devuelve filas,
-- asi el stock se descuenta una sola vez. El stock no baja de 0.
-- items: [{ "id": id_producto, "talle": nombre del talle, "cantidad": n, ... }]
CREATE FUNCTION public.marcar_pedido_pagado(p_id uuid)
RETURNS SETOF public.pedido
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_pedido public.pedido;
BEGIN
    UPDATE public.pedido
    SET estado = 'pagado', pagado = now()
    WHERE id = p_id AND estado = 'pendiente'
    RETURNING * INTO v_pedido;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    UPDATE public.producto_talle pt
    SET stock = GREATEST(pt.stock - i.cantidad, 0)
    FROM jsonb_to_recordset(v_pedido.items)
            AS i(id bigint, talle text, cantidad int)
        JOIN public.talle t ON t.nombre = i.talle
    WHERE pt.id_producto = i.id AND pt.id_talle = t.id_talle;

    RETURN NEXT v_pedido;
END;
$$;

-- Solo el servidor (secret key) la puede llamar.
REVOKE ALL ON FUNCTION public.marcar_pedido_pagado(uuid)
FROM public, anon, authenticated;

CREATE POLICY "admin read pedido"
ON public.pedido
FOR SELECT
TO authenticated
USING (auth.jwt()->>'email' = 'admin@tu-dominio.com');

CREATE POLICY "admin update pedido"
ON public.pedido
FOR UPDATE
TO authenticated
USING (auth.jwt()->>'email' = 'admin@tu-dominio.com')
WITH CHECK (auth.jwt()->>'email' = 'admin@tu-dominio.com');
