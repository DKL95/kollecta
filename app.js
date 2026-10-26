const express = require("express");
const path = require("path");
const fs = require("fs");

const notificacionRoutes = require("./routes/notificacionRoutes");
const { CARPETA_UPLOADS } = require("./middleware/upload");
const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const publicacionRoutes = require("./routes/publicacionRoutes");
const imagenRoutes = require("./routes/imagenRoutes");
const videoRoutes = require("./routes/videoRoutes");
const mensajeRoutes = require("./routes/mensajeRoutes");

// Configuración de Express. Se separa de server.js para poder usarla en las pruebas
// sin abrir el puerto real ni conectarse a la base de datos de Atlas.
const app = express();
const CARPETA_FRONTEND = path.join(__dirname, "frontend", "dist");

// Permitir recibir JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fotos subidas antes de guardarlas en MongoDB (rutas antiguas /uploads/...)
app.use("/uploads", express.static(CARPETA_UPLOADS));

// API
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/publicaciones", publicacionRoutes);
app.use("/api/imagenes", imagenRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/mensajes", mensajeRoutes);
app.use("/api/notificaciones", notificacionRoutes);


app.use("/api", (req, res) => {
    res.status(404).json({ mensaje: "Ruta no encontrada" });
});

// Errores de subida de archivos (tamaño, tipo) y otros no controlados
app.use((error, req, res, next) => {
    const esErrorDeSubida =
        error.name === "MulterError" ||
        error.message === "Solo se permiten imágenes" ||
        error.message === "Solo se permiten videos";

    if (!esErrorDeSubida) console.error(error);

    let mensaje = error.message || "Error en la petición";

    if (error.code === "LIMIT_FILE_SIZE") {
        const campo = error.field;

        if (campo === "videos") {
            mensaje = "Cada video puede pesar como máximo 100 MB";
        } else if (campo === "imagenes" || campo === "fotoPerfil") {
            mensaje = campo === "fotoPerfil"
                ? "La foto de perfil no puede pesar más de 5 MB"
                : "Cada imagen puede pesar como máximo 5 MB";
        } else {
            mensaje = "El archivo supera el tamaño máximo permitido";
        }
    }

    res.status(400).json({ mensaje });
});


// Frontend en React (ya compilado con `npm run build`).
// Cualquier ruta que no sea de la API regresa index.html y React Router decide qué pantalla mostrar.
if (fs.existsSync(CARPETA_FRONTEND)) {
    app.use(express.static(CARPETA_FRONTEND));
    app.use((req, res) => {
        res.sendFile(path.join(CARPETA_FRONTEND, "index.html"));
    });
} else {
    app.use((req, res) => {
        res.status(503).type("html").send(
            "<h2>El frontend no está compilado</h2>" +
                "<p>Para desarrollar corre <code>npm run dev</code> y abre <a href='http://localhost:5173'>http://localhost:5173</a>.</p>" +
                "<p>Para la demo corre <code>npm run build</code> y luego <code>npm start</code>.</p>"
        );
    });
}

module.exports = app;