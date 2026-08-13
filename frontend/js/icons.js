/* ==========================================================================
   KollectA — Set de íconos (SVG en línea, sin emoji)
   Íconos minimalistas estilo "line icon", 24x24, stroke=currentColor.
   ========================================================================== */

const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  search: '<circle cx="10" cy="10" r="6.5"/><line x1="20" y1="20" x2="15" y2="15"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0"/>',
  chat: '<path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.4 1.2 4.6 3.2 6.1L4 21l4.2-1.6c1.1.4 2.4.6 3.8.6 5.5 0 10-3.8 10-8.5S17.5 3 12 3Z"/>',
  bag: '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  basket: '<path d="M4 8h16l-1.5 9a2 2 0 0 1-2 1.7H7.5A2 2 0 0 1 5.5 17L4 8Z"/><path d="M8 8 10 3h4l2 5"/><line x1="9" y1="12" x2="9" y2="15"/><line x1="15" y1="12" x2="15" y2="15"/>',
  folder: '<path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z"/>',
  star: '<path d="M12 3l2.7 5.9 6.3.6-4.8 4.3 1.4 6.2L12 17l-5.6 3 1.4-6.2L3 9.5l6.3-.6L12 3Z"/>',
  starFilled: '<path d="M12 3l2.7 5.9 6.3.6-4.8 4.3 1.4 6.2L12 17l-5.6 3 1.4-6.2L3 9.5l6.3-.6L12 3Z" fill="currentColor"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  power: '<line x1="12" y1="3" x2="12" y2="11"/><path d="M7 6a8 8 0 1 0 10 0"/>',
  heart: '<path d="M12 20s-7-4.4-9.5-8.7C.7 8 2 4.5 5.3 3.6 8 2.9 10 4 12 6.3 14 4 16 2.9 18.7 3.6 22 4.5 23.3 8 21.5 11.3 19 15.6 12 20 12 20Z"/>',
  heartFilled: '<path d="M12 20s-7-4.4-9.5-8.7C.7 8 2 4.5 5.3 3.6 8 2.9 10 4 12 6.3 14 4 16 2.9 18.7 3.6 22 4.5 23.3 8 21.5 11.3 19 15.6 12 20 12 20Z" fill="currentColor"/>',
  paperclip: '<path d="M17 8 9 16a3 3 0 0 1-4-4l8-8a2 2 0 0 1 3 3l-7.5 7.5"/>',
  pencil: '<path d="M4 16l9-9 3 3-9 9H4v-3Z"/><path d="M14 5l3 3"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"/><circle cx="12" cy="13" r="3.3"/>',
  tag: '<path d="M11 3H4v7l10 10 7-7L11 3Z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 6-6"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6"/><path d="M16 8.3a3 3 0 1 1 3.5 3"/><path d="M15 14.3c2.7.5 4.5 2.7 4.5 5.7"/>',
  package: '<path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z"/><path d="M4 7l8 4 8-4"/><line x1="12" y1="11" x2="12" y2="21"/>',
  share: '<circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><line x1="8" y1="10.8" x2="16" y2="6.2"/><line x1="8" y1="13.2" x2="16" y2="17.8"/>',
  repeat: '<path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/>',
  comment: '<path d="M4 5h16v11H8l-4 4V5Z"/>',
  close: '<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>',
  chevronLeft: '<polyline points="15 5 8 12 15 19"/>',
  upload: '<path d="M12 15V4"/><path d="M7.5 8.5 12 4l4.5 4.5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  send: '<path d="M3 11.5 21 4l-6.5 18-3.7-7.8L3 11.5Z"/>',
  storefront: '<path d="M4 9h16l-1 3H5L4 9Z"/><path d="M4 9 6 4h12l2 5"/><path d="M6 12v8h12v-8"/>',
  card: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="9" r="2.3"/><line x1="8" y1="16" x2="16" y2="16"/>',
  disc: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.3"/>',
  wand: '<path d="M12 3v3"/><circle cx="12" cy="13" r="6.5"/><line x1="12" y1="19.5" x2="12" y2="22"/>',
  hoodie: '<path d="M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2h-4L8 4Z"/>',
  frame: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l5-5 4 4 2-2 3 3"/>',
  key: '<circle cx="8" cy="8" r="4"/><line x1="11" y1="11" x2="19" y2="19"/><line x1="15" y1="15" x2="17.5" y2="12.5"/><line x1="17" y1="17" x2="19.5" y2="14.5"/>',
};

function icon(name, size) {
  size = size || 18;
  const body = ICON_PATHS[name] || ICON_PATHS.tag;
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

const CATEGORY_ICON = {
  Photocard: "card",
  Álbum: "disc",
  Lightstick: "wand",
  Ropa: "hoodie",
  Poster: "frame",
  Accesorio: "key",
};
