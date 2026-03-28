-- Crea primero un bucket publico llamado productos en Supabase Storage.
-- Reemplaza el mail por el del admin real antes de ejecutar.

INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'productos');

CREATE POLICY "admin insert product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'productos'
  AND auth.jwt()->>'email' = 'admin@tu-dominio.com'
);

CREATE POLICY "admin delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'productos'
  AND auth.jwt()->>'email' = 'admin@tu-dominio.com'
);
