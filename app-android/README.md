# KollectA para Android (APK)

App nativa de Android hecha con [Capacitor](https://capacitorjs.com). Abre https://kollecta.onrender.com dentro de un WebView, así que **siempre muestra la versión publicada**: los cambios de la web no requieren volver a compilar el APK.

## Requisitos

- Node.js 18+
- JDK 17 o superior (`java -version`)
- Android SDK con la plataforma 36 (`%LOCALAPPDATA%\Android\Sdk` en Windows). Gradle instala solo las build-tools que falten.

## Compilar

```bash
cd app-android
npm install
# Indica dónde está el SDK (solo la primera vez; el archivo no se sube a Git):
echo sdk.dir=C:/Users/<tu-usuario>/AppData/Local/Android/Sdk > android/local.properties
npm run apk
```

El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

## Instalar en el teléfono

1. Pasa el `.apk` al teléfono (cable, Drive, WhatsApp…).
2. Ábrelo. Android pedirá permitir "instalar apps de origen desconocido" para esa app; acéptalo.
3. Abre **KollectA** desde el menú de apps.

## Detalles

- Paquete: `com.kollecta.app` · nombre: KollectA · Android 6.0 (API 23) o superior.
- Solo pide permiso de internet.
- Está firmado con la llave de depuración de Android: sirve para instalarlo directamente, no para publicarlo en Google Play.
- `capacitor.config.json` define la URL que abre (`server.url`). Para probar contra un servidor local, cámbiala y corre `npm run sync`.
- Íconos y pantalla de inicio: `android/app/src/main/res/` (generados a partir de `frontend/public/icons/`).
