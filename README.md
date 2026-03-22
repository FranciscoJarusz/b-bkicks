
# 24/7 Sneakers BA

Proyecto Astro para tienda de sneakers y streetwear.

## 🚀 Estructura del Proyecto

```text
/
├── public/
│   ├── favicon.svg, imágenes, íconos
│   └── productos/ (carpetas con imágenes de cada producto)
├── src/
│   ├── assets/           # (vacío)
│   ├── components/
│   │   ├── Footer.astro, Header.astro, ProductoDetalle.astro
│   │   └── ui/           # Componentes React (migrar a Astro si es necesario)
│   ├── data/
│   │   └── productos.json
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro, busqueda.astro
│   │   └── productos/[slug].astro
│   ├── scripts/
│   │   └── lenis.ts
│   ├── sections/
│   │   ├── Catalogo.astro, Encargos.astro, Hero.astro
│   ├── styles/
│   │   └── global.css
│   └── utils/
│       ├── carrito.js, productos.js
├── package.json
├── astro.config.mjs
└── tsconfig.json
```

### Descripción de carpetas principales
- **public/**: Archivos estáticos e imágenes de productos.
- **src/components/**: Componentes Astro y subcarpeta `ui/` para componentes React (migrar a Astro si es posible).
- **src/data/**: Datos de productos en formato JSON.
- **src/layouts/**: Layouts reutilizables.
- **src/pages/**: Páginas principales y rutas dinámicas.
- **src/scripts/**: Scripts utilitarios (ej: animaciones).
- **src/sections/**: Secciones reutilizables para páginas.
- **src/styles/**: Estilos globales.
- **src/utils/**: Utilidades JS para lógica de carrito y productos.

## 🧞 Comandos útiles

Todos los comandos se ejecutan desde la raíz del proyecto:

| Comando           | Acción                                              |
|-------------------|-----------------------------------------------------|
| `npm install`     | Instala las dependencias                            |
| `npm run dev`     | Inicia el servidor de desarrollo en `localhost:4321`|
| `npm run build`   | Genera el sitio para producción en `./dist/`        |
| `npm run preview` | Previsualiza el sitio generado antes de desplegar   |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |