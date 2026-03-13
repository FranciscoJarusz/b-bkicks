import productos from '../data/productos.json';

export function getSlug(nombre) {
  return nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function getProductosAgrupados() {
  const map = new Map();

  for (const producto of productos) {
    const key = producto.name.toLowerCase();

    if (map.has(key)) {
      const existing = map.get(key);
      const nuevosTalles = producto.specs?.talle ?? [];
      for (const t of nuevosTalles) {
        if (t && !existing.specs.talle.includes(t)) {
          existing.specs.talle.push(t);
        }
      }
      existing.stock += producto.stock;
    } else {
      map.set(key, {
        ...producto,
        slug: producto.slug || getSlug(producto.name),
        specs: {
          ...producto.specs,
          talle: [...(producto.specs?.talle ?? [])].filter(Boolean),
        },
      });
    }
  }

  return Array.from(map.values());
}
