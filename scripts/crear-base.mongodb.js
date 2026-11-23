/* ==========================================================================
   KollectA — creación de la base de datos (equivalente al script SQL de tablas).

   Crea las 15 colecciones con su validador $jsonSchema (tipos, campos
   obligatorios, enums y límites) y sus índices, incluidos los únicos.

   Uso:   mongosh "<MONGODB_URI>" scripts/crear-base.mongodb.js
          (opcional) BASE=otra_base mongosh ... para usar otra base

   Es seguro correrlo varias veces: si la colección ya existe, solo actualiza
   su validador (collMod) y vuelve a crear los índices que falten.

   ARCHIVO GENERADO por scripts/generarCrearBase.js a partir de models/.
   No lo edites a mano: cambia el modelo y vuelve a generarlo.
   ========================================================================== */

const nombreBase = (typeof process !== "undefined" && process.env && process.env.BASE) || "kpop";
db = db.getSiblingDB(nombreBase);

function crear(nombre, esquema) {
    const validador = { $jsonSchema: esquema };
    const existe = db.getCollectionNames().includes(nombre);
    if (existe) {
        db.runCommand({ collMod: nombre, validator: validador, validationLevel: "moderate", validationAction: "error" });
    } else {
        db.createCollection(nombre, { validator: validador, validationLevel: "moderate", validationAction: "error" });
    }
    print((existe ? "Actualizada: " : "Creada:     ") + nombre);
}

// ---------------------------------------------------------------------------
// usuarios: Cuentas de la red social. Rol: usuario < moderador < administrador.
// ---------------------------------------------------------------------------
crear("usuarios", {
  "bsonType": "object",
  "properties": {
    "nombre": {"bsonType":["string","null"]},
    "username": {"bsonType":"string"},
    "email": {"bsonType":"string"},
    "password": {"bsonType":"string"},
    "rol": {"bsonType":["string","null"],"enum":["usuario","moderador","administrador",null]},
    "fotoPerfil": {"bsonType":["string","null"]},
    "descripcion": {"bsonType":["string","null"]},
    "gruposFavoritos": {"bsonType":"array"},
    "banner": {
      "bsonType": ["object","null"],
      "properties": {
        "color": {
          "bsonType": ["string","null"],
          "enum": ["kollecta","atardecer","oceano","menta","noche","dorado","cereza",null]
        },
        "textura": {
          "bsonType": ["string","null"],
          "enum": ["ninguna","puntos","rayas","cuadricula","corazones","estrellas","ondas",null]
        },
        "logo": {"bsonType":["string","null"],"maxLength":40},
        "imagen": {"bsonType":["string","null"]}
      }
    },
    "fechaRegistro": {"bsonType":["string","null"]},
    "activo": {"bsonType":["bool","null"]},
    "motivoBaneo": {"bsonType":["string","null"]},
    "suspendidoHasta": {"bsonType":["date","null"]},
    "motivoSuspension": {"bsonType":["string","null"]},
    "amigos": {"bsonType":"array"},
    "_id": {"bsonType":["objectId","null"]}
  },
  "required": ["username","email","password"]
});
db.usuarios.createIndex({"username":1}, {"unique":true});
db.usuarios.createIndex({"email":1}, {"unique":true});

