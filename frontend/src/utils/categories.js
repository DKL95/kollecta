// Ícono y clase de color de cada categoría de merch
export const CATEGORY_ICON = {
  Photocard: "card",
  Álbum: "disc",
  Lightstick: "wand",
  Ropa: "hoodie",
  Poster: "frame",
  Accesorio: "key",
};

const CATEGORY_SLUGS = {
  Photocard: "photocard",
  Álbum: "album",
  Lightstick: "lightstick",
  Ropa: "ropa",
  Poster: "poster",
  Accesorio: "accesorio",
};

export function categoryClass(type) {
  return `thumb--${CATEGORY_SLUGS[type] || "photocard"}`;
}

export function categoryIcon(type) {
  return CATEGORY_ICON[type] || "card";
}
