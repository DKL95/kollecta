// Emojis del selector, agrupados por pestaña.
export const CATEGORIAS_EMOJI = [
  {
    id: "caras",
    icono: "😊",
    nombre: "Caras",
    emojis: "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😋 😛 😜 🤪 😝 🤗 🤭 🫢 🤫 🤔 🫡 😐 😑 😶 🙄 😏 😬 😌 😔 😪 😴 🥱 😷 🥵 🥶 🥴 😵 🤯 🥳 😎 🤓 🥺 🥹 😢 😭 😤 😠 😡 🤬 😱 😨 😰 😳 🫠 😈 💀 👻 🤡 👽 🤖",
  },
  {
    id: "gestos",
    icono: "👍",
    nombre: "Gestos",
    emojis: "👍 👎 👏 🙌 🫶 🤝 🙏 ✌️ 🤞 🫰 🤟 🤘 👌 🤌 👋 🤙 💪 👀 👁️ 🫵 👉 👈 👆 👇 ☝️ ✋ 🤚 🖐️ 🫳 🫴 💅 🤳",
  },
  {
    id: "corazones",
    icono: "💜",
    nombre: "Corazones",
    emojis: "❤️ 🩷 🧡 💛 💚 🩵 💙 💜 🖤 🩶 🤍 🤎 💖 💗 💓 💞 💕 💘 💝 💟 ❣️ 💔 ❤️‍🔥 💌 😻 💋",
  },
  {
    id: "kpop",
    icono: "🎤",
    nombre: "K-pop",
    emojis: "🎤 🎧 🎶 🎵 💿 📀 🎼 🪩 🎉 🎊 ✨ 🌟 ⭐ 💫 🔥 💥 🌈 🦋 🐰 🐻 🐱 🐶 🦊 🐨 🐼 🐥 🍓 🍒 🧸 🎀 🎁 👑 💎 🌸 🌷 🌙 ☁️ 🫧",
  },
  {
    id: "merch",
    icono: "🛍️",
    nombre: "Merch",
    emojis: "🛍️ 📦 📬 🏷️ 💸 💰 💳 🪪 📸 📷 🖼️ 🗂️ 📚 📒 ✉️ 🎫 🎟️ 🔦 🪄 🧢 👕 🧥 👜 🎒 🔑 🧷 📌 ✅ ❌ ⏳ 🔁 🤑",
  },
].map((categoria) => ({ ...categoria, emojis: categoria.emojis.split(" ") }));
