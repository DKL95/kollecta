require("dotenv").config();

const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = require("./app");
const conectarDB = require("./config/db");
const Conversacion = require("./models/Conversacion");

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