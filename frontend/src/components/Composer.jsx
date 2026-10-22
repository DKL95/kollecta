import { useRef, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { UserAvatar } from "./Avatar";
import Icon from "./Icon";
import { GROUP_NAMES } from "../data/mockData";

export default function Composer({ onCreated }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [group, setGroup] = useState("");
  const [image, setImage] = useState(null);
  const [sending, setSending] = useState(false);
  const fileInput = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!text.trim() || sending) return;

    const form = new FormData();
    form.append("texto", text.trim());
    form.append("grupo", group);
    if (image) form.append("imagen", image);

    setSending(true);
    try {
      const data = await apiRequest("/publicaciones", { method: "POST", body: form });
      onCreated(data.publicacion);
      setText("");
      setGroup("");
      setImage(null);
      fileInput.current.value = "";
    } catch (error) {
      alert(error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="card composer" onSubmit={handleSubmit}>
      <UserAvatar user={user} size={42} />
      <div className="composer-body">
        <input
          type="text"
          placeholder="Comparte una nueva pieza de tu colección…"
          value={text}
          maxLength={1000}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="composer-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInput.current.click()}>
            <Icon name="camera" size={15} /> {image ? image.name.slice(0, 18) : "Foto"}
          </button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(event) => setImage(event.target.files[0] || null)} />
          <label className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            <Icon name="tag" size={15} />
            <select
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              style={{ background: "transparent", border: "none", color: "inherit", font: "inherit", outline: "none" }}
            >
              <option value="">Etiquetar grupo</option>
              {GROUP_NAMES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} disabled={sending || !text.trim()}>
            {sending ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>
    </form>
  );
}
