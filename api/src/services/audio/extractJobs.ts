import { config } from "../../config.js";
import {
    FALLBACK_SPECIALTY,
    SPECIALTIES,
    SPECIALTY_DEFINITIONS,
    isSpecialty,
    type Specialty,
} from "../../schemas/specialties.js";

export type ExtractedJob = {
    description: string;
    location?: string;
    specialty: Specialty;
    requestedTimeText?: string;
    sourceText?: string;
};

function textField(value: unknown, max: number) {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, max);
}

function systemPrompt() {
    const specialties = SPECIALTIES
        .map((value) => `- ${value}: ${SPECIALTY_DEFINITIONS[value].covers}`)
        .join("\n");

    return [
        "Extract maintenance jobs from a transcript. Each separate problem is its own job.",
        "Reply with JSON only, in this shape:",
        `{"jobs":[{"description":"","location":"","specialty":"","requestedTimeText":"","sourceText":""}]}`,
        "description: a short summary of the work. location: where it is, if said.",
        "requestedTimeText: when it is wanted, if said. sourceText: the exact words it came from.",
        "specialty must be exactly one of these values:",
        specialties,
        `Use ${FALLBACK_SPECIALTY} only when no other specialty fits.`,
        "Do not invent workers, companies, ids, or problems that were not said.",
    ].join("\n");
}

export async function extractJobs(transcript: string): Promise<ExtractedJob[]> {
    if (!config.openRouterApiKey) {
        throw new Error("OPENROUTER_API_KEY is not set");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.openRouterApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: config.openRouterModel,
            messages: [
                { role: "system", content: systemPrompt() },
                { role: "user", content: transcript },
            ],
        }),
    });

    if (!response.ok) {
        throw new Error("Job extraction failed");
    }

    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end < start) {
        throw new Error("Job extraction returned no JSON");
    }
    const parsed = JSON.parse(content.slice(start, end + 1)) as { jobs?: unknown };
    if (!Array.isArray(parsed.jobs)) return [];

    const jobs: ExtractedJob[] = [];
    for (const entry of parsed.jobs.slice(0, 10)) {
        if (!entry || typeof entry !== "object") continue;
        const record = entry as Record<string, unknown>;
        const description = textField(record.description, 500);
        if (!description) continue;
        jobs.push({
            description,
            location: textField(record.location, 200),
            // The model's answer is untrusted; an unknown trade still becomes a job a manager can reassign.
            specialty: isSpecialty(record.specialty) ? record.specialty : FALLBACK_SPECIALTY,
            requestedTimeText: textField(record.requestedTimeText, 200),
            sourceText: textField(record.sourceText, 300),
        });
    }
    return jobs;
}
