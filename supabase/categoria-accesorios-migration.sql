-- Suma "accesorios" a las categorias permitidas.
-- El CHECK original solo aceptaba buzo, remera, pantalon y zapatillas.

ALTER TABLE public.producto
DROP CONSTRAINT IF EXISTS producto_categoria_check;

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
