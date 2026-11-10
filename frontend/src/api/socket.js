import { io } from "socket.io-client";
import { TOKEN_KEY } from "./client";

// En producción el frontend lo sirve el mismo Express, así que se usa el mismo origen.
const URL_SERVIDOR =
    import.meta.env.VITE_SOCKET_URL ||
    (import.meta.env.DEV ? "http://localhost:3000" : undefined);

export const socket = io(URL_SERVIDOR, {
    autoConnect: false,

    auth: (callback) => {
        callback({
            token: localStorage.getItem(TOKEN_KEY),
        });
    },

    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 10000,
});