// ---------------------------------------------------------------------------
// publicaciones: Publicaciones del feed (texto, imágenes, videos, likes). autor → usuarios.
// ---------------------------------------------------------------------------
crear("publicaciones", {
  "bsonType": "object",
  "properties": {
    "autor": {"bsonType":"objectId","description":"→ Usuario"},
    "texto": {"bsonType":["string","null"],"maxLength":1000},
    "grupo": {"bsonType":["string","null"]},
    "imagenes": {"bsonType":"array"},
    "videos": {"bsonType":"array"},
    "likes": {"bsonType":"array"},
    "gif": {
      "bsonType": ["object","null"],
      "properties": {
        "url": {"bsonType":"string","maxLength":500},
        "ancho": {"bsonType":["int","long","double","decimal","null"],"minimum":0},
        "alto": {"bsonType":["int","long","double","decimal","null"],"minimum":0},
        "titulo": {"bsonType":["string","null"],"maxLength":200}
      },
      "required": ["url"]
    },
    "oculto": {
      "bsonType": ["object","null"],
      "properties": {
        "por": {"bsonType":"objectId","description":"→ Usuario"},
        "motivo": {"bsonType":["string","null"],"maxLength":300},
        "fecha": {"bsonType":["date","null"]}
      },
      "required": ["por"]
    },
    "_id": {"bsonType":["objectId","null"]},
    "fechaCreacion": {"bsonType":["date","null"]},
    "fechaActualizacion": {"bsonType":["date","null"]}
  },
  "required": ["autor"]
});

// ---------------------------------------------------------------------------
// comentarios: Comentarios de una publicación. publicacion → publicaciones, autor → usuarios.
// ---------------------------------------------------------------------------
crear("comentarios", {
  "bsonType": "object",
  "properties": {
    "publicacion": {"bsonType":"objectId","description":"→ Publicacion"},
    "autor": {"bsonType":"objectId","description":"→ Usuario"},
    "texto": {"bsonType":["string","null"],"maxLength":500},
    "likes": {"bsonType":"array"},
    "gif": {
      "bsonType": ["object","null"],
      "properties": {
        "url": {"bsonType":"string","maxLength":500},
        "ancho": {"bsonType":["int","long","double","decimal","null"],"minimum":0},
        "alto": {"bsonType":["int","long","double","decimal","null"],"minimum":0},
        "titulo": {"bsonType":["string","null"],"maxLength":200}
      },
      "required": ["url"]
    },
    "oculto": {
      "bsonType": ["object","null"],
      "properties": {
        "por": {"bsonType":"objectId","description":"→ Usuario"},
        "motivo": {"bsonType":["string","null"],"maxLength":300},
        "fecha": {"bsonType":["date","null"]}
      },
      "required": ["por"]
    },
    "_id": {"bsonType":["objectId","null"]},
    "fecha": {"bsonType":["date","null"]}
  },
  "required": ["publicacion","autor"]
});
db.comentarios.createIndex({"publicacion":1});

// ---------------------------------------------------------------------------
// respuestas: Respuestas a un comentario. comentario → comentarios, publicacion → publicaciones.
// ---------------------------------------------------------------------------
crear("respuestas", {
  "bsonType": "object",
  "properties": {
    "comentario": {"bsonType":"objectId","description":"→ Comentario"},
    "publicacion": {"bsonType":"objectId","description":"→ Publicacion"},
    "autor": {"bsonType":"objectId","description":"→ Usuario"},
    "texto": {"bsonType":["string","null"],"maxLength":500},
    "responderA": {"bsonType":["objectId","null"],"description":"→ Respuesta"},
    "gif": {
      "bsonType": ["object","null"],
      "properties": {
        "url": {"bsonType":"string","maxLength":500},
        "ancho": {"bsonType":["int","long","double","decimal","null"],"minimum":0},
        "alto": {"bsonType":["int","long","double","decimal","null"],"minimum":0},
        "titulo": {"bsonType":["string","null"],"maxLength":200}
      },
      "required": ["url"]
    },
    "mencionado": {"bsonType":["objectId","null"],"description":"→ Usuario"},
    "likes": {"bsonType":"array"},
    "_id": {"bsonType":["objectId","null"]},
    "fecha": {"bsonType":["date","null"]}
  },
  "required": ["comentario","publicacion","autor"]
});
db.respuestas.createIndex({"comentario":1});
db.respuestas.createIndex({"publicacion":1});

