# B&B KICKS

Tienda de sneakers y streetwear construida con Astro, React y Supabase.

## Stack

- Astro 6
- React 19
- Tailwind CSS 4
- Supabase
- Node adapter para render del lado del servidor

## Que hace hoy

- Catalogo, busqueda y ficha de producto leen datos desde Supabase.
- Panel admin en `/admin` para:
  - iniciar sesion
  - crear productos
  - subir imagenes
  - editar stock y precio por talle
  - agregar y borrar talles
  - borrar uno o varios productos
- Importador para cargar `productos.json` a Supabase.

## Variables de entorno

Crea un archivo `.env` en la raiz con:

```env
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu_public_anon_key
PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET=productos
PUBLIC_ADMIN_EMAIL=tu-admin@email.com
```

## Scripts

Todos los comandos se corren desde la raiz del proyecto.

| Comando | Descripcion |
| --- | --- |
| `npm install` | Instala dependencias |
| `npm run dev` | Levanta el proyecto en desarrollo |
| `npm run build` | Genera el build |
| `npm run preview` | Previsualiza el build |
| `npm run import:supabase` | Importa `src/data/productos.json` a Supabase |

## Estructura

```text
/
├── public/
├── scripts/
│   └── import-productos-to-supabase.mjs
├── src/
│   ├── components/
│   │   ├── admin/
│   │   └── ui/
│   ├── data/
│   │   └── productos.json
│   ├── layouts/
│   ├── lib/
│   │   └── supabase.js
│   ├── pages/
│   │   ├── admin.astro
│   │   ├── busqueda.astro
│   │   ├── index.astro
│   │   └── productos/[slug].astro
│   ├── sections/
│   ├── styles/
│   └── utils/
├── supabase/
│   ├── admin-policies.sql
│   └── storage-policies.sql
├── astro.config.mjs
└── package.json
```

## Supabase

La app usa estas tablas:

- `marca`
- `producto`
- `producto_imagen`
- `producto_talle`
- `talle`

Tambien usa un bucket publico de Storage, por defecto `productos`.

Los archivos SQL dentro de `supabase/` sirven para configurar policies de:

- lectura publica del catalogo
- permisos del admin autenticado
- upload y borrado de imagenes en Storage

## Panel admin

Ruta:

```text
/admin
```

Para que funcione bien:

1. Crea el usuario admin en Supabase Auth.
2. Completa `PUBLIC_ADMIN_EMAIL` en `.env`.
3. Ejecuta las policies de `supabase/admin-policies.sql`.
4. Ejecuta las policies de `supabase/storage-policies.sql`.

## Importacion inicial

Si queres poblar la base con el JSON local:

```bash
npm run import:supabase
```

Eso toma los datos de `src/data/productos.json` y los sincroniza con Supabase.

## Notas

- `src/data/productos.json` hoy se usa como fuente para importacion, no como fuente principal del sitio.
- Las marcas y talles pueden quedar en la base aunque borres todos los productos, porque funcionan como tablas auxiliares reutilizables.
