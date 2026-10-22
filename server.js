require("dotenv").config();

const app = require("./app");
const conectarDB = require("./config/db");

const PORT = process.env.PORT || 3000;

// Conectar MongoDB
conectarDB();

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
