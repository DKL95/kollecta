require("dotenv").config();

const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = require("./app");
const conectarDB = require("./config/db");
const Conversacion = require("./models/Conversacion");
const Mensaje = require("./models/Mensaje");

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "kollecta-dev-secret";

const servidor = http.createServer(app);

const io = new Server(servidor, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

app.set("io", io);

// Autenticar las conexiones de Socket.IO.
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Debes iniciar sesión"));
        }

        const usuario = jwt.verify(token, JWT_SECRET);

        socket.data.usuarioId = usuario.id;

        next();
    } catch (error) {
        next(new Error("Sesión inválida o expirada"));
    }
});

io.on("connection", (socket) => {
    const usuarioId = socket.data.usuarioId;

    // Sala individual del usuario.
    socket.join(`usuario:${usuarioId}`);

    console.log("Usuario conectado a Socket.IO:", usuarioId);

    // Entrar a una conversación después de verificar los permisos.
    socket.on("conversacion:unirse", async (conversacionId, callback) => {
        const responder =
            typeof callback === "function" ? callback : () => {};

        try {
            if (!mongoose.isValidObjectId(conversacionId)) {
                return responder({
                    ok: false,
                    mensaje: "Identificador de conversación no válido",
                });
            }

            const conversacion = await Conversacion.exists({
                _id: conversacionId,
                participantes: usuarioId,
            });

            if (!conversacion) {
                return responder({
                    ok: false,
                    mensaje: "No tienes acceso a esta conversación",
                });
            }

            await socket.join(`conversacion:${conversacionId}`);

            responder({ ok: true });
        } catch (error) {
            console.error("Error al entrar a la conversación:", error);

            responder({
                ok: false,
                mensaje: "No se pudo abrir la conversación en tiempo real",
            });
        }
    });

    // Confirmar la entrega de un mensaje al destinatario.
    socket.on("mensaje:confirmar-entrega", async (mensajeId, callback) => {
        const responder =
            typeof callback === "function" ? callback : () => {};

        try {
            // Validar el identificador del mensaje.
            if (!mongoose.isValidObjectId(mensajeId)) {
                return responder({
                    ok: false,
                    mensaje: "El identificador del mensaje no es válido",
                });
            }

            // Buscar el mensaje.
            const mensaje = await Mensaje.findById(mensajeId);

            if (!mensaje) {
                return responder({
                    ok: false,
                    mensaje: "Mensaje no encontrado",
                });
            }

            // El remitente no puede confirmar la entrega de su propio mensaje.
            if (String(mensaje.remitente) === String(usuarioId)) {
                return responder({
                    ok: false,
                    mensaje: "No puedes confirmar la entrega de tu propio mensaje",
                });
            }

            // Comprobar que el usuario pertenezca a la conversación.
            const conversacion = await Conversacion.exists({
                _id: mensaje.conversacion,
                participantes: usuarioId,
            });

            if (!conversacion) {
                return responder({
                    ok: false,
                    mensaje: "No tienes acceso a este mensaje",
                });
            }

            // Si ya está entregado, no modificar su fecha.
            if (!mensaje.entregado) {
                mensaje.entregado = true;
                mensaje.entregadoEn = new Date();

                await mensaje.save();

                // Notificar al remitente del cambio de estado.
                io.to(`usuario:${mensaje.remitente}`).emit(
                    "mensaje:estado",
                    {
                        _id: mensaje._id,
                        conversacion: mensaje.conversacion,
                        entregado: mensaje.entregado,
                        entregadoEn: mensaje.entregadoEn,
                        leido: mensaje.leido,
                        leidoEn: mensaje.leidoEn,
                    }
                );
            }

            responder({
                ok: true,
                mensaje: "Entrega confirmada",
            });
        } catch (error) {
            console.error("Error al confirmar la entrega:", error);

            responder({
                ok: false,
                mensaje: "No se pudo confirmar la entrega del mensaje",
            });
        }
    });

    // Salir de una conversación cuando el usuario cambia de chat.
    socket.on("conversacion:salir", (conversacionId) => {
        if (!mongoose.isValidObjectId(conversacionId)) {
            return;
        }

        socket.leave(`conversacion:${conversacionId}`);
    });

    socket.on("disconnect", () => {
        console.log("Usuario desconectado de Socket.IO:", usuarioId);
    });
});

// Conectar primero la base de datos y después iniciar el servidor.
async function iniciarServidor() {
    try {
        await conectarDB();

        servidor.listen(PORT, () => {
            console.log(
                `Servidor ejecutándose en http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error("No se pudo iniciar el servidor:", error);
        process.exit(1);
    }
}

iniciarServidor();