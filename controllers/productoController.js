/* ==========================================================================
   Productos del marketplace (anuncios de venta / intercambio).
   Son independientes de la colección: "copiar desde la colección" solo pasa
   los datos y las fotos; la pieza de la colección no cambia.
   ========================================================================== */

const fs = require("fs");
const mongoose = require("mongoose");

const Producto = require("../models/Producto");
const { CATEGORIAS, CONDICIONES } = require("../models/Producto");
const Coleccion = require("../models/Coleccion");
const { guardarImagen } = require("../middleware/upload");
const { rechazarPendientesDe } = require("./ordenController");

const MAX_FOTOS = 10;
const CAMPOS_VENDEDOR = "nombre username fotoPerfil activo";

async function limpiarTemporales(req) {
    const archivos = req.files?.imagenes || [];
    await Promise.all(
        archivos.map((a) => (a.path ? fs.promises.unlink(a.path).catch(() => {}) : null))
    );
}

function aBooleano(valor) {
    return valor === true || valor === "true";
}

function vendedorPublico(usuario) {
    if (!usuario) return null;
    return {
        id: usuario._id,
        nombre: usuario.nombre,
        username: usuario.username,
        fotoPerfil: usuario.fotoPerfil
    };
}

function respuestaProducto(producto, usuarioId) {
    const datos = producto.toObject();
    return {
        ...datos,
        vendedor: vendedorPublico(producto.vendedor),
        esMio: String(producto.vendedor?._id || producto.vendedor) === String(usuarioId)
    };
}

// Valida los campos de venta. Regresa un mensaje de error o null.
function validarVenta({ disponibleCompra, disponibleIntercambio, precio }) {
    if (!disponibleCompra && !disponibleIntercambio) {
        return "Elige si es para venta, para intercambio o ambos";
    }
    if (precio !== null && (!Number.isFinite(precio) || precio < 0)) {
        return "El precio debe ser un número mayor o igual a 0";
    }
    if (disponibleCompra && !(precio > 0)) {
        return "Para vender el producto ponle un precio mayor a $0";
    }
    return null;
}

/* --------------------------------------------------------------------------
   GET /api/productos?tipo=venta|intercambio|todos&grupo=&categoria=&q=&vendedor=yo|<id>
   -------------------------------------------------------------------------- */
async function listarProductos(req, res) {
    try {
        const { tipo, grupo, categoria, q, vendedor } = req.query;
        const filtro = { estado: "activo" };

        if (tipo === "venta") filtro.disponibleCompra = true;
        else if (tipo === "intercambio") filtro.disponibleIntercambio = true;
        else if (tipo && tipo !== "todos") {
            return res.status(400).json({ mensaje: "El tipo debe ser venta, intercambio o todos" });
        }

        if (grupo) filtro.grupo = String(grupo);

        if (categoria) {
            if (!CATEGORIAS.includes(categoria)) {
                return res.status(400).json({ mensaje: "Categoría no válida" });
            }
            filtro.categoria = categoria;
        }

        if (vendedor) {
            const id = vendedor === "yo" ? req.usuario.id : vendedor;
            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({ mensaje: "El vendedor no es válido" });
            }
            filtro.vendedor = id;
            // En "mis anuncios" también se ven los apartados.
            if (vendedor === "yo") filtro.estado = { $in: ["activo", "reservado"] };
        }

        const texto = String(q || "").trim();
        if (texto) {
            const regex = new RegExp(texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filtro.$or = [{ titulo: regex }, { grupo: regex }, { categoria: regex }];
        }

        const productos = await Producto.find(filtro)
            .sort({ createdAt: -1 })
            .limit(120)
            .populate("vendedor", CAMPOS_VENDEDOR);

        res.json({
            productos: productos
                .filter((p) => p.vendedor?.activo)
                .map((p) => respuestaProducto(p, req.usuario.id))
        });
    } catch (error) {
        console.error("Error al listar productos:", error);
        res.status(500).json({ mensaje: "No se pudo cargar el marketplace" });
    }
}

/* --------------------------------------------------------------------------
   GET /api/productos/:id
   -------------------------------------------------------------------------- */
