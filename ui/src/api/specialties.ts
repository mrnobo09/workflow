import { api } from "./client.ts";

export type Specialty = string;

export type SpecialtyOption = {
  value: Specialty;
  label: string;
  covers: string;
};

export async function listSpecialties() {
  const { data } = await api.get<{ specialties: SpecialtyOption[] }>("/specialties");
  return data.specialties;
}
