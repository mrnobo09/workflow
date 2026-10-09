import { TenantModel } from "../../models/tenant.js";
import type { AccountType, PublicAccount, SessionAccount } from "../../types/user.js";

type AccountSource = {
    _id: { toString(): string };
    tenantId: { toString(): string };
    name: string;
    email: string;
    accountType: string;
    specialty?: string | null;
};

function accountType(value: string): AccountType {
    if (value === "worker" || value === "manager") return value;
    return "user";
}

export function toPublicAccount(user: AccountSource): PublicAccount {
    return {
        id: user._id.toString(),
        tenantId: user.tenantId.toString(),
        name: user.name,
        email: user.email,
        accountType: accountType(user.accountType),
        specialty: user.specialty ?? undefined,
    };
}

export async function withCompany(account: PublicAccount): Promise<SessionAccount> {
    const tenant = await TenantModel.findById(account.tenantId).select("name");
    return { ...account, companyName: tenant?.name ?? "" };
}