// ---------------------------------------------------------------------------
// solicitudes_amistad: Solicitudes de amistad entre dos usuarios (solicitante → destinatario).
// ---------------------------------------------------------------------------
crear("solicitudes_amistad", {
  "bsonType": "object",
  "properties": {
    "solicitante": {"bsonType":"objectId","description":"→ Usuario"},
    "destinatario": {"bsonType":"objectId","description":"→ Usuario"},
    "estado": {"bsonType":"string","enum":["pendiente","aceptada","rechazada","finalizada"]},
    "_id": {"bsonType":["objectId","null"]},
    "createdAt": {"bsonType":["date","null"]},
    "updatedAt": {"bsonType":["date","null"]}
  },
  "required": ["solicitante","destinatario","estado"]
});
db.solicitudes_amistad.createIndex({"solicitante":1,"destinatario":1}, {"unique":true});

// ---------------------------------------------------------------------------
// conversaciones: Chats directos y grupales. participantes → usuarios, ultimoMensaje → mensajes.
// ---------------------------------------------------------------------------
crear("conversaciones", {
  "bsonType": "object",
  "properties": {
    "tipo": {"bsonType":["string","null"],"enum":["directa","grupo",null]},
    "participantes": {"bsonType":"array"},
    "nombre": {"bsonType":["string","null"],"maxLength":60},
    "creador": {"bsonType":["objectId","null"],"description":"→ Usuario"},
    "administradores": {"bsonType":"array"},
    "ultimoMensaje": {"bsonType":["objectId","null"],"description":"→ Mensaje"},
    "fechaActividad": {"bsonType":["date","null"]},
    "ocultasPor": {"bsonType":"array"},
    "silenciadosPor": {"bsonType":"array"},
    "_id": {"bsonType":["objectId","null"]},
    "createdAt": {"bsonType":["date","null"]},
    "updatedAt": {"bsonType":["date","null"]}
  }
});
db.conversaciones.createIndex({"participantes":1});

// ---------------------------------------------------------------------------
// mensajes: Mensajes de un chat. conversacion → conversaciones, remitente → usuarios.
// ---------------------------------------------------------------------------
crear("mensajes", {
  "bsonType": "object",
  "properties": {
    "conversacion": {"bsonType":"objectId","description":"→ Conversacion"},
    "remitente": {"bsonType":"objectId","description":"→ Usuario"},
    "texto": {"bsonType":["string","null"],"maxLength":5000},
    "gif": {
      "bsonType": ["object","null"],
      "properties": {
        "url": {"bsonType":"string","maxLength":500},
        "ancho": {"bsonType":["int","long","double","decimal","null"],"minimum":0},
        "alto": {"bsonType":["int","long","double","decimal","null"],"minimum":0},
        "titulo": {"bsonType":["string","null"],"maxLength":200}
      },
      "required": ["url"]
    },
    "respondeA": {"bsonType":["objectId","null"],"description":"→ Mensaje"},
    "editadoEn": {"bsonType":["date","null"]},
    "imagenes": {"bsonType":"array"},
    "entregado": {"bsonType":["bool","null"]},
    "entregadoEn": {"bsonType":["date","null"]},
    "leido": {"bsonType":["bool","null"]},
    "leidoEn": {"bsonType":["date","null"]},
    "leidoPor": {"bsonType":"array"},
    "_id": {"bsonType":["objectId","null"]},
    "createdAt": {"bsonType":["date","null"]},
    "updatedAt": {"bsonType":["date","null"]}
  },
  "required": ["conversacion","remitente"]
});
db.mensajes.createIndex({"conversacion":1,"createdAt":1});

