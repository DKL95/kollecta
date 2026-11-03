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

  // En móvil se muestra primero la lista; el chat se abre al seleccionar uno.
  const [mobileView, setMobileView] = useState("list");
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [error, setError] = useState("");

  const chatBody = useRef(null);
  const searchTimeout = useRef(null);

  const activeThread = threads.find(
    (thread) => thread._id === activeId
  );

  const matchingMessages = messageSearchQuery.trim()
    ? messages.filter((message) =>
        String(message.texto || "")
          .toLocaleLowerCase("es-MX")
          .includes(messageSearchQuery.trim().toLocaleLowerCase("es-MX"))
      )
    : [];

  function irAlMensaje(messageId) {
    setMessageSearchOpen(false);
    setChatMenuOpen(false);
    window.setTimeout(() => {
      const elemento = document.getElementById(`message-${messageId}`);
      elemento?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  useEffect(() => {
    setChatMenuOpen(false);
    setMessageSearchOpen(false);
    setMessageSearchQuery("");
  }, [activeId]);

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
      setMobileView("chat");
      setChatMenuOpen(false);
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

  function recibirMensaje(mensaje) {
    const conversacionId =
        mensaje.conversacion?._id || mensaje.conversacion;

    // Ignorar mensajes de otras conversaciones.
    if (String(conversacionId) !== String(activeId)) {
        return;
    }

    const miId = user?._id || user?.id;

    const remitenteId =
        mensaje.remitente?._id || mensaje.remitente;

    const esMio =
        String(remitenteId) === String(miId);

    // Si el mensaje es de otra persona, confirmar su entrega.
    if (!esMio) {
        socket.emit(
            "mensaje:confirmar-entrega",
            mensaje._id,
            (respuesta) => {
                if (!respuesta?.ok) {
                    console.error(
                        "No se pudo confirmar la entrega:",
                        respuesta?.mensaje
                    );
                }
            }
        );
    }

    // Agregar el mensaje sin duplicarlo.
    setMessages((anteriores) => {
        const yaExiste = anteriores.some(
            (item) => item._id === mensaje._id
        );

        if (yaExiste) {
            return anteriores;
        }

        return [...anteriores, mensaje];
    });

    cargarConversaciones();
}

  // Escuchar los mensajes nuevos en tiempo real.
  useEffect(() => {
    function escucharMensajeNuevo(mensaje) {
      console.log("📩 Mensaje recibido por Socket.IO:", mensaje);

      recibirMensaje(mensaje);
    }

    socket.on("mensaje:nuevo", escucharMensajeNuevo);

    return () => {
      socket.off("mensaje:nuevo", escucharMensajeNuevo);
    };
  }, [activeId, user, cargarConversaciones]);

    // Conectar Socket.IO y entrar a la conversación activa.
  useEffect(() => {
    if (!activeId) return;

    function unirseAConversacion() {
      console.log("🔵 Entrando a la conversación:", activeId);

      socket.emit("conversacion:unirse", activeId, (respuesta) => {
        if (respuesta?.ok) {
          console.log("✅ Entraste a la sala:", activeId);
        } else {
          console.error(
            "❌ No se pudo entrar a la sala:",
            respuesta?.mensaje
          );
        }
      });
    }

    function alConectar() {
      console.log("🟢 Socket conectado:", socket.id);
      unirseAConversacion();
    }

    if (socket.connected) {
      unirseAConversacion();
    } else {
      socket.connect();
      socket.on("connect", alConectar);
    }

    socket.on("connect_error", (error) => {
      console.error("🔴 Error de Socket.IO:", error.message);
    });

    return () => {
      socket.off("connect", alConectar);
      socket.emit("conversacion:salir", activeId);
    };
  }, [activeId]);
  
  // Escuchar los cambios de estado de los mensajes enviados.
  useEffect(() => {
      function actualizarEstadoMensaje(estado) {
          setMessages((anteriores) =>
              anteriores.map((mensaje) => {
                  if (String(mensaje._id) !== String(estado._id)) {
                      return mensaje;
                  }

                  return {
                      ...mensaje,
                      entregado: estado.entregado,
                      entregadoEn: estado.entregadoEn,
                      leido: estado.leido,
                      leidoEn: estado.leidoEn
                  };
              })
          );
      }

      socket.on("mensaje:estado", actualizarEstadoMensaje);

      return () => {
          socket.off("mensaje:estado", actualizarEstadoMensaje);
      };
  }, []);

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
    <main className={`messages-shell ${activeThread ? "has-active-chat" : ""} ${
      mobileView === "chat" ? "mobile-chat-open" : "mobile-list-open"
    }`}>
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
                onClick={() => {
                  setActiveId(thread._id);
                  setMobileView("chat");
                  setChatMenuOpen(false);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveId(thread._id);
                    setMobileView("chat");
                    setChatMenuOpen(false);
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
              <button
                type="button"
                className="chat-mobile-back"
                onClick={() => {
                  setMobileView("list");
                  setChatMenuOpen(false);
                }}
                aria-label="Volver a la lista de conversaciones"
              >
                ←
              </button>

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

              <div className="chat-menu-wrap">
                <button
                  type="button"
                  className="chat-menu-trigger"
                  aria-label="Opciones de conversación"
                  aria-expanded={chatMenuOpen}
                  onClick={() => setChatMenuOpen((open) => !open)}
                >
                  ⋮
                </button>

                {chatMenuOpen && (
                  <div className="chat-menu">
                    <button
                      type="button"
                      onClick={() => {
                        setChatMenuOpen(false);
                        setMessageSearchOpen((open) => !open);
                        setMessageSearchQuery("");
                      }}
                    >
                      <span aria-hidden="true">⌕</span> Buscar en conversación
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChatMenuOpen(false);
                        cargarConversaciones();
                      }}
                    >
                      Actualizar conversaciones
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChatMenuOpen(false);
                        setMobileView("list");
                      }}
                    >
                      Volver a la lista
                    </button>
                  </div>
                )}
              </div>
            </div>

            {messageSearchOpen && (
              <section className="message-history-search" aria-label="Buscar mensajes">
                <div className="message-history-search-field">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    autoFocus
                    placeholder="Buscar una palabra o frase..."
                    value={messageSearchQuery}
                    onChange={(event) => setMessageSearchQuery(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMessageSearchOpen(false);
                      setMessageSearchQuery("");
                    }}
                    aria-label="Cerrar búsqueda"
                  >
                    ×
                  </button>
                </div>

                {messageSearchQuery.trim() && (
                  <div className="message-history-search-results">
                    {matchingMessages.length > 0 ? (
                      matchingMessages.map((message) => {
                        const remitenteId = message.remitente?._id || message.remitente;
                        const esMio = String(remitenteId) === String(user?._id || user?.id);
                        return (
                          <button
                            type="button"
                            className="message-history-result"
                            key={message._id}
                            onClick={() => irAlMensaje(message._id)}
                          >
                            <span className="message-history-result-meta">
                              {esMio ? "Tú" : obtenerNombre(message.remitente)}
                              <span>{formatearHora(message.createdAt)}</span>
                            </span>
                            <span>{message.texto}</span>
                          </button>
                        );
                      })
                    ) : (
                      <p className="messages-search-status">No se encontraron mensajes.</p>
                    )}
                  </div>
                )}
              </section>
            )}

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
                      id={`message-${message._id}`}
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

                      <div className="bubble">
                        {message.texto}

                        {esMio && (
                            <span
                                title={
                                    message.leido
                                        ? "Leído"
                                        : message.entregado
                                        ? "Entregado"
                                        : "Enviado"
                                }
                                style={{
                                    display: "inline-block",
                                    marginLeft: "8px",
                                    fontSize: "12px",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                {message.leido
                                    ? "✓✓"
                                    : message.entregado
                                    ? "✓✓"
                                    : "✓"}
                            </span>
                        )}
                    </div>  
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