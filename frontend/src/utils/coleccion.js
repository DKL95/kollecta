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

// Convierte un artículo de /api/coleccion/marketplace al formato de ProductCard.
export function adaptarArticuloMarketplace(articulo) {
  const vendedor = articulo.vendedor || {};
  return {
    id: articulo._id,
    title: articulo.titulo,
    group: articulo.grupo,
    type: articulo.categoria,
    img: articulo.imagenes?.[0] || "",
    price: Number(articulo.precioVenta) || 0,
    mode: modalidad(articulo),
    tag: articulo.estado || "",
    seller: vendedor.username || "",
    sellerUser: vendedor,
    esMio: Boolean(articulo.esMio),
  };
}
