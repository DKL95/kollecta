// Convierte un artículo de la API (/api/coleccion) al formato que usa CollectionItem.
export function adaptarArticulo(articulo) {
  return {
    id: articulo._id,
    title: articulo.titulo,
    group: articulo.grupo,
    type: articulo.categoria,
    img: articulo.imagenes?.[0] || "",
    value: Number(articulo.valorEstimado) || 0,
  };
}

// Modalidad de un artículo según para qué está disponible.
export function modalidad(articulo) {
  if (articulo.disponibleCompra && articulo.disponibleIntercambio) return "Ambos";
  if (articulo.disponibleIntercambio) return "Intercambio";
  return "Venta";
}

// Convierte un producto de /api/productos al formato de ProductCard.
export function adaptarProducto(producto) {
  const vendedor = producto.vendedor || {};
  return {
    id: producto._id,
    title: producto.titulo,
    group: producto.grupo,
    type: producto.categoria,
    img: producto.imagenes?.[0] || "",
    price: Number(producto.precio) || 0,
    mode: modalidad(producto),
    tag: producto.estado === "reservado" ? "Apartado" : producto.condicion || "",
    seller: vendedor.username || "",
    sellerUser: vendedor,
    esMio: Boolean(producto.esMio),
  };
}
