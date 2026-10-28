import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { isValidObjectId } from "mongoose";
import { JobModel } from "../../models/job.js";
import { TenantModel } from "../../models/tenant.js";
import { UserModel } from "../../models/user.js";
import { isDuplicateKey, type TeamMemberInput } from "../../schemas/company.js";
import { isSpecialty } from "../../schemas/specialties.js";
import type { PublicAccount } from "../../types/user.js";
import { sendAccountCredentials } from "../mail/sendAccountCredentials.js";

export class TeamError extends Error {
    constructor(readonly status: number, message: string) {
        super(message);
    }
}

function temporaryPassword() {
    return randomBytes(12).toString("base64url");
}

function readMember(body: unknown): TeamMemberInput {
    if (!body || typeof body !== "object") {
        throw new TeamError(400, "Name, email, and role are required");
    }
    const { name, email, accountType, specialty } = body as Record<string, unknown>;
    if (typeof name !== "string" || name.trim() === "") {
        throw new TeamError(400, "Name is required");
    }
    if (typeof email !== "string" || !email.includes("@")) {
        throw new TeamError(400, "A valid email is required");
    }
    const base = { name: name.trim(), email: email.trim().toLowerCase() };

    if (accountType === "user") return { ...base, accountType: "user" };
    if (accountType === "worker") {
        if (!isSpecialty(specialty)) {
            throw new TeamError(400, "Workers need a specialty");
        }
        return { ...base, accountType: "worker", specialty };
    }
    throw new TeamError(400, "Role must be requester or worker");
}

export async function createTeamMember(manager: PublicAccount, body: unknown) {
    const member = readMember(body);
    const tenant = await TenantModel.findById(manager.tenantId).select("name");
    if (!tenant) throw new TeamError(404, "Company not found");

    const password = temporaryPassword();
    let saved;
    try {
        saved = await UserModel.create({
            // The company always comes from the manager's session, never the request body.
            tenantId: manager.tenantId,
            name: member.name,
            email: member.email,
            passwordHash: await bcrypt.hash(password, 10),
            accountType: member.accountType,
            specialty: member.accountType === "worker" ? member.specialty : undefined,
        });
    } catch (error) {
        if (isDuplicateKey(error)) throw new TeamError(409, "An account with that email already exists");
        throw error;
    }

    try {
        await sendAccountCredentials({
            to: member.email,
            name: member.name,
            companyName: tenant.name,
            password,
        });
    } catch {
        await UserModel.deleteOne({ _id: saved._id, tenantId: manager.tenantId });
        throw new TeamError(502, "Could not email the new account. Nothing was saved.");
    }

    return toMemberView(saved);
}

export async function deleteTeamMember(manager: PublicAccount, memberId: string) {
    if (!isValidObjectId(memberId) || memberId === manager.id) {
        throw new TeamError(404, "Team member not found");
    }

    const member = await UserModel.findOne({
        _id: memberId,
        tenantId: manager.tenantId,
        accountType: { $in: ["user", "worker"] },
    }).select("_id");
    if (!member) throw new TeamError(404, "Team member not found");

    const activeJobs = await JobModel.exists({
        tenantId: manager.tenantId,
        assignedTo: member._id,
        status: "in_progress",
    });
    if (activeJobs) {
        throw new TeamError(409, "Complete the worker's in-progress jobs before removing them");
    }

    await JobModel.updateMany(
        { tenantId: manager.tenantId, assignedTo: member._id, status: { $in: ["draft", "assigned"] } },
        { assignedTo: null, status: "draft", lastChangedBy: manager.id },
    );
    await UserModel.deleteOne({ _id: member._id, tenantId: manager.tenantId });
}

export function toMemberView(user: {
    _id: { toString(): string };
    name: string;
    email: string;
    accountType: string;
    specialty?: string | null;
    createdAt?: Date;
}) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        specialty: user.specialty ?? undefined,
        createdAt: user.createdAt,
    };
}
