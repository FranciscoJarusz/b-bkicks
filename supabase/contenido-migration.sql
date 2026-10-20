-- Contenido editable desde el admin que no es un producto (por ahora, los
-- reels de la home). Cada fila es una clave con su valor en JSON.
-- Reemplaza admin@tu-dominio.com por el mail real del dueño, igual que en
-- admin-policies.sql.

CREATE TABLE public.contenido (
    clave text PRIMARY KEY,
    valor jsonb NOT NULL,
    actualizado timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contenido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read contenido"
ON public.contenido
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "admin insert contenido"
ON public.contenido
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt()->>'email' = 'admin@tu-dominio.com');

CREATE POLICY "admin update contenido"
ON public.contenido
FOR UPDATE
TO authenticated
USING (auth.jwt()->>'email' = 'admin@tu-dominio.com')
WITH CHECK (auth.jwt()->>'email' = 'admin@tu-dominio.com');

-- Los reels que ya estaban en la home.
INSERT INTO public.contenido (clave, valor)
VALUES ('reels', '["DWmYM97gjRJ", "DWhTadygujk", "DRk-CK6AO_o"]');
