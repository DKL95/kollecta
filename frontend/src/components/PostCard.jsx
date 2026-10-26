import { useState, useEffect, useRef } from "react";
import { apiRequest, USER_KEY, TOKEN_KEY } from "../api/client";
import { UserAvatar } from "./Avatar";
import Icon from "./Icon";
import Photo from "./Photo";
import { timeAgo } from "../utils/format";
import UserHoverCard from "./UserHoverCard";

const MAX_IMAGES = 10;
const MAX_VIDEOS = 5;

function MentionAutocomplete({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
  ariaLabel,
  autoFocus,
  rows,
}) {
  const inputRef = useRef(null);
  const suggestionRef = useRef(null);

  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Detecta si el cursor está escribiendo una mención, por ejemplo @moka.
  const updateMentionQuery = (text, cursorPosition) => {
    const beforeCursor = text.slice(0, cursorPosition);
    const match = beforeCursor.match(/(^|\s)@([a-zA-Z0-9_.-]*)$/);

    if (!match) {
      setMentionQuery(null);
      setSuggestions([]);
      return;
    }

    setMentionQuery({
      query: match[2],
      start: cursorPosition - match[2].length - 1,
      end: cursorPosition,
    });
  };

  // Busca usuarios cuando se escribe después de @.
  useEffect(() => {
    if (mentionQuery === null) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);

        const response = await apiRequest(
          `/usuarios?q=${encodeURIComponent(mentionQuery.query)}`
        );

        if (cancelled) return;

        const usuarios = Array.isArray(response)
          ? response
          : response?.usuarios || [];

        setSuggestions(usuarios);
        setActiveIndex(0);
      } catch (error) {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSuggestions(false);
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mentionQuery]);

  const handleChange = (event) => {
    const nextValue = event.target.value;
    onChange(nextValue);

    updateMentionQuery(
      nextValue,
      event.target.selectionStart ?? nextValue.length
    );
  };

  const insertMention = (usuario) => {
    if (!mentionQuery || !usuario?.username) return;

    const start = mentionQuery.start;
    const end = mentionQuery.end;
    const currentValue = value || "";

    // Agrega un espacio después del nombre para continuar escribiendo.
    const mention = `@${usuario.username} `;
    const nextValue =
      currentValue.slice(0, start) +
      mention +
      currentValue.slice(end);

    onChange(nextValue);
    setMentionQuery(null);
    setSuggestions([]);

    requestAnimationFrame(() => {
      const input = inputRef.current;

      if (input) {
        input.focus();

        const cursorPosition = start + mention.length;
        input.setSelectionRange(cursorPosition, cursorPosition);
      }
    });
  };

  const handleKeyDown = (event) => {
    if (mentionQuery === null || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) => (index - 1 + suggestions.length) % suggestions.length
      );
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      insertMention(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setMentionQuery(null);
      setSuggestions([]);
    }
  };

  const sharedProps = {
    ref: inputRef,
    value: value || "",
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    placeholder,
    maxLength,
    disabled,
    "aria-label": ariaLabel,
    autoFocus,
    onClick: (event) =>
      updateMentionQuery(
        event.currentTarget.value,
        event.currentTarget.selectionStart
      ),
    onKeyUp: (event) => {
      if (
        ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
      ) {
        updateMentionQuery(
          event.currentTarget.value,
          event.currentTarget.selectionStart
        );
      }
    },
    onBlur: () => {
      // Retrasa el cierre para permitir seleccionar una sugerencia con el mouse.
      setTimeout(() => {
        if (!suggestionRef.current?.matches(":hover")) {
          setMentionQuery(null);
          setSuggestions([]);
        }
      }, 150);
    },
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {typeof rows === "number" ? (
        <textarea {...sharedProps} rows={rows} />
      ) : (
        <input {...sharedProps} type="text" />
      )}

      {mentionQuery !== null &&
        (loadingSuggestions || suggestions.length > 0) && (
          <div
            ref={suggestionRef}
            role="listbox"
            aria-label="Usuarios para mencionar"
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: 0,
              width: "min(100%, 320px)",
              maxHeight: "240px",
              overflowY: "auto",
              background: "#1b102b",
              color: "#f5edff",
              border: "1px solid #7543a6",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              zIndex: 1000,
              padding: "4px",
            }}
          >
            {loadingSuggestions && (
              <div style={{ padding: "10px" }}>Buscando usuarios...</div>
            )}

            {!loadingSuggestions &&
              suggestions.map((usuario, index) => (
                <button
                  key={usuario._id || usuario.id || usuario.username}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => insertMention(usuario)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "9px 10px",
                    border: 0,
                    borderRadius: "7px",
                    textAlign: "left",
                    cursor: "pointer",
                    background:
                      index === activeIndex
                        ? "linear-gradient(90deg, #51277a, #38204f)"
                        : "transparent",
                    color: "#f5edff",
                    transition: "background 0.15s ease",
                  }}
                >
                  <UserAvatar user={usuario} />

                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      minWidth: 0,
                    }}
                  >
                    <strong>
                      {usuario.nombre || usuario.username}
                    </strong>

                    <small style={{ opacity: 0.7 }}>
                      @{usuario.username}
                      {usuario.esAmigo ? " · Amigo" : ""}
                    </small>
                  </span>
                </button>
              ))}
          </div>
        )}
    </div>
  );
}

