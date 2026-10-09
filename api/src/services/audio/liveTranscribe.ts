import type { Readable } from "node:stream";
import { transcribeAudio } from "./transcribe.js";

const partialBytes = 16 * 1024;

export function transcribeLive(
    stream: Readable,
    onTranscript: (text: string) => Promise<void> | void,
): Promise<string> {
    const pieces: Buffer[] = [];
    let size = 0;
    let sentBytes = 0;
    let latest = "";
    let reading = false;
    let ended = false;
    let settled = false;

    return new Promise((resolve, reject) => {
        function finish(text: string) {
            if (settled) return;
            settled = true;
            resolve(text);
        }

        function fail(error: unknown) {
            if (settled) return;
            settled = true;
            reject(error instanceof Error ? error : new Error("Transcription failed"));
        }

        async function transcribe(snapshot: Buffer, finalAttempt: boolean) {
            reading = true;
            // Unread audio stays in this stream until Whisper returns. A full buffer
            // makes the duplicate write return false, which pauses the websocket.
            stream.pause();
            let stop = false;
            try {
                const text = await transcribeAudio(snapshot);
                sentBytes = snapshot.length;
                if (text && text !== latest) {
                    latest = text;
                    await onTranscript(text);
                }
            } catch (error) {
                const whisperRejected = error instanceof Error && error.message === "Transcription failed";
                if (whisperRejected && !finalAttempt) {
                    sentBytes = snapshot.length;
                } else {
                    stop = true;
                    fail(error);
                }
            } finally {
                reading = false;
                if (!stop && !settled) stream.resume();
            }
            if (!settled) schedule();
        }

        function schedule() {
            if (reading || settled) return;
            const pending = size - sentBytes;
            if (ended && pending === 0) {
                finish(latest);
                return;
            }
            if (!ended && pending < partialBytes) return;
            if (size === 0) {
                finish("");
                return;
            }
            void transcribe(Buffer.concat(pieces), ended);
        }

        stream.on("data", (chunk: Buffer) => {
            pieces.push(chunk);
            size += chunk.length;
            schedule();
        });
        stream.on("end", () => {
            ended = true;
            schedule();
        });
        stream.on("error", (error) => {
            fail(error);
        });
    });
}
