import { useState } from "react";
import { apiRequest, USER_KEY } from "../api/client";
import { UserAvatar } from "./Avatar";
import Icon from "./Icon";
import Photo from "./Photo";
import { timeAgo } from "../utils/format";
import UserHoverCard from "./UserHoverCard";

const MAX_IMAGES = 10;

// Convierte las menciones @usuario en enlaces con vista previa de perfil.
function renderTextWithMentions(text) {
  const value = String(text || "");
  const parts = value.split(/(^|\s)(@[a-zA-Z0-9_.-]+)/g);

  return parts.map((part, index) => {
    if (/^@[a-zA-Z0-9_.-]+$/.test(part)) {
      return (
        <UserHoverCard key={`${part}-${index}`} user={part}>
          <span className="post-mention">{part}</span>
        </UserHoverCard>
      );
    }

    return part;
  });
}

export default function PostCard({ post, onChange, onDelete }) {
  const author = post.autor || {};
  const images = post.imagenes || (post.imagen ? [post.imagen] : []); 

  const usuarioGuardado = JSON.parse(
  localStorage.getItem(USER_KEY) || "null"
  );

  const usuarioActualId = String(
    usuarioGuardado?.id || usuarioGuardado?._id || ""
  );

  const puedeEliminarComentario = (comment) =>
    post.esMia ||
    String(comment.autor?.id || "") === usuarioActualId;

  const puedeEliminarRespuesta = (reply) =>
    post.esMia ||
    String(reply.autor?.id || "") === usuarioActualId;

  // Solo el autor puede editar sus propios comentarios y respuestas.
  const puedeEditarComentario = (comment) =>
    String(comment.autor?.id || "") === usuarioActualId;

  const puedeEditarRespuesta = (reply) =>
    String(reply.autor?.id || "") === usuarioActualId;

  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(post.texto || "");
  const [photos, setPhotos] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Estado y lógica de comentarios
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // Estado y lógica de respuestas
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Estado y lógica para editar comentarios y respuestas.
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  const keptImagesCount = images.filter(
    (image) => !removedImages.includes(image)
  ).length;

  const availableSlots = Math.max(0, MAX_IMAGES - keptImagesCount);

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

    setEditError("");
  }

  function handlePhotoSelection(event) {
    const selected = Array.from(event.target.files || []);

    // Permite volver a elegir el mismo archivo.
    event.target.value = "";

    setPhotos((current) => {
      const combined = [...current];

      const slots = Math.max(
        0,
        MAX_IMAGES -
          images.filter(
            (image) => !removedImages.includes(image)
          ).length
      );

      let exceededLimit = false;

      for (const file of selected) {
        const duplicate = combined.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        );

        if (duplicate) continue;

        if (combined.length < slots) {
          combined.push(file);
        } else {
          exceededLimit = true;
        }
      }

      setEditError(
        exceededLimit
          ? "La publicación admite máximo 10 fotos en total."
          : ""
      );

      return combined;
    });
  }

  function removeNewPhoto(index) {
    setPhotos((current) => current.filter((_, i) => i !== index));
    setEditError("");
  }

  async function handleSaveEdit(event) {
    event.preventDefault();

    if (!texto.trim()) {
      setEditError("La publicación no puede estar vacía.");
      return;
    }

    if (keptImagesCount + photos.length > MAX_IMAGES) {
      setEditError("La publicación admite máximo 10 fotos en total.");
      return;
    }

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

  async function toggleComments() {
    const shouldOpen = !commentsOpen;
    setCommentsOpen(shouldOpen);

    if (!shouldOpen) return;

    setLoadingComments(true);

    try {
      const data = await apiRequest(`/publicaciones/${post.id}/comentarios`);
      setComments(data.comentarios || []);
    } catch (error) {
      alert(error.message || "No se pudieron cargar los comentarios.");
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();

    const textoComentario = commentText.trim();
    if (!textoComentario || sendingComment) return;

    setSendingComment(true);

    try {
      const data = await apiRequest(`/publicaciones/${post.id}/comentarios`, {
        method: "POST",
        body: { texto: textoComentario },
      });

      if (data.comentario) {
        setComments((current) => [...current, data.comentario]);
      }

      setCommentText("");

      onChange({
        ...post,
        totalComentarios:
          data.totalComentarios ?? (post.totalComentarios || 0) + 1,
      });
    } catch (error) {
      alert(error.message || "No se pudo publicar el comentario.");
    } finally {
      setSendingComment(false);
    }
  }

  // Dar o quitar like a un comentario.
  async function handleCommentLike(comment) {
    try {
      const data = await apiRequest(
        `/publicaciones/${post.id}/comentarios/${comment.id}/like`,
        { method: "POST" }
      );

      setComments((current) =>
        current.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                totalLikes: data.comentario.totalLikes,
                meGusta: data.comentario.meGusta,
              }
            : item
        )
      );
    } catch (error) {
      alert(error.message || "No se pudo dar like al comentario.");
    }
  }

  async function handleDeleteComment(comment) {
  if (
    !window.confirm(
      "¿Eliminar este comentario y todas sus respuestas?"
    )
  ) {
    return;
  }

  try {
    await apiRequest(
      `/publicaciones/${post.id}/comentarios/${comment.id}`,
      { method: "DELETE" }
    );

    setComments((current) =>
      current.filter((item) => item.id !== comment.id)
    );

    setReplyingTo((current) =>
      current?.commentId === comment.id ? null : current
    );

    setReplyText("");

    onChange({
      ...post,
      totalComentarios: Math.max(
        0,
        (post.totalComentarios || 0) - 1
      ),
    });
  } catch (error) {
    alert(error.message || "No se pudo eliminar el comentario.");
  }
}

