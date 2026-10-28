import dotenv from "dotenv";
dotenv.config();

function positiveInt(name: string, fallback: number) {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === "") return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    return value;
}

function ttlSeconds(name: string, fallback: number) {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === "") return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive number of seconds`);
    }
    return value;
}

const llmApiFormat = process.env.LLM_API_FORMAT || "openai";
if (llmApiFormat !== "openai" && llmApiFormat !== "anthropic") {
    throw new Error("LLM_API_FORMAT must be openai or anthropic");
}
const hasOpenRouterKey = Boolean(process.env.OPENROUTER_API_KEY);

export const config = {
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    accessTokenTtlSeconds: ttlSeconds("ACCESS_TOKEN_TTL_SECONDS", 15 * 60),
    refreshTokenTtlSeconds: ttlSeconds("REFRESH_TOKEN_TTL_SECONDS", 7 * 24 * 60 * 60),
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    audioMaxBytes: positiveInt("AUDIO_MAX_BYTES", 10 * 1024 * 1024),
    whisperAsrUrl: process.env.WHISPER_ASR_URL || "http://127.0.0.1:9002/asr",
    llmApiFormat,
    llmApiBaseUrl: process.env.LLM_API_BASE_URL || (hasOpenRouterKey
        ? "https://openrouter.ai/api/v1"
        : "http://127.0.0.1:11434/v1"),
    llmApiKey: process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY,
    llmModel: process.env.LLM_MODEL || process.env.OPENROUTER_MODEL || (hasOpenRouterKey
        ? "openrouter/free"
        : "qwen3.5:2b"),
    redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    minio: {
        endPoint: process.env.MINIO_ENDPOINT || "127.0.0.1",
        port: Number(process.env.MINIO_PORT || 9000),
        useSSL: process.env.MINIO_USE_SSL === "true",
        accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
        secretKey: process.env.MINIO_SECRET_KEY || "minioadmin123",
        bucket: process.env.MINIO_BUCKET || "audio",
    },
    smtp: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.MAIL_FROM || "DocFlow <no-reply@docflow.local>",
    },
};

if (!config.jwtSecret) {
    throw new Error("JWT_SECRET is not set");
}