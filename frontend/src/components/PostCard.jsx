
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { UserAvatar } from "./Avatar";
import Icon from "./Icon";
import Photo from "./Photo";
import { timeAgo } from "../utils/format";

export default function PostCard({ post, onChange, onDelete }) {
  const author = post.autor;
  const images = post.imagenes || (post.imagen ? [post.imagen] : []);

  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(post.texto || "");
  const [photos, setPhotos] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function handleLike() {
    onChange({
      ...post,
      meGusta: !post.meGusta,
      totalLikes: post.totalLikes + (post.meGusta ? -1 : 1),
    });

    try {
      const data = await apiRequest(`/publicaciones/${post.id}/like`, {
        method: "POST",
      });
      onChange(data.publicacion);
    } catch (error) {
      onChange(post);
      alert(error.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm("¿Eliminar esta publicación?")) return;

    try {
      await apiRequest(`/publicaciones/${post.id}`, {
        method: "DELETE",
      });
      onDelete(post.id);
    } catch (error) {
      alert(error.message);
    }
  }

  function startEditing() {
    setTexto(post.texto || "");
    setPhotos([]);
    setRemovedImages([]);
    setEditError("");
    setEditing(true);
  }

  function cancelEditing() {
    setPhotos([]);
    setRemovedImages([]);
    setEditError("");
    setEditing(false);
  }

  function toggleRemoveImage(image) {
    setRemovedImages((current) =>
      current.includes(image)
        ? current.filter((item) => item !== image)
        : [...current, image]
    );
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    setSaving(true);
    setEditError("");

    try {
      const body = new FormData();
      body.append("texto", texto.trim());
      body.append("imagenesEliminadas", JSON.stringify(removedImages));

      photos.forEach((photo) => {
        body.append("imagenes", photo);
      });

      const data = await apiRequest(`/publicaciones/${post.id}`, {
        method: "PUT",
        body,
      });

      onChange(data.publicacion);
      cancelEditing();
    } catch (error) {
      setEditError(
        error.message || "No se pudo actualizar la publicación."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="card post">
      <div className="post-head">
        <Link to={`/perfil/${author.username}`}>
          <UserAvatar user={author} />
        </Link>

        <div>
          <div className="name">
            <Link to={`/perfil/${author.username}`}>
              {author.nombre || author.username}
            </Link>{" "}
            <span className="handle">@{author.username}</span>
          </div>

          <div className="time">
            {timeAgo(post.fechaCreacion)}
            {post.grupo && (
              <>
                {" · "}
                <span
                  className="pill pink"
                  style={{ padding: "1px 8px" }}
                >
                  {post.grupo}
                </span>
              </>
            )}
          </div>
        </div>

        {post.esMia && (
          <div
            style={{
              display: "flex",
              gap: 6,
              marginLeft: "auto",
            }}
          >
            {/* Botón de editar corregido */}
            <button
              type="button"
              className="icon-btn"
              title="Editar publicación"
              aria-label="Editar publicación"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                startEditing();
              }}
              disabled={editing}
              style={{ width: 32, height: 32 }}
            >
              <Icon name="pencil" size={15} />
            </button>

            <button
              type="button"
              className="icon-btn"
              title="Eliminar publicación"
              aria-label="Eliminar publicación"
              onClick={handleDelete}
              style={{ width: 32, height: 32 }}
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSaveEdit} className="post-edit-form">
          <div className="field">
            <label htmlFor={`post-text-${post.id}`}>
              Texto
            </label>

            <textarea
              id={`post-text-${post.id}`}
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              rows={4}
              maxLength={1000}
              required
            />
          </div>
          

          {images.length > 0 && (
            <div className="field">
              <label>Fotos actuales</label>

              <div className="post-photo-grid">
                {images.map((image) => {
                  const removed = removedImages.includes(image);

                  return (
                    <div
                      key={image}
                      className="post-photo-edit-item"
                      style={{ opacity: removed ? 0.4 : 1 }}
                    >
                      <Photo src={image} alt={post.texto} />

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => toggleRemoveImage(image)}
                      >
                        {removed ? "Conservar" : "Quitar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor={`post-photos-${post.id}`}>
              Agregar fotos nuevas
            </label>

            <input
              id={`post-photos-${post.id}`}
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                setPhotos(Array.from(event.target.files || []));
              }}
            />

            <small>
              Las fotos nuevas se agregarán a las que conserves.
            </small>
          </div>

          {photos.length > 0 && (
            <p>
              {photos.length} foto(s) nueva(s) seleccionada(s).
            </p>
          )}

          {editError && (
            <p className="form-error">{editError}</p>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !texto.trim()}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="post-text">{post.texto}</p>

          {images.length > 0 && (
            <div className="post-photo-grid">
              {images.map((image) => (
                <div key={image} className="post-media">
                  <Photo src={image} alt={post.texto} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="post-actions">
        <button
          className={`post-action-btn like-btn ${
            post.meGusta ? "liked" : ""
          }`}
          onClick={handleLike}
        >
          <span className="ic">
            <Icon
              name={post.meGusta ? "heartFilled" : "heart"}
              size={16}
            />
          </span>{" "}
          <span className="count">{post.totalLikes}</span>
        </button>

        <button type="button" className="post-action-btn">
          <Icon name="comment" size={16} /> {post.totalComentarios}
        </button>

        <button type="button" className="post-action-btn">
          <Icon name="share" size={16} /> Compartir
        </button>
      </div>
    </article>
  );
}