// ---------------------------------------------------------------------------
// notificaciones: Avisos para un usuario (likes, comentarios, órdenes, moderación). destinatario/emisor → usuarios.
// ---------------------------------------------------------------------------
crear("notificaciones", {
  "bsonType": "object",
  "properties": {
    "destinatario": {"bsonType":"objectId","description":"→ Usuario"},
    "emisor": {"bsonType":["objectId","null"],"description":"→ Usuario"},
    "tipo": {
      "bsonType": "string",
      "enum": ["like","comentario","seguidor","sistema","solicitud_amistad","mencion","orden","moderacion"]
    },
    "mensaje": {"bsonType":"string"},
    "enlace": {"bsonType":["string","null"]},
    "leida": {"bsonType":["bool","null"]},
    "_id": {"bsonType":["objectId","null"]},
    "createdAt": {"bsonType":["date","null"]},
    "updatedAt": {"bsonType":["date","null"]}
  },
  "required": ["destinatario","tipo","mensaje"]
});
db.notificaciones.createIndex({"destinatario":1});
db.notificaciones.createIndex({"destinatario":1,"createdAt":-1});

// ---------------------------------------------------------------------------
// imagenes: Archivos de imagen guardados en la base (fotos de perfil, publicaciones, productos).
// ---------------------------------------------------------------------------
crear("imagenes", {
  "bsonType": "object",
  "properties": {
    "datos": {"bsonType":"binData"},
    "tipo": {"bsonType":"string"},
    "tamano": {"bsonType":["int","long","double","decimal"]},
    "subidaPor": {"bsonType":["objectId","null"],"description":"→ Usuario"},
    "_id": {"bsonType":["objectId","null"]},
    "fechaSubida": {"bsonType":["date","null"]}
  },
  "required": ["datos","tipo","tamano"]
});

// ---------------------------------------------------------------------------
// colecciones: Colección personal de merch de cada usuario (un documento por usuario, artículos embebidos).
// ---------------------------------------------------------------------------
crear("colecciones", {
  "bsonType": "object",
  "properties": {
    "usuario": {"bsonType":"objectId","description":"→ Usuario"},
    "articulos": {
      "bsonType": "array",
      "items": {
        "bsonType": ["object","null"],
        "properties": {
          "titulo": {"bsonType":"string","maxLength":150},
          "grupo": {"bsonType":"string"},
          "categoria": {"bsonType":"string","enum":["Photocard","Álbum","Lightstick","Merch","Poster","Otro"]},
          "imagenes": {"bsonType":"array"},
          "descripcion": {"bsonType":["string","null"],"maxLength":2000},
          "valorEstimado": {"bsonType":["int","long","double","decimal","null"],"minimum":0},
          "estado": {
            "bsonType": ["string","null"],
            "enum": ["Nuevo / sellado","Como nuevo","Buen estado","Con detalles",null]
          },
          "disponibleIntercambio": {"bsonType":["bool","null"]},
          "disponibleCompra": {"bsonType":["bool","null"]},
          "precio": {"bsonType":["int","long","double","decimal","null"],"minimum":0},
          "reservadoPor": {"bsonType":["objectId","null"],"description":"→ Orden"},
          "_id": {"bsonType":["objectId","null"]}
        },
        "required": ["titulo","grupo","categoria"]
      }
    },
    "_id": {"bsonType":["objectId","null"]},
    "createdAt": {"bsonType":["date","null"]},
    "updatedAt": {"bsonType":["date","null"]}
  },
  "required": ["usuario"]
});
db.colecciones.createIndex({"usuario":1}, {"unique":true});
db.colecciones.createIndex({"articulos._id":1});

