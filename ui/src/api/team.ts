import type { AccountType } from "./auth.ts";
import type { Specialty } from "./specialties.ts";
import { api } from "./client.ts";

export type Member = {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
  specialty?: Specialty;
  createdAt: string;
};

export type NewMember =
  | { name: string; email: string; accountType: "user" }
  | { name: string; email: string; accountType: "worker"; specialty: Specialty };

export async function listTeam() {
  const { data } = await api.get<{ members: Member[] }>("/team");
  return data.members;
}

export async function addTeamMember(input: NewMember) {
  const { data } = await api.post<{ member: Member }>("/team", input);
  return data.member;
}
