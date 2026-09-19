"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mx-auto mt-24 max-w-sm space-y-4 rounded-3xl bg-white p-8 shadow">
      <h1 className="text-2xl font-black">Admin 2TIJEN</h1>
      <div>
        <label htmlFor="pw" className="mb-1 block text-sm font-bold">Mot de passe</label>
        <input id="pw" name="password" type="password" required autoComplete="current-password" className="w-full rounded-2xl border-2 border-ink/20 px-4 py-3" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">{pending ? "Connexion…" : "Se connecter"}</button>
      {state?.error && <p role="alert" className="font-bold text-orange">{state.error}</p>}
    </form>
  );
}
