-- Agrega la categoria del producto para poder filtrar el catalogo.
-- Los productos existentes quedan en NULL hasta que se les asigne una
-- desde el panel admin.

ALTER TABLE public.producto
ADD COLUMN categoria text;

ALTER TABLE public.producto
ADD CONSTRAINT producto_categoria_check
CHECK (
    categoria IS NULL
    OR categoria IN (
        'buzo',
        'remera',
        'pantalon',
        'zapatillas',
        'accesorios'
    )
);
