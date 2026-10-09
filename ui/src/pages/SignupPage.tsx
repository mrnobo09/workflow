import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { apiErrorMessage } from "../api/client.ts";
import { AuthShell } from "../components/AuthShell.tsx";
import { Field, FormError } from "../components/Field.tsx";
import { useUser } from "../context/UserContext.tsx";
import { input, linkButton, primaryButton } from "../lib/styles.ts";

export function SignupPage() {
  const { signup } = useUser();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await signup({ companyName, name, email, password });
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not create the account"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Create your company"
      subtitle="You'll be the manager. Add requesters and workers from your dashboard."
      footer={<>Already have an account? <Link to="/login" className={linkButton}>Sign in</Link></>}
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label="Company name">
          <input className={input} autoComplete="organization" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
        </Field>
        <Field label="Your name">
          <input className={input} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Work email">
          <input className={input} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <input
            className={input}
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <FormError message={error} />
        <button className={`${primaryButton} mt-2 w-full py-2.5`} type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create company"}
        </button>
      </form>
    </AuthShell>
  );
}
