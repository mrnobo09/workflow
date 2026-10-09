import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { listSpecialties, type SpecialtyOption } from "../api/specialties.ts";

type SpecialtyContextValue = {
  specialties: SpecialtyOption[];
  label: (value: string | undefined) => string;
};

const SpecialtyContext = createContext<SpecialtyContextValue | null>(null);

function fallbackLabel(value: string) {
  const words = value.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function SpecialtyProvider({ children }: { children: ReactNode }) {
  const [specialties, setSpecialties] = useState<SpecialtyOption[]>([]);

  useEffect(() => {
    let active = true;
    listSpecialties()
      .then((next) => {
        if (active) setSpecialties(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const label = useCallback((value: string | undefined) => {
    if (!value) return "";
    return specialties.find((option) => option.value === value)?.label ?? fallbackLabel(value);
  }, [specialties]);

  return (
    <SpecialtyContext.Provider value={{ specialties, label }}>
      {children}
    </SpecialtyContext.Provider>
  );
}

export function useSpecialties() {
  const value = useContext(SpecialtyContext);
  if (!value) {
    throw new Error("useSpecialties must be used within SpecialtyProvider");
  }
  return value;
}