async function handleDeleteReply(comment, reply) {
  if (
    !window.confirm(
      "¿Eliminar esta respuesta y todas sus respuestas dependientes?"
    )
  ) {
    return;
  }

  try {
    const data = await apiRequest(
      `/publicaciones/${post.id}/comentarios/${comment.id}/respuestas/${reply.id}`,
      { method: "DELETE" }
    );

    // El backend devuelve la cantidad de respuestas eliminadas.
    const idsEliminar = new Set([reply.id]);

    // Identificar las respuestas descendientes para actualizar
    // correctamente la interfaz.
    const respuestas = comment.respuestas || [];
    let huboCambios = true;

    while (huboCambios) {
      huboCambios = false;

      for (const item of respuestas) {
        if (
          item.responderA &&
          idsEliminar.has(item.responderA) &&
          !idsEliminar.has(item.id)
        ) {
          idsEliminar.add(item.id);
          huboCambios = true;
        }
      }
    }

    setComments((current) =>
      current.map((item) =>
        item.id !== comment.id
          ? item
          : {
              ...item,
              respuestas: (item.respuestas || []).filter(
                (answer) => !idsEliminar.has(answer.id)
              ),
            }
      )
    );

    setReplyingTo((current) =>
      current &&
      current.commentId === comment.id &&
      idsEliminar.has(current.targetId)
        ? null
        : current
    );

    if (
      replyingTo?.commentId === comment.id &&
      idsEliminar.has(replyingTo.targetId)
    ) {
      setReplyText("");
    }
  } catch (error) {
    alert(error.message || "No se pudo eliminar la respuesta.");
  }
}

  // Dar o quitar like a una respuesta.
  async function handleReplyLike(comment, reply) {
    try {
      const data = await apiRequest(
        `/publicaciones/${post.id}/comentarios/${comment.id}/respuestas/${reply.id}/like`,
        { method: "POST" }
      );

      setComments((current) =>
        current.map((item) =>
          item.id !== comment.id
            ? item
            : {
                ...item,
                respuestas: (item.respuestas || []).map((answer) =>
                  answer.id === reply.id
                    ? {
                        ...answer,
                        totalLikes: data.respuesta.totalLikes,
                        meGusta: data.respuesta.meGusta,
                      }
                    : answer
                ),
              }
        )
      );
    } catch (error) {
      alert(error.message || "No se pudo dar like a la respuesta.");
    }
  }

  // Preparar la edición de un comentario.
  function startEditComment(comment) {
    setEditingCommentId(comment.id);
    setEditingReplyId(null);
    setEditCommentText(comment.texto || "");
    setReplyingTo(null);
    setReplyText("");
  }

  // Preparar la edición de una respuesta.
  function startEditReply(reply) {
    setEditingReplyId(reply.id);
    setEditingCommentId(null);
    setEditCommentText(reply.texto || "");
    setReplyingTo(null);
    setReplyText("");
  }

  // Cancelar la edición actual.
  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingReplyId(null);
    setEditCommentText("");
  }

  // Guardar la edición de un comentario.
  async function handleSaveComment(comment) {
    const nuevoTexto = editCommentText.trim();

    if (!nuevoTexto || nuevoTexto.length > 500) {
      alert("El texto debe tener entre 1 y 500 caracteres.");
      return;
    }

    setSavingComment(true);

    try {
      const data = await apiRequest(
        `/publicaciones/${post.id}/comentarios/${comment.id}`,
        {
          method: "PUT",
          body: { texto: nuevoTexto },
        }
      );

      const textoActualizado = data.comentario?.texto || nuevoTexto;
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id
            ? { ...item, texto: textoActualizado }
            : item
        )
      );

      cancelEditComment();
    } catch (error) {
      alert(error.message || "No se pudo editar el comentario.");
    } finally {
      setSavingComment(false);
    }
  }

  // Guardar la edición de una respuesta.
  async function handleSaveReply(comment, reply) {
    const nuevoTexto = editCommentText.trim();

    if (!nuevoTexto || nuevoTexto.length > 500) {
      alert("El texto debe tener entre 1 y 500 caracteres.");
      return;
    }

    setSavingComment(true);

    try {
      const data = await apiRequest(
        `/publicaciones/${post.id}/comentarios/${comment.id}/respuestas/${reply.id}`,
        {
          method: "PUT",
          body: { texto: nuevoTexto },
        }
      );

      const textoActualizado = data.respuesta?.texto || nuevoTexto;
      setComments((current) =>
        current.map((item) =>
          item.id !== comment.id
            ? item
            : {
                ...item,
                respuestas: (item.respuestas || []).map((answer) =>
                  answer.id === reply.id
                    ? { ...answer, texto: textoActualizado }
                    : answer
                ),
              }
        )
      );

      cancelEditComment();
    } catch (error) {
      alert(error.message || "No se pudo editar la respuesta.");
    } finally {
      setSavingComment(false);
    }
  }

  // Preparar una respuesta y mencionar al usuario.
  function startReply(comment, reply = null) {
    const target = reply || comment;
    const username = target.autor?.username || "";

    setReplyingTo({
      commentId: comment.id,
      targetId: reply?.id || null,
    });

    setReplyText(username ? `@${username} ` : "");
  }

  // Publicar una respuesta.
  async function handleReplySubmit(event) {
    event.preventDefault();

    if (!replyingTo || !replyText.trim() || sendingReply) return;

    setSendingReply(true);

    try {
      const data = await apiRequest(
        `/publicaciones/${post.id}/comentarios/${replyingTo.commentId}/respuestas`,
        {
          method: "POST",
          body: {
            texto: replyText.trim(),
            responderA: replyingTo.targetId,
          },
        }
      );

      if (data.respuesta) {
        setComments((current) =>
          current.map((comment) =>
            comment.id === replyingTo.commentId
              ? {
                  ...comment,
                  respuestas: [
                    ...(comment.respuestas || []),
                    data.respuesta,
                  ],
                }
              : comment
          )
        );
      }

      setReplyText("");
      setReplyingTo(null);
    } catch (error) {
      alert(error.message || "No se pudo publicar la respuesta.");
    } finally {
      setSendingReply(false);
    }
  }

  return (    <article className="card post">
      <div className="post-head">
        <UserHoverCard user={author}>
          <UserAvatar user={author} />
        </UserHoverCard>

        <div>
          <div className="name">
            <UserHoverCard user={author}>
              {author.nombre || author.username}
            </UserHoverCard>{" "}
            <UserHoverCard user={author}>
              <span className="handle">@{author.username}</span>
            </UserHoverCard>
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
            <label htmlFor={`post-text-${post.id}`}>Texto</label>

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
                        disabled={saving}
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
              onChange={handlePhotoSelection}
              disabled={saving || availableSlots === 0}
            />

            <small>
              Puedes añadir fotos en varias selecciones. Tienes espacio
              para {availableSlots} foto(s) nueva(s).
            </small>
          </div>

          {photos.length > 0 && (
            <div className="field">
              <label>
                Fotos nuevas seleccionadas ({photos.length})
              </label>

              {photos.map((photo, index) => (
                <div
                  key={`${photo.name}-${photo.lastModified}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span>{photo.name}</span>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => removeNewPhoto(index)}
                    disabled={saving}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          {editError && (
            <p className="form-error" role="alert">
              {editError}
            </p>
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
          <p className="post-text">{renderTextWithMentions(post.texto)}</p>

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
          type="button"
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

        <button
          type="button"
          className="post-action-btn"
          onClick={toggleComments}
          aria-expanded={commentsOpen}
          aria-label={`${commentsOpen ? "Ocultar" : "Ver"} comentarios`}
        >
          <Icon name="comment" size={16} />
          <span className="count">
            {post.totalComentarios || 0}
          </span>
        </button>

        <button type="button" className="post-action-btn">
          <Icon name="share" size={16} /> Compartir
        </button>
      </div>

      {commentsOpen && (
        <section className="post-comments" aria-label="Comentarios">
          {loadingComments ? (
            <p className="post-comments-empty">
              Cargando comentarios...
            </p>
          ) : (
            <div className="post-comments-list">
              {comments.length === 0 ? (
                <p className="post-comments-empty">
                  Todavía no hay comentarios. ¡Sé el primero!
                </p>
              ) : (
                comments.map((comment) => (
                  <div className="post-comment" key={comment.id}>
                    {comment.autor && (
                      <UserHoverCard user={comment.autor}>
                        <UserAvatar
                          user={comment.autor}
                          size={32}
                        />
                      </UserHoverCard>
                    )}

                    <div className="post-comment-content">
                      <div className="post-comment-bubble">
                        <strong>
                          {comment.autor ? (
                            <UserHoverCard user={comment.autor}>
                              {comment.autor.nombre || comment.autor.username || "Usuario"}
                            </UserHoverCard>
                          ) : "Usuario"}
                        </strong>

                        {editingCommentId === comment.id ? (
                          <div className="comment-edit-form">
                            <textarea
                              value={editCommentText}
                              onChange={(event) => setEditCommentText(event.target.value)}
                              maxLength={500}
                              rows={3}
                              autoFocus
                              aria-label="Editar comentario"
                              disabled={savingComment}
                            />
                            <div className="comment-interactions">
                              <button
                                type="button"
                                className="comment-interaction-btn"
                                onClick={() => handleSaveComment(comment)}
                                disabled={savingComment || !editCommentText.trim()}
                              >
                                {savingComment ? "Guardando..." : "Guardar"}
                              </button>
                              <button
                                type="button"
                                className="comment-interaction-btn"
                                onClick={cancelEditComment}
                                disabled={savingComment}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p>{comment.texto}</p>
                        )}
                      </div>

                      <small>
                        {comment.fecha
                          ? timeAgo(comment.fecha)
                          : "Ahora"}
                      </small>

                      {/* Acciones del comentario */}
                      <div className="comment-interactions">
                        <button
                          type="button"
                          className={`comment-interaction-btn ${
                            comment.meGusta ? "liked" : ""
                          }`}
                          onClick={() => handleCommentLike(comment)}
                          aria-label="Dar o quitar like al comentario"
                        >
                          ♥ {comment.totalLikes || 0}
                        </button>

                        <button
                          type="button"
                          className="comment-interaction-btn"
                          onClick={() => startReply(comment)}
                        >
                          Responder
                        </button>

                        {puedeEditarComentario(comment) && editingCommentId !== comment.id && (
                          <button
                            type="button"
                            className="comment-interaction-btn"
                            onClick={() => startEditComment(comment)}
                            disabled={savingComment}
                            aria-label="Editar comentario"
                          >
                            <Icon name="pencil" size={13} /> Editar
                          </button>
                        )}

                        {puedeEliminarComentario(comment) && (
                          <button
                            type="button"
                            className="comment-interaction-btn"
                            onClick={() => handleDeleteComment(comment)}
                            aria-label="Eliminar comentario"
                          >
                            <Icon name="trash" size={13} /> Eliminar
                          </button>
                        )}
                      </div>

                      {/* Respuestas del comentario */}
                      {(comment.respuestas || []).map((reply) => (
                        <div className="post-reply" key={reply.id}>
                          {reply.autor && (
                            <UserHoverCard user={reply.autor}>
                              <UserAvatar user={reply.autor} size={28} />
                            </UserHoverCard>
                          )}

                          <div className="post-comment-content">
                            <div className="post-comment-bubble">
                              <strong>
                                {reply.autor ? (
                                  <UserHoverCard user={reply.autor}>
                                    {reply.autor.nombre || reply.autor.username || "Usuario"}
                                  </UserHoverCard>
                                ) : (
                                  "Usuario"
                                )}
                              </strong>

                              {editingReplyId === reply.id ? (
                                <div className="comment-edit-form">
                                  <textarea
                                    value={editCommentText}
                                    onChange={(event) => setEditCommentText(event.target.value)}
                                    maxLength={500}
                                    rows={3}
                                    autoFocus
                                    aria-label="Editar respuesta"
                                    disabled={savingComment}
                                  />
                                  <div className="comment-interactions">
                                    <button
                                      type="button"
                                      className="comment-interaction-btn"
                                      onClick={() => handleSaveReply(comment, reply)}
                                      disabled={savingComment || !editCommentText.trim()}
                                    >
                                      {savingComment ? "Guardando..." : "Guardar"}
                                    </button>
                                    <button
                                      type="button"
                                      className="comment-interaction-btn"
                                      onClick={cancelEditComment}
                                      disabled={savingComment}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p>{renderTextWithMentions(reply.texto)}</p>
                              )}
                            </div>

                            <small>
                              {reply.fecha ? timeAgo(reply.fecha) : "Ahora"}
                            </small>

                            <div className="comment-interactions">
                              <button
                                type="button"
                                className={`comment-interaction-btn ${
                                  reply.meGusta ? "liked" : ""
                                }`}
                                onClick={() => handleReplyLike(comment, reply)}
                                aria-label="Dar o quitar like a la respuesta"
                              >
                                ♥ {reply.totalLikes || 0}
                              </button>

                              <button
                                type="button"
                                className="comment-interaction-btn"
                                onClick={() => startReply(comment, reply)}
                              >
                                Responder
                              </button>

                              {puedeEditarRespuesta(reply) && editingReplyId !== reply.id && (
                                <button
                                  type="button"
                                  className="comment-interaction-btn"
                                  onClick={() => startEditReply(reply)}
                                  disabled={savingComment}
                                  aria-label="Editar respuesta"
                                >
                                  <Icon name="pencil" size={13} /> Editar
                                </button>
                              )}

                              {puedeEliminarRespuesta(reply) && (
                                <button
                                  type="button"
                                  className="comment-interaction-btn"
                                  onClick={() => handleDeleteReply(comment, reply)}
                                  aria-label="Eliminar respuesta"
                                >
                                  <Icon name="trash" size={13} /> Eliminar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Formulario para responder al comentario */}
                      {replyingTo?.commentId === comment.id && (
                        <form
                          className="post-reply-form"
                          onSubmit={handleReplySubmit}
                        >
                          <input
                            type="text"
                            value={replyText}
                            onChange={(event) =>
                              setReplyText(event.target.value)
                            }
                            placeholder="Escribe una respuesta..."
                            maxLength={500}
                            disabled={sendingReply}
                            aria-label="Escribe una respuesta"
                            autoFocus
                          />

                          <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={
                              sendingReply || !replyText.trim()
                            }
                          >
                            {sendingReply
                              ? "Enviando..."
                              : "Responder"}
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText("");
                            }}
                            disabled={sendingReply}
                          >
                            Cancelar
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Formulario para publicar un comentario */}
          <form
            className="post-comment-form"
            onSubmit={handleCommentSubmit}
          >
            <input
              type="text"
              value={commentText}
              onChange={(event) =>
                setCommentText(event.target.value)
              }
              placeholder="Escribe un comentario..."
              maxLength={500}
              disabled={sendingComment}
              aria-label="Escribe un comentario"
            />

            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={
                sendingComment || !commentText.trim()
              }
            >
              {sendingComment ? "Enviando..." : "Enviar"}
            </button>
          </form>
        </section>
      )}
    </article>
  );
}