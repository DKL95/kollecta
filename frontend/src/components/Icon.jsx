/* ==========================================================================
   Set de íconos (SVG en línea, sin emoji)
   Íconos minimalistas estilo "line icon", 24x24, stroke=currentColor.
   ========================================================================== */

const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  search: '<circle cx="10" cy="10" r="6.5"/><line x1="20" y1="20" x2="15" y2="15"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0"/>',
  chat: '<path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.4 1.2 4.6 3.2 6.1L4 21l4.2-1.6c1.1.4 2.4.6 3.8.6 5.5 0 10-3.8 10-8.5S17.5 3 12 3Z"/>',
  bag: '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  folder: '<path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z"/>',
  star: '<path d="M12 3l2.7 5.9 6.3.6-4.8 4.3 1.4 6.2L12 17l-5.6 3 1.4-6.2L3 9.5l6.3-.6L12 3Z"/>',
  starFilled: '<path d="M12 3l2.7 5.9 6.3.6-4.8 4.3 1.4 6.2L12 17l-5.6 3 1.4-6.2L3 9.5l6.3-.6L12 3Z" fill="currentColor"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  gamepad: '<path d="M7 8h10a5 5 0 0 1 4.9 6l-.6 3a2.5 2.5 0 0 1-4.3 1.2L15 16H9l-2 2.2A2.5 2.5 0 0 1 2.7 17l-.6-3A5 5 0 0 1 7 8Z"/><line x1="8" y1="10.5" x2="8" y2="14.5"/><line x1="6" y1="12.5" x2="10" y2="12.5"/><circle cx="16" cy="11.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="18" cy="13.5" r="0.9" fill="currentColor" stroke="none"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  chevronRight: '<polyline points="9 5 16 12 9 19"/>',
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
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
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
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3Z"/><path d="M9 12l2 2 4-4"/>',
  chart: '<line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="11" width="3" height="7" rx="1"/><rect x="11" y="6" width="3" height="12" rx="1"/><rect x="16" y="14" width="3" height="4" rx="1"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-2.6 3.2"/><path d="M6.5 7.6C4.3 9.1 3 12 3 12s4 6 9 6c1.5 0 2.9-.4 4.1-1"/><path d="M9.9 10a3 3 0 0 0 4.2 4.2"/>',
  play: '<path d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.3-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5Z" fill="currentColor" stroke="none"/>',
  volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  volumeOff: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z"/><line x1="16" y1="9.5" x2="21" y2="14.5"/><line x1="21" y1="9.5" x2="16" y2="14.5"/>',
  dots: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  klip: '<rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M10.2 9.2v5.6a.5.5 0 0 0 .8.4l4.2-2.8a.5.5 0 0 0 0-.8L11 8.8a.5.5 0 0 0-.8.4Z" fill="currentColor" stroke="none"/>',
  eye: '<path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="2.8"/>',
  download: '<path d="M12 4v11"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
};

export default function Icon({ name, size = 18 }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || ICON_PATHS.tag }}
    />
  );
}