// ---------------------------------------------------------------------------
// productos: Anuncios del marketplace. vendedor → usuarios; articuloOrigen → colecciones.articulos.
// ---------------------------------------------------------------------------
crear("productos", {
  "bsonType": "object",
  "properties": {
    "vendedor": {"bsonType":"objectId","description":"→ Usuario"},
    "titulo": {"bsonType":"string","maxLength":150},
    "grupo": {"bsonType":"string"},
    "categoria": {"bsonType":"string","enum":["Photocard","Álbum","Lightstick","Merch","Poster","Otro"]},
    "imagenes": {"bsonType":"array"},
    "descripcion": {"bsonType":["string","null"],"maxLength":2000},
    "condicion": {
      "bsonType": ["string","null"],
      "enum": ["Nuevo / sellado","Como nuevo","Buen estado","Con detalles",null]
    },
    "disponibleCompra": {"bsonType":["bool","null"]},
    "disponibleIntercambio": {"bsonType":["bool","null"]},
    "precio": {"bsonType":["int","long","double","decimal","null"],"minimum":0},
    "busca": {"bsonType":["string","null"],"maxLength":200},
    "articuloOrigen": {"bsonType":["objectId","null"]},
    "estado": {"bsonType":["string","null"],"enum":["activo","reservado","vendido","retirado",null]},
    "reservadoPor": {"bsonType":["objectId","null"],"description":"→ Orden"},
    "oculto": {
      "bsonType": ["object","null"],
      "properties": {
        "por": {"bsonType":"objectId","description":"→ Usuario"},
        "motivo": {"bsonType":["string","null"],"maxLength":300},
        "fecha": {"bsonType":["date","null"]}
      },
      "required": ["por"]
    },
    "_id": {"bsonType":["objectId","null"]},
    "createdAt": {"bsonType":["date","null"]},
    "updatedAt": {"bsonType":["date","null"]}
  },
  "required": ["vendedor","titulo","grupo","categoria"]
});
db.productos.createIndex({"estado":1,"createdAt":-1});
db.productos.createIndex({"vendedor":1,"createdAt":-1});
db.productos.createIndex({"grupo":1,"estado":1});

// ---------------------------------------------------------------------------
// ordenes: Compras e intercambios. comprador/vendedor → usuarios, producto → productos, conversacion → conversaciones.
// ---------------------------------------------------------------------------
crear("ordenes", {
  "bsonType": "object",
  "properties": {
    "comprador": {"bsonType":"objectId","description":"→ Usuario"},
    "vendedor": {"bsonType":"objectId","description":"→ Usuario"},
    "producto": {"bsonType":"objectId","description":"→ Producto"},
    "articulo": {
      "bsonType": "object",
      "properties": {
        "articuloId": {"bsonType":["objectId","null"]},
        "titulo": {"bsonType":"string"},
        "grupo": {"bsonType":["string","null"]},
        "categoria": {"bsonType":["string","null"]},
        "imagen": {"bsonType":["string","null"]}
      },
      "required": ["titulo"]
    },
    "tipo": {"bsonType":"string","enum":["compra","intercambio"]},
    "precio": {"bsonType":["int","long","double","decimal","null"],"minimum":0},
    "ofrecidos": {
      "bsonType": "array",
      "items": {
        "bsonType": ["object","null"],
        "properties": {
          "articuloId": {"bsonType":["objectId","null"]},
          "titulo": {"bsonType":"string"},
          "grupo": {"bsonType":["string","null"]},
          "categoria": {"bsonType":["string","null"]},
          "imagen": {"bsonType":["string","null"]}
        },
        "required": ["titulo"]
      }
    },
    "entrega": {"bsonType":["string","null"],"enum":["envio","en_persona",null]},
    "nota": {"bsonType":["string","null"],"maxLength":500},
    "estado": {
      "bsonType": ["string","null"],
      "enum": ["pendiente","aceptada","enviada","recibida","completada","rechazada","cancelada",null]
    },
    "historial": {
      "bsonType": "array",
      "items": {
        "bsonType": ["object","null"],
        "properties": {
          "estado": {
            "bsonType": "string",
            "enum": ["pendiente","aceptada","enviada","recibida","completada","rechazada","cancelada"]
          },
          "fecha": {"bsonType":["date","null"]},
          "por": {"bsonType":["objectId","null"],"description":"→ Usuario"},
          "nota": {"bsonType":["string","null"],"maxLength":300}
        },
        "required": ["estado"]
      }
    },
    "conversacion": {"bsonType":["objectId","null"],"description":"→ Conversacion"},
    "disputa": {
      "bsonType": ["object","null"],
      "properties": {
        "estado": {"bsonType":["string","null"],"enum":["abierta","resuelta",null]},
        "abiertaPor": {"bsonType":"objectId","description":"→ Usuario"},
        "motivo": {"bsonType":"string","enum":["no_llego","no_corresponde","falsificacion","no_responde","otro"]},
        "detalle": {"bsonType":["string","null"],"maxLength":500},
        "fecha": {"bsonType":["date","null"]},
        "estadoPrevio": {
          "bsonType": "string",
          "enum": ["pendiente","aceptada","enviada","recibida","completada","rechazada","cancelada"]
        },
        "moderador": {"bsonType":["objectId","null"],"description":"→ Usuario"},
        "resolucion": {
          "bsonType": ["object","null"],
          "properties": {
            "accion": {"bsonType":["string","null"],"enum":["cancelar","completar","continuar",null]},
            "nota": {"bsonType":["string","null"],"maxLength":500},
            "fecha": {"bsonType":["date","null"]}
          }
        }
      },
      "required": ["abiertaPor","motivo","estadoPrevio"]
    },
    "calificacion": {
      "bsonType": ["object","null"],
      "properties": {
        "estrellas": {"bsonType":["int","long","double","decimal","null"],"minimum":1,"maximum":5},
        "comentario": {"bsonType":["string","null"],"maxLength":500},
        "fecha": {"bsonType":["date","null"]}
      }
    },
    "_id": {"bsonType":["objectId","null"]},
    "createdAt": {"bsonType":["date","null"]},
    "updatedAt": {"bsonType":["date","null"]}
  },
  "required": ["comprador","vendedor","producto","articulo","tipo"]
});
db.ordenes.createIndex({"comprador":1,"createdAt":-1});
db.ordenes.createIndex({"vendedor":1,"createdAt":-1});
db.ordenes.createIndex({"producto":1,"estado":1});
db.ordenes.createIndex({"disputa.estado":1,"disputa.fecha":-1});

