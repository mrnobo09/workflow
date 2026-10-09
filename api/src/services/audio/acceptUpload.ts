import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";
import type { RawData, WebSocket } from "ws";
import { config } from "../../config.js";
import { AudioImportModel } from "../../models/audio.js";
import type { PublicAccount } from "../../types/user.js";
import { removeAudio, uploadAudio } from "../../storage/minio.js";
import { transcribeLive } from "./liveTranscribe.js";
import { failImport, finishImport, openImport, rememberTranscript } from "./processImport.js";

function asBuffer(data: RawData) {
    if (Buffer.isBuffer(data)) return data;
    if (Array.isArray(data)) return Buffer.concat(data);
    return Buffer.from(data);
}

function controlType(data: RawData) {
    const message = JSON.parse(asBuffer(data).toString()) as { type?: string };
    return message.type;
}

export function acceptUpload(socket: WebSocket, account: PublicAccount) {
    const objectKey = `${account.tenantId}/${account.id}/${randomUUID()}.webm`;
    const storage = new PassThrough({ highWaterMark: 64 * 1024 });
    const transcript = new PassThrough({ highWaterMark: 64 * 1024 });
    const uploaded = uploadAudio(objectKey, storage);
    let received = 0;
    let failed = false;
    let finished = false;
    let audioImportId: string | undefined;

    const opened = openImport({ account, storageKey: objectKey }).then((id) => {
        audioImportId = id;
        return id;
    });

    const transcribed = transcribeLive(transcript, async (text) => {
        const id = audioImportId ?? await opened;
        await rememberTranscript({
            audioImportId: id,
            tenantId: account.tenantId,
            transcript: text,
        });
        if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify({ type: "transcript", text }));
        }
    });

    function fail(code: number, message: string) {
        if (failed) return;
        failed = true;
        const error = new Error(message);
        storage.destroy(error);
        transcript.destroy(error);
        if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify({ type: "error", message }));
            socket.close(code, message);
        }
    }

    function finish() {
        if (failed || finished) return;
        finished = true;
        storage.end();
        transcript.end();
    }

    function resume() {
        if (storage.writableNeedDrain || transcript.writableNeedDrain) return;
        if (socket.readyState === socket.OPEN) socket.resume();
    }

    function writeChunk(chunk: Buffer) {
        received += chunk.length;
        if (received > config.audioMaxBytes) {
            fail(1009, "Audio exceeds the size limit");
            return;
        }
        const storageReady = storage.write(chunk);
        const transcriptReady = transcript.write(chunk);
        if (!storageReady || !transcriptReady) socket.pause();
    }

    storage.on("drain", resume);
    transcript.on("drain", resume);

    socket.on("message", (data, isBinary) => {
        if (failed || finished) return;

        if (isBinary) {
            writeChunk(asBuffer(data));
            return;
        }

        try {
            if (controlType(data) === "end") finish();
        } catch {
            fail(1003, "Expected binary audio or an end message");
        }
    });

    socket.on("close", () => {
        finish();
    });

    void (async () => {
        const stored = uploaded.then(() => true).catch(() => false);
        const spoken = transcribed.catch((error: unknown): string | Error => (
            error instanceof Error ? error : new Error("Transcription failed")
        ));
        const [id, storedOk, transcriptResult] = await Promise.all([
            opened.catch(() => undefined),
            stored,
            spoken,
        ]);

        if (failed) {
            if (!storedOk) await removeAudio(objectKey);
            return;
        }

        if (!id || !storedOk) {
            await removeAudio(objectKey);
            fail(1011, "Upload failed");
            return;
        }

        if (received === 0) {
            await removeAudio(objectKey);
            await AudioImportModel.deleteOne({ _id: id, tenantId: account.tenantId });
            fail(1008, "Empty recording");
            return;
        }

        if (transcriptResult instanceof Error) {
            await failImport({
                account,
                audioImportId: id,
                message: transcriptResult.message,
            });
            fail(1011, transcriptResult.message);
            return;
        }

        try {
            if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify({ type: "processing" }));
            }
            const result = await finishImport({
                account,
                audioImportId: id,
                transcript: transcriptResult,
            });
            if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify({ type: "saved", ...result }));
                socket.close(1000, "saved");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Import failed";
            fail(1011, message);
        }
    })();
}
