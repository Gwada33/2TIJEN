"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mx-auto mt-24 max-w-sm space-y-4 rounded-3xl border border-line bg-surface p-8">
      <h1 className="font-heavy text-2xl font-normal">Admin 2TIJEN</h1>
      <div>
        <label htmlFor="pw" className="mb-1 block text-sm font-bold">Mot de passe</label>
        <input id="pw" name="password" type="password" required autoComplete="current-password" className="w-full rounded-2xl border-2 border-line bg-night px-4 py-3 text-ink focus:border-sun focus:outline-none" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">{pending ? "Connexion…" : "Se connecter"}</button>
      {state?.error && <p role="alert" className="font-bold text-orange">{state.error}</p>}
    </form>
  );
}