// Convierte las menciones @usuario en elementos interactivos con vista previa
// y acceso al perfil, tanto en publicaciones como en comentarios y respuestas.
function renderTextWithMentions(text) {
  const value = String(text || "");
  const mentionRegex = /(^|[\s([{,;:!?])(@[a-zA-Z0-9_.-]+)/g;
  const elements = [];
  let lastIndex = 0;
  let match;
  let index = 0;

  while ((match = mentionRegex.exec(value)) !== null) {
    const [, prefix, mention] = match;
    const mentionStart = match.index + prefix.length;

    // Conserva intacto el texto que aparece antes de la mención.
    if (mentionStart > lastIndex) {
      elements.push(value.slice(lastIndex, mentionStart));
    }

    elements.push(
      <UserHoverCard key={`mention-${index++}`} user={mention}>
        <span className="post-mention">{mention}</span>
      </UserHoverCard>
    );

    lastIndex = mentionStart + mention.length;
  }

  if (lastIndex < value.length) {
    elements.push(value.slice(lastIndex));
  }

  return elements;
}

export default function PostCard({ post, onChange, onDelete }) {
  const author = post.autor || {};
  const images = post.imagenes || (post.imagen ? [post.imagen] : []); 
  const videosExistentes = post.videos || [];
  const mediaItems = [
    ...images.map((src) => ({ type: "image", src })),
    ...videosExistentes.map((src) => ({ type: "video", src })),
  ];

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
  const [photoViewerIndex, setPhotoViewerIndex] = useState(null);
  const [texto, setTexto] = useState(post.texto || "");
  const [photos, setPhotos] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [removedVideos, setRemovedVideos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [videoUrls, setVideoUrls] = useState({});
  const [videoErrors, setVideoErrors] = useState({});

  useEffect(() => {
    let cancelado = false;
    const urlsTemporales = [];

    async function cargarVideos() {
      const videos = post.videos || [];
      const token = localStorage.getItem(TOKEN_KEY);
      console.log("¿Hay token para cargar videos?:", Boolean(token));

      if (videos.length === 0) {
        setVideoUrls({});
        setVideoErrors({});
        return;
      }

      const nuevasUrls = {};
      const nuevosErrores = {};

      await Promise.all(
        videos.map(async (video) => {
          try {
            const ruta = video.startsWith("/api/")
              ? video
              : `/api/videos/${video}`;

            const respuesta = await fetch(ruta, {
              headers: token
                ? { Authorization: `Bearer ${token}` }
                : {},
            });

            if (!respuesta.ok) {
              throw new Error(`Error ${respuesta.status} al cargar el video`);
            }

            const archivo = await respuesta.blob();
            const urlTemporal = URL.createObjectURL(archivo);

            urlsTemporales.push(urlTemporal);
            nuevasUrls[video] = urlTemporal;
          } catch (error) {
            nuevosErrores[video] = error.message;
          }
        })
      );

      if (cancelado) {
        urlsTemporales.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      setVideoUrls(nuevasUrls);
      setVideoErrors(nuevosErrores);
    }

    cargarVideos();

    return () => {
      cancelado = true;
      urlsTemporales.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [post.videos]);

  // Estado y lógica de comentarios
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // Estado y lógica de respuestas
  const [replyingTo, setReplyingTo] = useState(null);

  // Las respuestas permanecen ocultas hasta que el usuario las despliega.
  const [expandedReplies, setExpandedReplies] = useState(() => new Set());

  function toggleReplies(commentId) {
    setExpandedReplies((current) => {
      const next = new Set(current);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }
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

  const keptVideosCount = videosExistentes.filter(
    (video) => !removedVideos.includes(video)
  ).length;

  const availableVideoSlots = Math.max(
    0,
    MAX_VIDEOS - keptVideosCount
  );

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
    setVideos([]);
    setRemovedVideos([]);
    setEditError("");
    setEditing(true);
  }

  function cancelEditing() {
    setPhotos([]);
    setRemovedImages([]);
    setVideos([]);
    setRemovedVideos([]);
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

  function toggleRemoveVideo(video) {
    setRemovedVideos((current) =>
      current.includes(video)
        ? current.filter((item) => item !== video)
        : [...current, video]
    );

    setEditError("");
  }

  function handleVideoSelection(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    const validVideos = selectedFiles.filter((file) =>
      file.type.startsWith("video/")
    );

    if (validVideos.length !== selectedFiles.length) {
      setEditError("Selecciona únicamente archivos de video.");
    } else {
      setEditError("");
    }

    const remainingVideos = validVideos.filter(
      (file) =>
        !videos.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified
        )
    );

    const slots = Math.max(
      0,
      MAX_VIDEOS - keptVideosCount - videos.length
    );

    if (remainingVideos.length > slots) {
      setEditError(
        `Solo puedes agregar ${slots} video(s) más. El límite es de ${MAX_VIDEOS} videos por publicación.`
      );
    }

    setVideos((current) => [
      ...current,
      ...remainingVideos.slice(0, slots),
    ]);
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

      if (keptVideosCount + videos.length > MAX_VIDEOS) {
        setEditError("La publicación admite máximo 5 videos en total.");
        return;
      }

      setSaving(true);
      setEditError("");

      try {
        const body = new FormData();

        // Texto de la publicación
        body.append("texto", texto.trim());

        // Fotos que se eliminarán
        body.append(
          "imagenesEliminadas",
          JSON.stringify(removedImages)
        );

        // Videos que se eliminarán
        body.append(
          "videosEliminados",
          JSON.stringify(removedVideos)
        );

        // Fotos nuevas
        photos.forEach((photo) => {
          body.append("imagenes", photo);
        });

        // Videos nuevos
        videos.forEach((video) => {
          body.append("videos", video);
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

    // Se elimina el comentario y todas sus respuestas.
    const totalEliminados = 1 + (comment.respuestas || []).length;

    onChange({
      ...post,
      totalComentarios: Math.max(
        0,
        (post.totalComentarios || 0) - totalEliminados
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

    // Resta la respuesta eliminada y todas sus respuestas dependientes.
    onChange({
      ...post,
      totalComentarios: Math.max(
        0,
        (post.totalComentarios || 0) - idsEliminar.size
      ),
    });
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

      // Cada respuesta también cuenta como comentario de la publicación.
      if (data.respuesta) {
        onChange({
          ...post,
          totalComentarios: (post.totalComentarios || 0) + 1,
        });
      }
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

            <MentionAutocomplete
              value={texto}
              onChange={setTexto}
              rows={4}
              maxLength={1000}
              required
              ariaLabel="Editar publicación"
            />
          </div>

          {/* FOTOS ACTUALES */}
          {images.length > 0 && (
            <div className="field">
              <label>Fotos actuales</label>

              <div className="post-photo-grid">
                {images.map((image, index) => {
                  const removed = removedImages.includes(image);

                  return (
                    <div
                      key={`${image}-${index}`}
                      className="post-photo-edit-item"
                      style={{
                        position: "relative",
                        opacity: removed ? 0.45 : 1,
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                        }}
                      >
                        <Photo
                          src={image}
                          alt={post.texto || `Foto ${index + 1}`}
                        />

                        <button
                          type="button"
                          className="post-media-remove"
                          onClick={() => toggleRemoveImage(image)}
                          disabled={saving}
                          aria-label={removed ? "Conservar foto" : "Eliminar foto"}
                          title={removed ? "Conservar foto" : "Eliminar foto"}
                        >
                          {removed ? "↶" : "✕"}
                        </button>
                      </div>

                      {removed && (
                        <small>Se eliminará al guardar</small>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AGREGAR FOTOS NUEVAS */}
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

          {/* LISTA DE FOTOS NUEVAS */}
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

          {/* VIDEOS ACTUALES */}
          {videosExistentes.filter((video) => !removedVideos.includes(video)).length > 0 && (
            <div className="post-photo-grid post-video-grid">
              {videosExistentes.map((video, index) => {
                if (removedVideos.includes(video)) return null;

                return (
                  <div
                    className="post-media post-video-item"
                    key={`${video}-${index}`}
                    style={{ position: "relative" }}
                  >
                    <button
                      type="button"
                      className="post-media-remove"
                      onClick={() =>
                        setRemovedVideos((current) => [...current, video])
                      }
                      aria-label="Eliminar video"
                      title="Eliminar video"
                    >
                      ✕
                    </button>

                    {videoUrls[video] ? (
                      <video
                        src={videoUrls[video]}
                        controls
                        preload="metadata"
                        className="post-video-player"
                      />
                    ) : videoErrors[video] ? (
                      <p role="alert">
                        No se pudo cargar el video: {videoErrors[video]}
                      </p>
                    ) : (
                      <p>Cargando video...</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* AGREGAR VIDEOS NUEVOS */}
          <div className="field">
            <label htmlFor={`post-videos-${post.id}`}>
              Agregar videos nuevos
            </label>

            <input
              id={`post-videos-${post.id}`}
              type="file"
              accept="video/*"
              multiple
              onChange={handleVideoSelection}
              disabled={saving || availableVideoSlots === 0}
            />

            <small>
              Puedes añadir videos en varias selecciones. Tienes espacio
              para {availableVideoSlots} video(s) nuevo(s).
            </small>
          </div>

          {/* LISTA DE VIDEOS NUEVOS */}
          {videos.length > 0 && (
            <div className="field">
              <label>
                Videos nuevos seleccionados ({videos.length})
              </label>

              {videos.map((video, index) => (
                <div
                  key={`${video.name}-${video.lastModified}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span>{video.name}</span>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setVideos((current) =>
                        current.filter((_, i) => i !== index)
                      )
                    }
                    disabled={saving}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* MENSAJE DE ERROR */}
          {editError && (
            <p className="form-error" role="alert">
              {editError}
            </p>
          )}

          {/* BOTONES */}
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

          {(() => {
            const mediaItems = [
              ...images.map((src) => ({ type: "image", src })),
              ...videosExistentes.map((src) => ({ type: "video", src })),
            ];

            return mediaItems.length > 0 && (
              <div
                className={`post-photo-grid post-photo-grid-count-${Math.min(mediaItems.length, 4)}`}
              >
                {mediaItems.slice(0, 4).map((item, index) => {
                  const isLastVisible = index === 3;
                  const extraCount = mediaItems.length - 4;

                  return (
                    <button
                      key={`${item.type}-${item.src}-${index}`}
                      type="button"
                      className={`post-media post-photo-open ${
                        isLastVisible && extraCount > 0
                          ? "post-photo-more"
                          : ""
                      }`}
                      onClick={() => setPhotoViewerIndex(index)}
                      aria-label={
                        isLastVisible && extraCount > 0
                          ? `Ver ${extraCount} elementos más`
                          : item.type === "image"
                            ? `Ver foto ${index + 1}`
                            : `Ver video ${index + 1}`
                      }
                    >
                      {item.type === "image" ? (
                        <Photo
                          src={item.src}
                          alt={post.texto || `Foto ${index + 1}`}
                        />
                      ) : videoUrls[item.src] ? (
                        <video
                          src={videoUrls[item.src]}
                          preload="metadata"
                          muted
                          playsInline
                          className="post-gallery-video"
                        />
                      ) : (
                        <div className="post-gallery-video-placeholder">
                          {videoErrors[item.src]
                            ? "Video no disponible"
                            : "Cargando video…"}
                        </div>
                      )}

                      {item.type === "video" && (
                        <span className="post-gallery-play" aria-hidden="true">
                          ▶
                        </span>
                      )}

                      {isLastVisible && extraCount > 0 && (
                        <span className="post-photo-more-count">
                          +{extraCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })()}   
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
                            <MentionAutocomplete
                              value={editCommentText}
                              onChange={setEditCommentText}
                              maxLength={500}
                              rows={3}
                              autoFocus
                              ariaLabel="Editar comentario"
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
                          <p>{renderTextWithMentions(comment.texto)}</p>
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

                      {/* Control para mostrar u ocultar las respuestas */}
                      {(comment.respuestas || []).length > 0 && (
                        <button
                          type="button"
                          className="comment-interaction-btn"
                          onClick={() => toggleReplies(comment.id)}
                          aria-expanded={expandedReplies.has(comment.id)}
                        >
                          {expandedReplies.has(comment.id)
                            ? "Ocultar respuestas"
                            : `Ver respuestas (${comment.respuestas.length})`}
                        </button>
                      )}

                      {/* Las respuestas solo aparecen al desplegarlas */}
                      {expandedReplies.has(comment.id) &&
                        (comment.respuestas || []).map((reply) => (
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
                          <MentionAutocomplete
                            value={replyText}
                            onChange={setReplyText}
                            placeholder="Escribe una respuesta..."
                            maxLength={500}
                            disabled={sendingReply}
                            ariaLabel="Escribe una respuesta"
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
            <MentionAutocomplete
              value={commentText}
              onChange={setCommentText}
              placeholder="Escribe un comentario..."
              maxLength={500}
              disabled={sendingComment}
              ariaLabel="Escribe un comentario"
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

      {photoViewerIndex !== null && mediaItems.length > 0 && (
        <div
          className="post-photo-viewer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Galería multimedia de la publicación"
          onClick={() => setPhotoViewerIndex(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setPhotoViewerIndex(null);
            }

            if (event.key === "ArrowRight") {
              setPhotoViewerIndex(
                (current) => (current + 1) % mediaItems.length
              );
            }

            if (event.key === "ArrowLeft") {
              setPhotoViewerIndex(
                (current) =>
                  (current - 1 + mediaItems.length) % mediaItems.length
              );
            }
          }}
          tabIndex={-1}
        >
          <button
            type="button"
            className="post-photo-viewer-close"
            aria-label="Cerrar visor"
            onClick={() => setPhotoViewerIndex(null)}
          >
            ×
          </button>

          <div
            className="post-photo-viewer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="post-photo-viewer-stage">
              {mediaItems.length > 1 && (
                <button
                  type="button"
                  className="post-photo-viewer-arrow prev"
                  aria-label="Archivo anterior"
                  onClick={() =>
                    setPhotoViewerIndex(
                      (current) =>
                        (current - 1 + mediaItems.length) % mediaItems.length
                    )
                  }
                >
                  ‹
                </button>
              )}

              {mediaItems[photoViewerIndex].type === "image" ? (
                <img
                  src={mediaItems[photoViewerIndex].src}
                  alt={post.texto || `Foto ${photoViewerIndex + 1}`}
                  className="post-photo-viewer-image"
                />
              ) : (
                <video
                  key={mediaItems[photoViewerIndex].src}
                  src={videoUrls[mediaItems[photoViewerIndex].src]}
                  controls
                  autoPlay={false}
                  preload="metadata"
                  className="post-photo-viewer-image post-video-viewer"
                />
              )}

              {mediaItems.length > 1 && (
                <button
                  type="button"
                  className="post-photo-viewer-arrow next"
                  aria-label="Archivo siguiente"
                  onClick={() =>
                    setPhotoViewerIndex(
                      (current) => (current + 1) % mediaItems.length
                    )
                  }
                >
                  ›
                </button>
              )}

              <span className="post-photo-viewer-counter">
                {photoViewerIndex + 1} / {mediaItems.length}
              </span>
            </div>

            <aside className="post-photo-viewer-details">
              <div className="post-photo-viewer-author">
                <UserAvatar user={author} size={42} />

                <div>
                  <strong>
                    {author.nombre || author.username || "Usuario"}
                  </strong>

                  <small>
                    @{author.username || ""} · {timeAgo(post.fechaCreacion)}
                  </small>
                </div>
              </div>

              <div className="post-photo-viewer-caption">
                {renderTextWithMentions(post.texto)}
              </div>

              {post.grupo && (
                <span className="pill pink post-photo-viewer-group">
                  {post.grupo}
                </span>
              )}

              <div className="post-photo-viewer-actions">
                <button
                  type="button"
                  className={`post-action-btn like-btn ${
                    post.meGusta ? "liked" : ""
                  }`}
                  onClick={handleLike}
                >
                  <Icon
                    name={post.meGusta ? "heartFilled" : "heart"}
                    size={16}
                  />

                  <span>{post.totalLikes}</span> Me gusta
                </button>

                <button
                  type="button"
                  className="post-action-btn"
                  onClick={() => {
                    setPhotoViewerIndex(null);
                    toggleComments();
                  }}
                >
                  <Icon name="comment" size={16} />
                  Ver comentarios ({post.totalComentarios || 0})
                </button>
              </div>

              <div className="post-photo-viewer-thumbnails">
                {mediaItems.map((item, index) => (
                  <button
                    type="button"
                    key={`${item.type}-${item.src}-${index}`}
                    className={index === photoViewerIndex ? "active" : ""}
                    onClick={() => setPhotoViewerIndex(index)}
                    aria-label={
                      item.type === "image"
                        ? `Ir a foto ${index + 1}`
                        : `Ir a video ${index + 1}`
                    }
                  >
                    {item.type === "image" ? (
                      <img src={item.src} alt="" />
                    ) : (
                      <video src={item.src} muted preload="metadata" />
                    )}

                    {item.type === "video" && (
                      <span className="post-video-thumbnail-icon">▶</span>
                    )}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </div>
      )}
    </article>
  );
}