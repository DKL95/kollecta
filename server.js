require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");

const conectarDB = require("./config/db");
const { CARPETA_UPLOADS } = require("./middleware/upload");
const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const publicacionRoutes = require("./routes/publicacionRoutes");
const imagenRoutes = require("./routes/imagenRoutes");

const app = express();
const PORT = process.env.PORT || 3000;
const CARPETA_FRONTEND = path.join(__dirname, "frontend", "dist");

// Conectar MongoDB
conectarDB();

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

app.use("/api", (req, res) => {
    res.status(404).json({ mensaje: "Ruta no encontrada" });
});

// Errores de subida de archivos (tamaño, tipo) y otros no controlados
app.use((error, req, res, next) => {
    console.error(error.message);
    res.status(400).json({ mensaje: error.message || "Error en la petición" });
});

// Frontend en React (ya compilado con `npm run build`).
// Cualquier ruta que no sea de la API regresa index.html y React Router decide qué pantalla mostrar.
if (fs.existsSync(CARPETA_FRONTEND)) {
    app.use(express.static(CARPETA_FRONTEND));
    app.use((req, res) => {
        res.sendFile(path.join(CARPETA_FRONTEND, "index.html"));
    });
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
