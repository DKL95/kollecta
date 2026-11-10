import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { UserAvatar } from "./Avatar";
import Icon from "./Icon";
import { GROUP_NAMES } from "../data/mockData";

const MAX_IMAGES = 10;
const MAX_VIDEOS = 5;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

export default function Composer({ onCreated }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [group, setGroup] = useState("");
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [sending, setSending] = useState(false);

  const fileInput = useRef(null);
  const videoInput = useRef(null);

  // Crear y limpiar las URL de vista previa de las imágenes.
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const urls = images.map((image) => URL.createObjectURL(image));
    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  // Crear y limpiar las URL de vista previa de los videos.
  const [videoPreviews, setVideoPreviews] = useState([]);

  useEffect(() => {
    const urls = videos.map((video) => URL.createObjectURL(video));
    setVideoPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [videos]);

  // Seleccionar fotografías.
  function handleImageSelection(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";

    let reachedLimit = false;

    setImages((current) => {
      const combined = [...current];

      for (const file of selected) {
        const duplicate = combined.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        );

        if (duplicate) continue;

        if (combined.length < MAX_IMAGES) {
          combined.push(file);
        } else {
          reachedLimit = true;
        }
      }

      return combined;
    });

    if (selected.length > 0 && images.length >= MAX_IMAGES) {
      alert("Puedes agregar máximo 10 fotos por publicación.");
    } else if (selected.length > MAX_IMAGES - images.length) {
      alert("Puedes agregar máximo 10 fotos por publicación.");
    }
  }

  // Eliminar una fotografía seleccionada.
  function removeImage(index) {
    setImages((current) => current.filter((_, i) => i !== index));
  }

  // Seleccionar videos y validar sus límites.
  function handleVideoSelection(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";

    setVideos((current) => {
      const combined = [...current];
      let rejectedSize = false;
      let rejectedLimit = false;

      for (const file of selected) {
        if (!file.type.startsWith("video/")) continue;

        if (file.size > MAX_VIDEO_SIZE) {
          rejectedSize = true;
          continue;
        }

        const duplicate = combined.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        );

        if (duplicate) continue;

        if (combined.length >= MAX_VIDEOS) {
          rejectedLimit = true;
          continue;
        }

        combined.push(file);
      }

      if (rejectedSize) {
        alert("Cada video puede pesar máximo 100 MB.");
      }

      if (rejectedLimit) {
        alert("Puedes agregar máximo 5 videos por publicación.");
      }

      return combined;
    });
  }

  // Eliminar un video seleccionado.
  function removeVideo(index) {
    setVideos((current) => current.filter((_, i) => i !== index));
  }

  // Publicar texto, fotografías y videos.
  async function handleSubmit(event) {
    event.preventDefault();

    if (!text.trim() || sending) return;

    const form = new FormData();
    form.append("texto", text.trim());
    form.append("grupo", group);

    images.forEach((image) => {
      form.append("imagenes", image);
    });

    videos.forEach((video) => {
      form.append("videos", video);
    });

    setSending(true);

    try {
      const data = await apiRequest("/publicaciones", {
        method: "POST",
        body: form,
      });

      onCreated(data.publicacion);

      setText("");
      setGroup("");
      setImages([]);
      setVideos([]);
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

        {/* Vista previa de las fotografías */}
        {images.length > 0 && (
          <div className="composer-preview-section">
            <div className="composer-preview-heading">
              <span>
                {images.length} de {MAX_IMAGES} fotos seleccionadas
              </span>

              <span className="composer-preview-hint">
                Vista previa
              </span>
            </div>

            <div
              className={`composer-preview-grid ${
                images.length === 1 ? "single" : ""
              }`}
            >
              {images.map((image, index) => (
                <div
                  className="composer-preview-item"
                  key={`${image.name}-${image.lastModified}-${index}`}
                >
                  <img
                    src={previews[index]}
                    alt={`Vista previa de ${image.name}`}
                    className="composer-preview-image"
                  />

                  <button
                    type="button"
                    className="composer-preview-remove"
                    onClick={() => removeImage(index)}
                    aria-label={`Quitar ${image.name}`}
                    title="Quitar imagen"
                    disabled={sending}
                  >
                    ×
                  </button>

                  <div className="composer-preview-filename">
                    {image.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vista previa de los videos */}
        {videos.length > 0 && (
          <div className="composer-preview-section">
            <div className="composer-preview-heading">
              <span>
                {videos.length} de {MAX_VIDEOS} videos seleccionados
              </span>

              <span className="composer-preview-hint">
                Vista previa
              </span>
            </div>

            <div className="composer-preview-grid">
              {videos.map((video, index) => (
                <div
                  className="composer-preview-item"
                  key={`${video.name}-${video.lastModified}-${index}`}
                >
                  <video
                    src={videoPreviews[index]}
                    controls
                    preload="metadata"
                    className="composer-preview-image"
                  />

                  <button
                    type="button"
                    className="composer-preview-remove"
                    onClick={() => removeVideo(index)}
                    aria-label={`Quitar ${video.name}`}
                    title="Quitar video"
                    disabled={sending}
                  >
                    ×
                  </button>

                  <div className="composer-preview-filename">
                    {video.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acciones del formulario */}
        <div className="composer-actions">
          {/* Botón para agregar fotografías */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fileInput.current?.click()}
            disabled={images.length >= MAX_IMAGES || sending}
          >
            <Icon name="camera" size={15} />

            {images.length
              ? `${images.length} foto(s)`
              : "Agregar fotos"}
          </button>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleImageSelection}
          />

          {/* Botón para agregar videos */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => videoInput.current?.click()}
            disabled={videos.length >= MAX_VIDEOS || sending}
          >
            <Icon name="camera" size={15} />

            {videos.length
              ? `${videos.length} video(s)`
              : "Agregar videos"}
          </button>

          <input
            ref={videoInput}
            type="file"
            accept="video/*"
            multiple
            hidden
            onChange={handleVideoSelection}
          />

          {/* Etiquetar grupo */}
          <label className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            <Icon name="tag" size={15} />

            <select
              className="composer-group-select"
              value={group}
              onChange={(event) => setGroup(event.target.value)}
            >
              <option value="">Etiquetar grupo</option>

              {GROUP_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          {/* Publicar */}
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            style={{ marginLeft: "auto" }}
            disabled={sending || !text.trim()}
          >
            {sending ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>
    </form>
  );
}