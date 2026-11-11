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
