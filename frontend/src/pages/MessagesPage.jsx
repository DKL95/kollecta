import { useCallback, useEffect, useRef, useState } from "react";
import Avatar, { UserAvatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/client";
import { socket } from "../api/socket";

function obtenerIniciales(usuario) {
  const nombre = usuario?.nombre || usuario?.username || "?";

  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

function obtenerNombre(usuario) {
  return usuario?.nombre || usuario?.username || "Usuario";
}

function obtenerOtroParticipante(conversacion, usuarioActual) {
  const miId = usuarioActual?._id || usuarioActual?.id;

  return (
    conversacion?.participantes?.find(
      (participante) => String(participante._id) !== String(miId)
    ) || null
  );
}

function formatearHora(fecha) {
  if (!fecha) return "";

  const fechaMensaje = new Date(fecha);

  if (Number.isNaN(fechaMensaje.getTime())) return "";

  return fechaMensaje.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const { user } = useAuth();

  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [error, setError] = useState("");

  const chatBody = useRef(null);
  const searchTimeout = useRef(null);

  const activeThread = threads.find(
    (thread) => thread._id === activeId
  );

  // Cargar conversaciones guardadas en MongoDB.
  const cargarConversaciones = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/mensajes/conversaciones");
      const conversaciones = Array.isArray(data) ? data : [];

      setThreads(conversaciones);

      setActiveId((actual) => {
        if (
          actual &&
          conversaciones.some((thread) => thread._id === actual)
        ) {
          return actual;
        }

        return conversaciones.length > 0
          ? conversaciones[0]._id
          : null;
      });
    } catch (err) {
      setError(
        err.message || "No se pudieron cargar las conversaciones"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarConversaciones();
  }, [cargarConversaciones]);

  // Evitar que el temporizador de búsqueda quede activo al salir.
  useEffect(() => {
    return () => {
      clearTimeout(searchTimeout.current);
    };
  }, []);

  // Buscar usuarios registrados.
  function manejarBusqueda(event) {
    const texto = event.target.value;

    setSearch(texto);
    setSearchResults([]);
    clearTimeout(searchTimeout.current);

    if (!texto.trim()) {
      setSearching(false);
      return;
    }

    setSearching(true);

    searchTimeout.current = setTimeout(async () => {
      try {
        const data = await apiRequest(
          `/usuarios/?q=${encodeURIComponent(texto.trim())}`
        );

        // No mostrar resultados de una búsqueda anterior.
        if (texto === searchTimeout.currentText) {
          setSearchResults(data.usuarios || []);
        }
      } catch (err) {
        setError(err.message || "No se pudieron buscar usuarios");
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    searchTimeout.currentText = texto;
  }

  // Abrir una conversación existente o crear una nueva.
  async function abrirConversacion(usuario) {
    const usuarioId = usuario?._id || usuario?.id;

    console.log("Usuario seleccionado:", usuario);
    console.log("ID del usuario:", usuarioId);

    if (!usuarioId) {
      setError("El usuario seleccionado no tiene un identificador válido.");
      return;
    }

    if (openingChat) return;

    setOpeningChat(true);
    setError("");

    try {
      const conversacion = await apiRequest(
        `/mensajes/conversaciones/${usuarioId}`,
        { method: "POST" }
      );

      const data = await apiRequest("/mensajes/conversaciones");

      setThreads(Array.isArray(data) ? data : []);
      setActiveId(conversacion._id || conversacion.id);
      setSearch("");
      setSearchResults([]);
      setDraft("");
    } catch (err) {
      console.error("Error al abrir conversación:", err);
      setError(err.message || "No se pudo abrir la conversación");
    } finally {
      setOpeningChat(false);
    }
  }

  // Cargar el historial de la conversación seleccionada.
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    let cancelado = false;

    async function cargarMensajes() {
      setLoadingMessages(true);

      try {
        const data = await apiRequest(`/mensajes/${activeId}`);

        if (!cancelado) {
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelado) {
          setMessages([]);
          setError(err.message || "No se pudieron cargar los mensajes");
        }
      } finally {
        if (!cancelado) {
          setLoadingMessages(false);
        }
      }
    }

    cargarMensajes();

    return () => {
      cancelado = true;
    };
  }, [activeId]);

  // Escuchar mensajes nuevos en tiempo real.
  useEffect(() => {
    function recibirMensaje(mensaje) {
      const conversacionId =
        mensaje.conversacion?._id || mensaje.conversacion;

      if (String(conversacionId) !== String(activeId)) {
        return;
      }

      setMessages((anteriores) => {
        const yaExiste = anteriores.some(
          (item) => item._id === mensaje._id
        );

        if (yaExiste) return anteriores;

        return [...anteriores, mensaje];
      });

      cargarConversaciones();
    }

    socket.on("mensaje:nuevo", recibirMensaje);

    return () => {
      socket.off("mensaje:nuevo", recibirMensaje);
    };
  }, [activeId, cargarConversaciones]);

  // Conectar Socket.IO y entrar a la conversación activa.
  useEffect(() => {
    if (!activeId) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.on("connect", () => {
      console.log("🟢 Socket conectado:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("🔴 Error de Socket.IO:", error.message);
    });

    function unirseAConversacion() {
      socket.emit("conversacion:unirse", activeId, (respuesta) => {
        if (!respuesta?.ok) {
          console.error(
            "No se pudo entrar a la sala:",
            respuesta?.mensaje
          );
        }
      });
    }

    if (socket.connected) {
      unirseAConversacion();
    }

    socket.on("connect", unirseAConversacion);

    return () => {
      socket.off("connect", unirseAConversacion);
      socket.emit("conversacion:salir", activeId);
    };
  }, [activeId]);

  // Bajar automáticamente al mensaje más reciente.
  useEffect(() => {
    if (chatBody.current) {
      chatBody.current.scrollTop = chatBody.current.scrollHeight;
    }
  }, [messages, activeId]);

  // Enviar mensajes de texto.
  async function handleSend(event) {
    event.preventDefault();

    const texto = draft.trim();

    if (!texto || !activeId || sending) return;

    setSending(true);
    setError("");

    try {
      const nuevoMensaje = await apiRequest(`/mensajes/${activeId}`, {
        method: "POST",
        body: { texto },
      });

      setMessages((anteriores) => {
        const yaExiste = anteriores.some(
          (mensaje) => mensaje._id === nuevoMensaje._id
        );

        return yaExiste
          ? anteriores
          : [...anteriores, nuevoMensaje];
      });
      setDraft("");

      // Actualizar la vista previa de la conversación.
      const data = await apiRequest("/mensajes/conversaciones");

      setThreads(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="messages-shell">
      <div className="thread-list">
        {/* Buscador de personas */}
        <div className="message-search">
          <input
            type="search"
            placeholder="Buscar personas..."
            value={search}
            onChange={manejarBusqueda}
          />

          {searching && (
            <p className="messages-search-status">
              Buscando usuarios...
            </p>
          )}

          {!searching &&
            search.trim() &&
            searchResults.length === 0 && (
              <p className="messages-search-status">
                No se encontraron usuarios.
              </p>
            )}

          {searchResults.length > 0 && (
            <div className="message-search-results">
              {searchResults.map((usuario) => (
                <button
                  type="button"
                  key={usuario._id || usuario.id}
                  className="message-search-result"
                  onClick={() => abrirConversacion(usuario)}
                  disabled={openingChat}
                >
                  <Avatar
                    initials={obtenerIniciales(usuario)}
                    src={usuario.fotoPerfil}
                    alt={obtenerNombre(usuario)}
                  />

                  <span className="message-search-user">
                    <strong>{obtenerNombre(usuario)}</strong>
                    <small>@{usuario.username}</small>
                  </span>

                  <span className="message-search-action">
                    {openingChat ? "Abriendo..." : "Mensaje"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lista de conversaciones */}
        {loading ? (
          <p className="messages-empty">
            Cargando conversaciones...
          </p>
        ) : threads.length === 0 ? (
          <p className="messages-empty">
            Todavía no tienes conversaciones.
          </p>
        ) : (
          threads.map((thread) => {
            const otroUsuario = obtenerOtroParticipante(thread, user);
            const ultimoMensaje = thread.ultimoMensaje;

            return (
              <div
                key={thread._id}
                className={`thread-item ${
                  thread._id === activeId ? "active" : ""
                }`}
                onClick={() => setActiveId(thread._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveId(thread._id);
                  }
                }}
              >
                <Avatar initials={obtenerIniciales(otroUsuario)} src={otroUsuario?.fotoPerfil} alt={obtenerNombre(otroUsuario)} />

                <div className="info">
                  <div className="top-line">
                    <span className="n">
                      {obtenerNombre(otroUsuario)}
                    </span>

                    <span className="t">
                      {formatearHora(
                        ultimoMensaje?.createdAt ||
                          thread.fechaActividad
                      )}
                    </span>
                  </div>

                  <div className="preview">
                    {ultimoMensaje?.texto || "Inicia la conversación"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Área del chat */}
      <div className="chat-col">
        {activeThread ? (
          <>
            <div className="chat-head">
              <Avatar
                initials={obtenerIniciales(
                  obtenerOtroParticipante(activeThread, user)
                )}
                src={obtenerOtroParticipante(activeThread, user)?.fotoPerfil}
                alt={obtenerNombre(
                  obtenerOtroParticipante(activeThread, user)
                )}
              />

              <div>
                <div className="n">
                  {obtenerNombre(
                    obtenerOtroParticipante(activeThread, user)
                  )}
                </div>

                <div className="status">Mensajes privados</div>
              </div>
            </div>

            <div className="chat-body" ref={chatBody}>
              {loadingMessages ? (
                <p className="messages-empty">
                  Cargando mensajes...
                </p>
              ) : messages.length === 0 ? (
                <p className="messages-empty">
                  No hay mensajes todavía. ¡Escribe el primero!
                </p>
              ) : (
                messages.map((message) => {
                  const miId = user?._id || user?.id;

                  const remitenteId =
                    message.remitente?._id || message.remitente;

                  const esMio =
                    String(remitenteId) === String(miId);

                  return (
                    <div
                      key={message._id}
                      className={`msg-row ${esMio ? "mine" : ""}`}
                    >
                      {esMio ? (
                        <UserAvatar
                          user={user}
                          size={28}
                          fontSize={10}
                        />
                      ) : (
                        <Avatar
                          initials={obtenerIniciales(message.remitente)}
                          src={message.remitente?.fotoPerfil}
                          alt={obtenerNombre(message.remitente)}
                          size={28}
                          fontSize={10}
                        />
                      )}

                      <div className="bubble">{message.texto}</div>
                    </div>
                  );
                })
              )}
            </div>

            <form className="chat-input-row" onSubmit={handleSend}>
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={5000}
                disabled={sending}
              />

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={sending || !draft.trim()}
              >
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty">
            <h3>Mensajes</h3>
            <p>
              {loading
                ? "Cargando conversaciones..."
                : "Busca una persona para iniciar una conversación o selecciona un chat existente."}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="messages-error" role="alert">
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Cerrar mensaje de error"
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}