// ---------------------------------------------------------------------------
// denuncias: Denuncias de contenido o cuentas para moderación. reportante/usuarioDenunciado/moderador → usuarios.
// ---------------------------------------------------------------------------
crear("denuncias", {
  "bsonType": "object",
  "properties": {
    "reportante": {"bsonType":"objectId","description":"→ Usuario"},
    "tipo": {"bsonType":"string","enum":["publicacion","comentario","usuario","producto","mensaje"]},
    "objetivo": {"bsonType":"objectId"},
    "usuarioDenunciado": {"bsonType":"objectId","description":"→ Usuario"},
    "resumen": {"bsonType":["string","null"],"maxLength":300},
    "motivo": {
      "bsonType": "string",
      "enum": ["spam","acoso","falsificacion","estafa","contenido_inapropiado","otro"]
    },
    "detalle": {"bsonType":["string","null"],"maxLength":500},
    "estado": {"bsonType":["string","null"],"enum":["abierta","en_revision","resuelta","descartada",null]},
    "moderador": {"bsonType":["objectId","null"],"description":"→ Usuario"},
    "resolucion": {
      "bsonType": ["object","null"],
      "properties": {
        "accion": {"bsonType":["string","null"],"enum":["ninguna","ocultar","suspender","banear",null]},
        "nota": {"bsonType":["string","null"],"maxLength":500},
        "fecha": {"bsonType":["date","null"]}
      }
    },
    "_id": {"bsonType":["objectId","null"]},
    "createdAt": {"bsonType":["date","null"]},
    "updatedAt": {"bsonType":["date","null"]}
  },
  "required": ["reportante","tipo","objetivo","usuarioDenunciado","motivo"]
});
db.denuncias.createIndex({"reportante":1,"tipo":1,"objetivo":1}, {"unique":true});
db.denuncias.createIndex({"estado":1,"createdAt":-1});
db.denuncias.createIndex({"usuarioDenunciado":1});

