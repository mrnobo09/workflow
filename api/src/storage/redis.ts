import { Redis } from "ioredis";
import { config } from "../config.js";

export const NOTIFICATION_STREAM = "notifications";
export const NOTIFICATION_GROUP = "notification-service";

export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 3 });

// XREADGROUP BLOCK holds its connection until data arrives, so it gets its own.
export function blockingRedis() {
    return redis.duplicate({ maxRetriesPerRequest: null });
}

redis.on("error", (error) => {
    console.error("Redis error:", error.message);
});
