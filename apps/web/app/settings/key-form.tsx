"use client";

import { useState } from "react";

interface Status {
  name: string;
  isSet: boolean;
  last4: string | null;
  source: "db" | "env" | "none";
}

export function KeyForm({ status, meta }: { status: Status; meta: { label: string; hint: string } }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<Status>(status);

  async function save(clear = false) {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: state.name, value: clear ? "" : value }),
    });
    setSaving(false);
    if (res.ok) {
      setValue("");
      setState((s) => ({
        ...s,
        isSet: !clear,
        last4: clear ? null : value.slice(-4),
        source: clear ? "none" : "db",
      }));
    }
  }

  const badge =
    state.source === "db"
      ? "salva no banco"
      : state.source === "env"
        ? "via .env"
        : "não configurada";

  return (
    <div className="rounded-lg border border-neutral-800 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{meta.label}</div>
          <div className="text-xs text-neutral-500">{meta.hint}</div>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-xs ${
            state.isSet ? "bg-emerald-900 text-emerald-300" : "bg-neutral-800 text-neutral-400"
          }`}
        >
          {state.isSet ? `${badge} ••••${state.last4 ?? ""}` : badge}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={state.isSet ? "substituir chave…" : "colar chave…"}
          className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => save(false)}
          disabled={saving || !value}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          Salvar
        </button>
        {state.source === "db" && (
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
