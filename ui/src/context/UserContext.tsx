import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  loginRequest,
  logoutRequest,
  meRequest,
  signupRequest,
  type Account,
  type ManagerSignupInput,
} from "../api/auth.ts";

type UserContextValue = {
  user: Account | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: ManagerSignupInput) => Promise<void>;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    meRequest()
      .then((account) => {
        if (active) setUser(account);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const account = await loginRequest(email, password);
    setUser(account);
  }

  async function signup(input: ManagerSignupInput) {
    setUser(await signupRequest(input));
  }

  async function logout() {
    await logoutRequest();
    setUser(null);
  }

  return (
    <UserContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const value = useContext(UserContext);
  if (!value) {
    throw new Error("useUser must be used within UserProvider");
  }
  return value;
}
