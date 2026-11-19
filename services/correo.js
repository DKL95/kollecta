/* ==========================================================================
   Envío de correos (por ahora solo el de "Recuperar contraseña").

   Usa la API HTTP de Brevo (https://www.brevo.com, plan gratuito de 300
   correos al día). Se usa HTTP y no SMTP porque los servidores gratuitos de
   Render bloquean los puertos de SMTP.

   Variables:  BREVO_API_KEY   llave de la API (Brevo > SMTP & API > API Keys)
               CORREO_REMITENTE  correo verificado en Brevo como remitente
               CORREO_NOMBRE     nombre que aparece como remitente (opcional)

   Sin BREVO_API_KEY el correo NO se envía: se escribe en la bitácora y se
   guarda en `correosSimulados` (sirve para desarrollar y para las pruebas).
   ========================================================================== */

const logger = require("../config/logger");

const correosSimulados = [];

function correoConfigurado() {
    return Boolean(process.env.BREVO_API_KEY && process.env.CORREO_REMITENTE);
}

async function enviarCorreo({ para, asunto, html, texto }) {
    if (!correoConfigurado()) {
        correosSimulados.push({ para, asunto, html, texto });
        if (correosSimulados.length > 20) correosSimulados.shift();
        logger.warn(`Correo NO enviado (falta BREVO_API_KEY o CORREO_REMITENTE). Para: ${para}. Asunto: ${asunto}\n${texto}`);
        return;
    }

    const respuesta = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            sender: { email: process.env.CORREO_REMITENTE, name: process.env.CORREO_NOMBRE || "KollectA" },
            to: [{ email: para }],
            subject: asunto,
            htmlContent: html,
            textContent: texto
        }),
        signal: AbortSignal.timeout(10000)
    });

    if (!respuesta.ok) {
        const detalle = await respuesta.text().catch(() => "");
        throw new Error(`Brevo respondió ${respuesta.status}: ${detalle.slice(0, 300)}`);
    }
}

module.exports = { enviarCorreo, correoConfigurado, correosSimulados };
