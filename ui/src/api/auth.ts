import { api } from "./client.ts";

export type AccountType = "user" | "worker" | "manager";

export type Account = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  accountType: AccountType;
  specialty?: string;
  companyName: string;
};

export type ManagerSignupInput = {
  companyName: string;
  name: string;
  email: string;
  password: string;
};

export async function loginRequest(email: string, password: string) {
  const { data } = await api.post<{ user: Account }>("/auth/login", { email, password });
  return data.user;
}

export async function logoutRequest() {
  await api.post("/auth/logout");
}

export async function meRequest() {
  const { data } = await api.get<Account>("/auth/me");
  return data;
}

export async function signupRequest(input: ManagerSignupInput) {
  const { data } = await api.post<{ user: Account }>("/auth/signup", input);
  return data.user;
}
