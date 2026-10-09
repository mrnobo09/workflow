import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { apiErrorMessage } from "../api/client.ts";
import { AuthShell } from "../components/AuthShell.tsx";
import { Field, FormError } from "../components/Field.tsx";
import { useUser } from "../context/UserContext.tsx";
import { input, linkButton, primaryButton } from "../lib/styles.ts";

export function LoginPage() {
  const { login } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(email, password);
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not sign in"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with the email and password from your account message."
      footer={<>New company? <Link to="/signup" className={linkButton}>Create an account</Link></>}
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label="Email">
          <input className={input} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password">
          <input className={input} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </Field>
        <FormError message={error} />
        <button className={`${primaryButton} mt-2 w-full py-2.5`} type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
