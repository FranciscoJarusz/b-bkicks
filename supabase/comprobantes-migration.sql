-- Comprobantes de transferencia. Correr despues de pedidos-migration.sql.
--
-- El cliente sube el comprobante desde /pedido/<id> (via /api/comprobante,
-- con la secret key). Los archivos van a un bucket PRIVADO: tienen datos
-- bancarios. Solo el admin los puede leer, con links firmados que vencen.
--
-- Reemplaza admin@tu-dominio.com por el mail real del dueño, igual que en
-- admin-policies.sql.

ALTER TABLE public.pedido
    ADD COLUMN comprobante_path text,
    ADD COLUMN comprobante_subido timestamptz;

INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', false);

CREATE POLICY "admin read comprobantes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'comprobantes'
    AND auth.jwt()->>'email' = 'bautistabrey2006@gmail.com'
);
