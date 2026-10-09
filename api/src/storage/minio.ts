import type { Readable } from "node:stream";
import { Client } from "minio";
import { config } from "../config.js";

const minio = new Client({
    endPoint: config.minio.endPoint,
    port: config.minio.port,
    useSSL: config.minio.useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
});

export async function ensureAudioBucket() {
    const exists = await minio.bucketExists(config.minio.bucket);
    if (!exists) {
        await minio.makeBucket(config.minio.bucket);
    }
}

export function uploadAudio(objectKey: string, body: Readable) {
    return minio.putObject(config.minio.bucket, objectKey, body, undefined, {
        "Content-Type": "audio/webm",
    });
}

export async function removeAudio(objectKey: string) {
    await minio.removeObject(config.minio.bucket, objectKey).catch(() => undefined);
}