// ---------------------------------------------------------------------------
// moderaciones: Bitácora de acciones de moderación. moderador/usuarioAfectado → usuarios, denuncia → denuncias.
// ---------------------------------------------------------------------------
crear("moderaciones", {
  "bsonType": "object",
  "properties": {
    "moderador": {"bsonType":"objectId","description":"→ Usuario"},
    "accion": {
      "bsonType": "string",
      "enum": [
        "ocultar",
        "mostrar",
        "suspender",
        "levantar_suspension",
        "banear",
        "reactivar",
        "cambiar_rol",
        "resolver_denuncia",
        "descartar_denuncia",
        "resolver_disputa",
        "crear_grupo",
        "aprobar_grupo",
        "rechazar_grupo",
        "editar_grupo"
      ]
    },
    "tipoObjetivo": {"bsonType":"string"},
    "objetivo": {"bsonType":"objectId"},
    "usuarioAfectado": {"bsonType":["objectId","null"],"description":"→ Usuario"},
    "motivo": {"bsonType":["string","null"],"maxLength":500},
    "detalle": {},
    "denuncia": {"bsonType":["objectId","null"],"description":"→ Denuncia"},
    "_id": {"bsonType":["objectId","null"]},
    "fecha": {"bsonType":["date","null"]}
  },
  "required": ["moderador","accion","tipoObjetivo","objetivo"]
});
db.moderaciones.createIndex({"moderador":1,"fecha":-1});
db.moderaciones.createIndex({"fecha":-1});

// ---------------------------------------------------------------------------
// grupos: Grupos K-pop que agrega la comunidad (pendiente → aprobado | rechazado). solicitante/revisadoPor → usuarios.
// ---------------------------------------------------------------------------
crear("grupos", {
  "bsonType": "object",
  "properties": {
    "nombre": {"bsonType":"string","maxLength":40},
    "clave": {"bsonType":"string"},
    "fandom": {"bsonType":["string","null"],"maxLength":40},
    "agencia": {"bsonType":["string","null"],"maxLength":60},
    "integrantes": {"bsonType":["int","long","double","decimal","null"],"minimum":1,"maximum":50},
    "debut": {"bsonType":["int","long","double","decimal","null"],"minimum":1990,"maximum":2100},
    "descripcion": {"bsonType":["string","null"],"maxLength":500},
    "imagen": {"bsonType":["string","null"]},
    "portada": {"bsonType":["string","null"]},
    "color": {"bsonType":["string","null"]},
    "iniciales": {"bsonType":["string","null"],"maxLength":6},
    "base": {"bsonType":["bool","null"]},
    "claveBase": {"bsonType":["string","null"]},
    "orden": {"bsonType":["int","long","double","decimal","null"]},
    "estado": {"bsonType":["string","null"],"enum":["pendiente","aprobado","rechazado",null]},
    "solicitante": {"bsonType":["objectId","null"],"description":"→ Usuario"},
    "revisadoPor": {"bsonType":["objectId","null"],"description":"→ Usuario"},
    "fechaRevision": {"bsonType":["date","null"]},
    "motivoRechazo": {"bsonType":["string","null"],"maxLength":300},
    "_id": {"bsonType":["objectId","null"]},
    "fechaCreacion": {"bsonType":["date","null"]},
    "fechaActualizacion": {"bsonType":["date","null"]}
  },
  "required": ["nombre","clave"]
});
db.grupos.createIndex({"clave":1,"estado":1});
db.grupos.createIndex({"estado":1,"fechaCreacion":-1});
db.grupos.createIndex({"solicitante":1,"fechaCreacion":-1});
db.grupos.createIndex({"claveBase":1});

print("Listo: " + db.getCollectionNames().length + " colecciones en " + nombreBase);
