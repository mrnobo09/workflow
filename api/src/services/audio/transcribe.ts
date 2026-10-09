import { config } from "../../config.js";

export async function transcribeAudio(audio: Buffer) {
    const form = new FormData();
    form.append("audio_file", new Blob([new Uint8Array(audio)], { type: "audio/webm" }), "recording.webm");

    const url = new URL(config.whisperAsrUrl);
    url.searchParams.set("output", "json");
    url.searchParams.set("task", "transcribe");

    const response = await fetch(url, { method: "POST", body: form });
    if (!response.ok) {
        throw new Error("Transcription failed");
    }

    const body: unknown = await response.json();
    if (typeof body === "string") return body.trim();
    if (body && typeof body === "object" && "text" in body && typeof body.text === "string") {
        return body.text.trim();
    }
    throw new Error("Transcription failed");
}
