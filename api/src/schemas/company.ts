import type { Specialty } from "./specialties.js";

export type ManagerSignupInput = {
    companyName: string;
    name: string;
    email: string;
    password: string;
};

export type TeamMemberInput =
    | { name: string; email: string; accountType: "user" }
    | { name: string; email: string; accountType: "worker"; specialty: Specialty };

export function isDuplicateKey(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
