-- Separa los productos del catálogo de los que se pueden encargar.
-- Los productos existentes quedan como catálogo por el DEFAULT false.

ALTER TABLE public.producto
ADD COLUMN es_encargo boolean NOT NULL DEFAULT false;
