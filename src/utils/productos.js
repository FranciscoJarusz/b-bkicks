import productos from '@/data/productos.json';

export function getSlug(nombre) {
    return nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function contarTalles(strings) {
  const counts = {};
  for (const t of strings) {
    if (t) counts[t] = (counts[t] ?? 0) + 1;
  }
  return Object.entries(counts).map(([nombre, stock]) => ({ nombre, stock }));
}

export function getProductosAgrupados() {
  const map = new Map();

  for (const producto of productos) {
    const key = producto.name.toLowerCase();
    const tallesRaw = producto.specs?.talle ?? [];
    const talles = contarTalles(tallesRaw);

    if (map.has(key)) {
      const existing = map.get(key);
      for (const t of talles) {
        const found = existing.specs.talle.find(e => e.nombre === t.nombre);
        if (found) {
          found.stock += t.stock;
        } else {
          existing.specs.talle.push({ ...t });
        }
      }
      existing.stock = existing.specs.talle.reduce((sum, t) => sum + t.stock, 0);
    } else {
      const images = producto.images ?? (producto.image ? [producto.image] : []);
      map.set(key, {
        ...producto,
        images,
        image: images[0] ?? null,
        slug: getSlug(producto.name),
        stock: talles.reduce((sum, t) => sum + t.stock, 0),
        specs: {
          ...producto.specs,
          talle: talles,
        },
      });
    }
  }

  return Array.from(map.values());
}
