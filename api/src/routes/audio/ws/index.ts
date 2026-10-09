import type { Server } from "node:http";
import { WebSocketServer } from "ws";
import { authorizeAudioSocket } from "../../../middleware/authorizeAudioSocket.js";
import { acceptUpload } from "../../../services/audio/acceptUpload.js";

export function attachAudioSocket(server: Server) {
    const wss = new WebSocketServer({ server, path: "/audio/stream" });

    wss.on("connection", (socket, request) => {
        void authorizeAudioSocket(request)
            .then((result) => {
                if ("error" in result) {
                    socket.close(result.error.code, result.error.message);
                    return;
                }

                socket.send(JSON.stringify({ type: "ready" }));
                acceptUpload(socket, result.account);
            })
            .catch(() => {
                socket.close(1011, "Upload failed");
            });
    });
}