async function obtenerProducto(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ mensaje: "El producto no es válido" });
        }

        const producto = await Producto.findById(id).populate("vendedor", CAMPOS_VENDEDOR);
        const esMio = producto && String(producto.vendedor?._id) === String(req.usuario.id);

        // Los retirados solo los ve su dueño; los vendidos se siguen viendo (historial de órdenes).
        if (!producto || !producto.vendedor?.activo || (producto.estado === "retirado" && !esMio)) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        res.json({ producto: respuestaProducto(producto, req.usuario.id) });
    } catch (error) {
        console.error("Error al obtener el producto:", error);
        res.status(500).json({ mensaje: "No se pudo cargar el producto" });
    }
}

/* --------------------------------------------------------------------------
   POST /api/productos   (multipart)
   Campos: titulo, grupo, categoria, condicion, descripcion, precio,
   disponibleCompra, disponibleIntercambio, busca, desdeColeccion (id), imagenes[]
   -------------------------------------------------------------------------- */
async function crearProducto(req, res) {
    const imagenesNuevas = [];

    try {
        const cuerpo = req.body || {};
        const archivos = req.files?.imagenes || [];

        // Si viene de la colección, se copian sus fotos (las mismas direcciones).
        let fotosOrigen = [];
        let articuloOrigen = null;

        if (cuerpo.desdeColeccion) {
            if (!mongoose.isValidObjectId(cuerpo.desdeColeccion)) {
                await limpiarTemporales(req);
                return res.status(400).json({ mensaje: "La pieza de la colección no es válida" });
            }
            const coleccion = await Coleccion.findOne({ usuario: req.usuario.id });
            const pieza = coleccion?.articulos.id(cuerpo.desdeColeccion);
            if (!pieza) {
                await limpiarTemporales(req);
                return res.status(404).json({ mensaje: "Esa pieza no está en tu colección" });
            }
            articuloOrigen = pieza._id;
            fotosOrigen = [...pieza.imagenes];

            // El formulario puede mandar cuáles fotos de la pieza conservar (las demás se omiten).
            if (cuerpo.fotosCopiadas !== undefined) {
                let elegidas;
                try {
                    elegidas = JSON.parse(cuerpo.fotosCopiadas);
                } catch {
                    elegidas = null;
                }
                if (!Array.isArray(elegidas)) {
                    await limpiarTemporales(req);
                    return res.status(400).json({ mensaje: "La lista de fotos copiadas no es válida" });
                }
                fotosOrigen = fotosOrigen.filter((url) => elegidas.includes(url));
            }
        }

        const titulo = String(cuerpo.titulo || "").trim();
        const grupo = String(cuerpo.grupo || "").trim();
        const categoria = String(cuerpo.categoria || "").trim();

        if (!titulo || !grupo || !categoria) {
            await limpiarTemporales(req);
            return res.status(400).json({ mensaje: "El título, grupo y categoría son obligatorios" });
        }

        if (!CATEGORIAS.includes(categoria)) {
            await limpiarTemporales(req);
            return res.status(400).json({ mensaje: "Categoría no válida" });
        }

        const condicion = cuerpo.condicion || "Buen estado";
        if (!CONDICIONES.includes(condicion)) {
            await limpiarTemporales(req);
            return res.status(400).json({ mensaje: "Condición no válida" });
        }

        const disponibleCompra = aBooleano(cuerpo.disponibleCompra);
        const disponibleIntercambio = aBooleano(cuerpo.disponibleIntercambio);
        const precio = cuerpo.precio !== undefined && cuerpo.precio !== "" ? Number(cuerpo.precio) : null;

        const errorVenta = validarVenta({ disponibleCompra, disponibleIntercambio, precio });
        if (errorVenta) {
            await limpiarTemporales(req);
            return res.status(400).json({ mensaje: errorVenta });
        }

        if (fotosOrigen.length + archivos.length > MAX_FOTOS) {
            await limpiarTemporales(req);
            return res.status(400).json({ mensaje: `Un producto puede tener como máximo ${MAX_FOTOS} fotos` });
        }

        for (const archivo of archivos) {
            imagenesNuevas.push(await guardarImagen(archivo, req.usuario.id));
        }

        const producto = await Producto.create({
            vendedor: req.usuario.id,
            titulo,
            grupo,
            categoria,
            condicion,
            descripcion: String(cuerpo.descripcion || ""),
            imagenes: [...fotosOrigen, ...imagenesNuevas],
            disponibleCompra,
            disponibleIntercambio,
            precio: disponibleCompra ? precio : 0,
            busca: disponibleIntercambio ? String(cuerpo.busca || "").slice(0, 200) : "",
            articuloOrigen
        });

        await producto.populate("vendedor", CAMPOS_VENDEDOR);

        res.status(201).json({
            mensaje: "Producto publicado en el marketplace",
            producto: respuestaProducto(producto, req.usuario.id)
        });
    } catch (error) {
        console.error("Error al publicar el producto:", error);

        if (imagenesNuevas.length) {
            const Imagen = require("../models/Imagen");
            await Imagen.deleteMany({ _id: { $in: imagenesNuevas.map((u) => u.split("/").pop()) } }).catch(() => {});
        }
        await limpiarTemporales(req);

        if (!res.headersSent) {
            res.status(400).json({ mensaje: error.message || "No se pudo publicar el producto" });
        }
    }
}

