import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { AccountType } from "../api/auth.ts";
import { apiErrorMessage } from "../api/client.ts";
import type { Specialty } from "../api/specialties.ts";
import { addTeamMember, listTeam, removeTeamMember, type Member, type NewMember } from "../api/team.ts";
import { Field, FormError } from "../components/Field.tsx";
import { Tabs } from "../components/JobCard.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { useSpecialties } from "../context/SpecialtyContext.tsx";
import { useUser } from "../context/UserContext.tsx";
import { initials, roleLabel } from "../lib/format.ts";
import { card, input, primaryButton } from "../lib/styles.ts";

type RoleFilter = "all" | AccountType;
type NewRole = "user" | "worker";

const roleStyle: Record<AccountType, string> = {
  manager: "bg-violet-50 text-violet-700 ring-violet-200",
  worker: "bg-sky-50 text-sky-700 ring-sky-200",
  user: "bg-slate-100 text-slate-700 ring-slate-200",
};

function AddMemberForm({ onAdded }: { onAdded: (member: Member) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<NewRole>("worker");
  const { specialties } = useSpecialties();
  const [specialty, setSpecialty] = useState<Specialty>("");
  const selected = specialties.find((option) => option.value === specialty);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setPending(true);
    const payload: NewMember = role === "worker"
      ? { name, email, accountType: "worker", specialty }
      : { name, email, accountType: "user" };
    try {
      const member = await addTeamMember(payload);
      onAdded(member);
      setNotice(`Login details were emailed to ${member.email}.`);
      setName("");
      setEmail("");
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not add this person"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${card} grid gap-4 p-5 sm:p-6`}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">Add a person</h2>
        <p className="mt-1 text-sm text-slate-500">We'll email them a password to sign in.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["worker", "user"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRole(value)}
            className={`rounded-lg border px-3 py-2.5 text-left transition ${
              role === value
                ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="block text-sm font-medium text-slate-900">{roleLabel[value]}</span>
            <span className="block text-xs text-slate-500">
              {value === "worker" ? "Does the jobs" : "Records voice notes"}
            </span>
          </button>
        ))}
      </div>

      <Field label="Full name">
        <input className={input} value={name} onChange={(event) => setName(event.target.value)} required />
      </Field>
      <Field label="Email">
        <input className={input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </Field>

      {role === "worker" ? (
        <Field label="Specialty" hint={selected ? `Gets jobs for ${selected.covers}.` : undefined}>
          <select
            className={input}
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            required
          >
            <option value="" disabled>Choose a specialty</option>
            {specialties.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
      ) : null}

      <FormError message={error} />
      {notice ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">{notice}</p>
      ) : null}
      <button className={`${primaryButton} w-full py-2.5`} type="submit" disabled={pending}>
        {pending ? "Adding…" : `Add ${roleLabel[role].toLowerCase()}`}
      </button>
    </form>
  );
}

export function TeamPage() {
  const { user } = useUser();
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    listTeam()
      .then(setMembers)
      .catch((caught: unknown) => setError(apiErrorMessage(caught, "Could not load your team")))
      .finally(() => setLoaded(true));
  }, []);

  const counts = useMemo(() => {
    const result: Record<RoleFilter, number> = { all: members.length, manager: 0, worker: 0, user: 0 };
    for (const member of members) result[member.accountType] += 1;
    return result;
  }, [members]);

  const visible = filter === "all" ? members : members.filter((member) => member.accountType === filter);
  const { label: specialtyLabel } = useSpecialties();

  async function removeMember(member: Member) {
    if (!window.confirm(`Remove ${member.name} from this organization?`)) return;
    setError("");
    setRemovingId(member.id);
    try {
      await removeTeamMember(member.id);
      setMembers((current) => current.filter((entry) => entry.id !== member.id));
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not remove this person"));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title="Team" subtitle={`Everyone who can sign in to ${user?.companyName ?? "your company"}.`} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="lg:sticky lg:top-24 lg:order-2">
          <AddMemberForm onAdded={(member) => setMembers((current) => [...current, member])} />
        </div>

        <section className="grid grid-cols-1 gap-4">
          <Tabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "worker", label: "Workers", count: counts.worker },
              { value: "user", label: "Requesters", count: counts.user },
              { value: "manager", label: "Managers", count: counts.manager },
            ]}
          />

          <FormError message={error} />
          {!loaded ? (
            <div className={`${card} h-48 animate-pulse bg-slate-100/60`} />
          ) : (
            <ul className={`${card} divide-y divide-slate-100 overflow-hidden`}>
              {visible.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-slate-500">Nobody here yet.</li>
              ) : null}
              {visible.map((member) => (
                <li key={member.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    {initials(member.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {member.name}
                      {member.id === user?.id ? <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span> : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">{member.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                    {member.specialty ? (
                      <span className="text-xs text-slate-500">{specialtyLabel(member.specialty)}</span>
                    ) : null}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${roleStyle[member.accountType]}`}>
                      {roleLabel[member.accountType]}
                    </span>
                    {member.accountType !== "manager" ? (
                      <button
                        type="button"
                        onClick={() => void removeMember(member)}
                        disabled={removingId === member.id}
                        className="text-xs font-medium text-rose-700 hover:text-rose-900 disabled:cursor-wait disabled:opacity-50"
                      >
                        {removingId === member.id ? "Removing…" : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
