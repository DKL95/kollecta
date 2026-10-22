const mongoose = require("mongoose");

const conectarDB = async () => {
    if (!process.env.MONGODB_URI) {
        console.error(
            "\nFalta MONGODB_URI.\n" +
                "Crea un archivo .env en la raíz del proyecto (copia .env.example) y pon la cadena de conexión de Atlas:\n" +
                "    MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>/\n" +
                "El .env no se sube a git: cada integrante debe tener el suyo.\n"
        );
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.MONGODB_DB || "kpop",
            serverSelectionTimeoutMS: 10000
        });

        console.log("MongoDB conectado correctamente");
    } catch (error) {
        console.error("\nError al conectar MongoDB:", error.message);
        console.error(
            "Revisa:\n" +
                "  1. Que MONGODB_URI en tu .env esté bien copiada (usuario y contraseña de Atlas).\n" +
                "  2. En Atlas > Network Access, que tu IP actual esté permitida (o 0.0.0.0/0 para el equipo).\n" +
                "  3. Que tengas internet y que la red no bloquee el puerto 27017 (algunas redes escolares lo hacen).\n"
        );
        process.exit(1);
    }
};

module.exports = conectarDB;
