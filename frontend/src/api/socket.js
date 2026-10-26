import { io } from "socket.io-client";
import { TOKEN_KEY } from "./client";

const URL_SERVIDOR =
    import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

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