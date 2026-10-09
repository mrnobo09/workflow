import type { NextFunction, Request, Response } from "express";
import { isSpecialty } from "../schemas/specialties.js";

export const JOB_STATUSES = ["draft", "assigned", "in_progress", "completed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export type JobListFilter = {
    tenantId: string;
    createdBy?: string;
    assignedTo?: string;
    specialty?: string;
    status?: JobStatus;
};

declare global {
    namespace Express {
        interface Request {
            jobFilter?: JobListFilter;
        }
    }
}

function isStatus(value: unknown): value is JobStatus {
    return typeof value === "string" && (JOB_STATUSES as readonly string[]).includes(value);
}

export function scopeJobList(req: Request, res: Response, next: NextFunction) {
    const account = req.account;
    if (!account) {
        return res.status(401).json({ error: "Missing session" });
    }

    const filter: JobListFilter = { tenantId: account.tenantId };
    if (isStatus(req.query.status)) filter.status = req.query.status;

    if (account.accountType === "worker") {
        if (!account.specialty) {
            return res.status(403).json({ error: "Worker specialty is required" });
        }
        filter.specialty = account.specialty;
        if (req.query.scope === "mine") filter.assignedTo = account.id;
    } else if (account.accountType === "manager") {
        const specialty = req.query.specialty;
        if (typeof specialty === "string" && isSpecialty(specialty)) filter.specialty = specialty;
    } else {
        filter.createdBy = account.id;
    }

    req.jobFilter = filter;
    next();
}
