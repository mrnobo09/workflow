import { useRef, useState } from "react";
import { card } from "../lib/styles.ts";

function audioSocketUrl() {
  const httpUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
  const url = new URL("/audio/stream", httpUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

type Phase = "idle" | "connecting" | "recording" | "processing" | "done" | "error";

export function AudioRecorder({ onSaved }: { onSaved: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("Describe the problem and where it is. Jobs are created when you stop.");
  const [transcript, setTranscript] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  function stopTracks() {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
  }

  async function start() {
    setPhase("connecting");
    setStatus("Connecting…");
    const media = await navigator.mediaDevices.getUserMedia({ audio: true });
    const socket = new WebSocket(audioSocketUrl());
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as {
        type?: string;
        message?: string;
        text?: string;
        audioImportId?: string;
        jobsCreated?: number;
      };
      if (message.type === "transcript" && message.text) {
        setTranscript(message.text);
      }
      if (message.type === "processing") {
        setPhase("processing");
        setStatus("Finding jobs in your note…");
      }
      if (message.type === "saved" && message.audioImportId) {
        const count = message.jobsCreated ?? 0;
        setPhase("done");
        setStatus(count === 1 ? "1 job created." : `${count} jobs created.`);
        stopTracks();
        onSaved();
      }
      if (message.type === "error") {
        setPhase("error");
        setStatus(message.message ?? "Upload failed");
        stopTracks();
      }
    };

    await new Promise<void>((resolve, reject) => {
      const onReady = (event: MessageEvent) => {
        const message = JSON.parse(String(event.data)) as { type?: string };
        if (message.type !== "ready") return;
        cleanup();
        resolve();
      };
      const onClose = () => {
        cleanup();
        reject(new Error("Audio stream closed"));
      };
      function cleanup() {
        socket.removeEventListener("message", onReady);
        socket.removeEventListener("close", onClose);
      }
      socket.addEventListener("message", onReady);
      socket.addEventListener("close", onClose);
      socket.addEventListener("error", () => reject(new Error("Could not open the audio stream")), { once: true });
    });

    let sendChain = Promise.resolve();
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
    const recorder = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size === 0 || socket.readyState !== WebSocket.OPEN) return;
      const blob = event.data;
      sendChain = sendChain.then(async () => {
        const buffer = await blob.arrayBuffer();
        if (socket.readyState === WebSocket.OPEN) socket.send(buffer);
      });
    };
    recorder.onstop = () => {
      void sendChain.then(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "end" }));
      });
    };
    recorder.start(250);
    setTranscript("");
    setPhase("recording");
    setStatus("Listening…");
  }

  function stop() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stopTracks();
    setPhase("processing");
    setStatus("Finishing the transcript…");
  }

  const recording = phase === "recording";
  const busy = phase === "connecting" || phase === "processing";

  return (
    <section className={`${card} grid gap-5 p-6`}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">New voice note</h2>
        <p className="mt-1 text-sm text-slate-500">
          Each job is sent to the right worker in your company.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 py-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (recording) {
              stop();
              return;
            }
            void start().catch((error: unknown) => {
              stopTracks();
              socketRef.current?.close();
              setPhase("error");
              setStatus(error instanceof Error ? error.message : "Could not record");
            });
          }}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-60 ${
            recording ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          {recording ? <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/40" /> : null}
          {recording ? (
            <span className="relative h-6 w-6 rounded-md bg-white" />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="relative h-8 w-8" aria-hidden>
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
              <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V20H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07A7 7 0 0 0 19 11Z" />
            </svg>
          )}
        </button>
        <p
          className={`text-center text-sm ${
            phase === "error" ? "text-rose-600" : phase === "done" ? "text-emerald-600" : "text-slate-600"
          }`}
        >
          {status}
        </p>
      </div>

      <div className="min-h-24 rounded-lg bg-slate-50 p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Live transcript</p>
        <p className="text-sm leading-relaxed text-slate-700">
          {transcript || <span className="text-slate-400">Your words will appear here as you speak.</span>}
        </p>
      </div>
    </section>
  );
}
