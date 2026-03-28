-- Reemplaza admin@tu-dominio.com por el mail real del dueño.
-- Ejecuta esto solo cuando ya tengas creado el usuario en Supabase Auth.
-- Estas políticas mantienen lectura pública para la tienda y reservan escritura al admin.

ALTER TABLE public.producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_talle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_imagen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read producto"
ON public.producto
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "admin update producto_talle"
ON public.producto_talle
FOR UPDATE
TO authenticated
USING (auth.jwt()->>'email' = 'admin@tu-dominio.com')
WITH CHECK (auth.jwt()->>'email' = 'admin@tu-dominio.com');

CREATE POLICY "admin insert producto"
ON public.producto
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt()->>'email' = 'admin@tu-dominio.com');

CREATE POLICY "admin update producto"
ON public.producto
FOR UPDATE
TO authenticated
USING (auth.jwt()->>'email' = 'admin@tu-dominio.com')
WITH CHECK (auth.jwt()->>'email' = 'admin@tu-dominio.com');

CREATE POLICY "admin delete producto"
ON public.producto
FOR DELETE
TO authenticated
USING (auth.jwt()->>'email' = 'admin@tu-dominio.com');

CREATE POLICY "admin insert producto_talle"
ON public.producto_talle
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt()->>'email' = 'admin@tu-dominio.com');

CREATE POLICY "admin delete producto_talle"
ON public.producto_talle
FOR DELETE
TO authenticated
USING (auth.jwt()->>'email' = 'admin@tu-dominio.com');

CREATE POLICY "public read producto_talle"
ON public.producto_talle
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "public read producto_imagen"
ON public.producto_imagen
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "admin insert producto_imagen"
ON public.producto_imagen
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt()->>'email' = 'admin@tu-dominio.com');

CREATE POLICY "admin delete producto_imagen"
ON public.producto_imagen
FOR DELETE
TO authenticated
USING (auth.jwt()->>'email' = 'admin@tu-dominio.com');

CREATE POLICY "public read marca"
ON public.marca
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "admin insert marca"
ON public.marca
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt()->>'email' = 'admin@tu-dominio.com');

CREATE POLICY "public read talle"
ON public.talle
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "admin insert talle"
ON public.talle
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt()->>'email' = 'admin@tu-dominio.com');