/* --------------------------------------------------------------------------
   PUT /api/productos/:id   (JSON, solo el vendedor)
   -------------------------------------------------------------------------- */
async function editarProducto(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ mensaje: "El producto no es válido" });
        }

        const producto = await Producto.findOne({ _id: id, vendedor: req.usuario.id });
        if (!producto || producto.estado === "vendido") {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        const cambios = req.body || {};
        const tocaVenta = ["disponibleCompra", "disponibleIntercambio", "precio"].some((c) => cambios[c] !== undefined);

        if (producto.estado === "reservado" && tocaVenta) {
            return res.status(409).json({ mensaje: "Está apartado en una operación; termínala o cancélala antes de cambiar el precio o la modalidad" });
        }

        if (cambios.titulo !== undefined && !String(cambios.titulo).trim()) {
            return res.status(400).json({ mensaje: "El título no puede quedar vacío" });
        }

        for (const campo of ["titulo", "grupo", "categoria", "condicion", "descripcion", "busca", "disponibleCompra", "disponibleIntercambio"]) {
            if (cambios[campo] !== undefined) producto.set(campo, cambios[campo]);
        }
        if (cambios.precio !== undefined) producto.precio = Number(cambios.precio);

        const errorVenta = validarVenta({
            disponibleCompra: producto.disponibleCompra,
            disponibleIntercambio: producto.disponibleIntercambio,
            precio: producto.precio
        });
        if (errorVenta) return res.status(400).json({ mensaje: errorVenta });

        // Volver a publicar un producto retirado.
        if (cambios.reactivar === true && producto.estado === "retirado") producto.estado = "activo";

        await producto.save();
        await producto.populate("vendedor", CAMPOS_VENDEDOR);

        res.json({ mensaje: "Producto actualizado", producto: respuestaProducto(producto, req.usuario.id) });
    } catch (error) {
        console.error("Error al editar el producto:", error);
        res.status(400).json({ mensaje: error.message || "No se pudo editar el producto" });
    }
}

/* --------------------------------------------------------------------------
   DELETE /api/productos/:id   (retirar del marketplace; solo el vendedor)
   Las solicitudes pendientes se cierran y se avisa a los compradores.
   -------------------------------------------------------------------------- */
async function retirarProducto(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ mensaje: "El producto no es válido" });
        }

        const producto = await Producto.findOne({ _id: id, vendedor: req.usuario.id });
        if (!producto || producto.estado === "vendido") {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        if (producto.estado === "reservado") {
            return res.status(409).json({ mensaje: "Está apartado en una operación; cancélala antes de retirarlo" });
        }

        producto.estado = "retirado";
        await producto.save();

        await rechazarPendientesDe(req, producto._id, req.usuario.id, "Se retiró del marketplace");

        res.json({ mensaje: "Producto retirado del marketplace" });
    } catch (error) {
        console.error("Error al retirar el producto:", error);
        res.status(500).json({ mensaje: "No se pudo retirar el producto" });
    }
}

module.exports = {
    listarProductos,
    obtenerProducto,
    crearProducto,
    editarProducto,
    retirarProducto
};
