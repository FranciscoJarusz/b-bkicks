// Carrito guardado en localStorage como:
// [{ slug, name, marca, category, image, price, talle, cantidad }]

export function getCarrito() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('carrito') || '[]');
  } catch {
    return [];
  }
}

export function agregarAlCarrito(item, cantidad = 1) {
  const carrito = getCarrito();
  const idx = carrito.findIndex(
    (i) => i.slug === item.slug && i.talle === item.talle
  );
  if (idx >= 0) {
    carrito[idx].cantidad += cantidad;
  } else {
    carrito.push({ ...item, cantidad });
  }
  localStorage.setItem('carrito', JSON.stringify(carrito));
  window.dispatchEvent(new Event('carrito-actualizado'));
}

export function restarDelCarrito(slug, talle) {
  const carrito = getCarrito();
  const idx = carrito.findIndex(
    (i) => i.slug === slug && i.talle === talle
  );
  if (idx < 0) return;
  if (carrito[idx].cantidad <= 1) {
    carrito.splice(idx, 1);
  } else {
    carrito[idx].cantidad -= 1;
  }
  localStorage.setItem('carrito', JSON.stringify(carrito));
  window.dispatchEvent(new Event('carrito-actualizado'));
}

export function quitarDelCarrito(slug, talle) {
  const carrito = getCarrito().filter(
    (i) => !(i.slug === slug && i.talle === talle)
  );
  localStorage.setItem('carrito', JSON.stringify(carrito));
  window.dispatchEvent(new Event('carrito-actualizado'));
}

export function vaciarCarrito() {
  localStorage.removeItem('carrito');
  window.dispatchEvent(new Event('carrito-actualizado'));
}
