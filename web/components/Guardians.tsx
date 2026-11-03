"use client";

// Settings → Guardians: invite someone on Telegram, see who is linked, send a test, remove.
import { useCallback, useEffect, useState } from "react";
import { inviteGuardian, inviteLink, listGuardians, removeGuardian, sendAlert, type Guardian } from "@/lib/guardians";
import { t, type StringKey } from "@/lib/i18n";
import type { Language } from "@/lib/local";
import { Button } from "./ui";
import { LOCALE } from "./Vault";

export function Guardians({ lang }: { lang: Language }) {
  const tr = (k: StringKey, v?: Record<string, string | number>) => t(lang, k, v);
  const [list, setList] = useState<Guardian[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [tested, setTested] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  // Offline, keep whatever list we had, and say so instead of showing "no guardians".
  const refresh = useCallback(
    () =>
      listGuardians().then(
        (l) => {
          setList(l);
          setOffline(false);
        },
        () => {
          setList((l) => l ?? []);
          setOffline(true);
        },
      ),
    [],
  );
  const attempt = (fn: () => Promise<unknown>) => fn().then(refresh, () => setOffline(true));
  useEffect(() => {
    refresh();
  }, [refresh]);

  // While an invite is waiting, check every few seconds for them tapping Start.
  const waiting = list?.some((g) => !g.linkedAt);
  useEffect(() => {
    if (!waiting) return;
    const id = window.setInterval(refresh, 4000);
    return () => window.clearInterval(id);
  }, [waiting, refresh]);

  async function share(g: Guardian) {
    const url = inviteLink(g.token);
    try {
      if (navigator.share) return await navigator.share({ text: `${tr("guardianShareText")} ${url}` });
      await navigator.clipboard.writeText(url);
      setCopied(g.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // She closed the share sheet.
    }
  }

  const linked = list?.filter((g) => g.linkedAt) ?? [];
  const pending = list?.filter((g) => !g.linkedAt) ?? [];

  return (
    <section className="mt-8" lang={lang}>
      <p className="label">{tr("guardians")}</p>
      <p className="mt-2 text-body-sm leading-relaxed text-muted">{tr("guardiansBody")}</p>
      {list === null ? (
        <div className="mt-4 h-16 animate-pulse rounded-card bg-blush" />
      ) : (
        <ul className="mt-3 border-t border-hairline">
          {linked.length === 0 && pending.length === 0 && !offline && <li className="py-4 text-body-sm text-muted">{tr("guardianNone")}</li>}
          {linked.map((g) => (
            <li key={g.id} className="flex items-center gap-3 border-b border-hairline py-3.5">
              <span className="flex size-10 items-center justify-center rounded-full bg-blush font-display text-[20px] text-rani">
                {(g.name ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1">
                <span className="block text-body">{g.name ?? "—"}</span>
                <span className="block text-caption text-muted">
                  {tr("guardianLinked", { date: new Date(g.linkedAt!).toLocaleDateString(LOCALE[lang], { day: "numeric", month: "short" }) })}
                </span>
              </span>
              <button type="button" onClick={() => void attempt(() => removeGuardian(g.id))} className="h-11 px-2 text-caption text-rani">
                {tr("guardianRemove")}
              </button>
            </li>
          ))}
          {pending.map((g) => (
            <li key={g.id} className="border-b border-hairline py-4">
              <p className="text-body-sm leading-relaxed">{tr("guardianInvite")}</p>
              <p className="mt-2 break-all rounded-xl bg-blush px-3 py-2 font-mono text-caption">{inviteLink(g.token)}</p>
              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2.5">
                <Button onClick={() => void share(g)}>{copied === g.id ? tr("linkCopied") : tr("guardianShare")}</Button>
                <Button variant="ghost" onClick={() => void attempt(() => removeGuardian(g.id))}>
                  {tr("cancel")}
                </Button>
              </div>
              <p className="mt-3 flex items-center gap-2 text-caption text-muted">
                <i className="size-2 animate-pulse rounded-full bg-rani" />
                {tr("guardianWaiting")}
              </p>
            </li>
          ))}
        </ul>
      )}
      {offline && (
        <p role="alert" className="mt-3 text-body-sm text-rani">
          {tr("offline")}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2.5">
        {pending.length === 0 && (
          <Button
            variant="ghost"
            disabled={busy || list === null}
            onClick={async () => {
              setBusy(true);
              await attempt(inviteGuardian);
              setBusy(false);
            }}
          >
            {tr("guardianAdd")}
          </Button>
        )}
        {linked.length > 0 && (
          <Button
            variant="ghost"
            disabled={tested}
            onClick={async () => {
              if (await sendAlert("test")) setTested(true);
              else setOffline(true);
            }}
          >
            {tested ? tr("guardianTestSent") : tr("guardianTest")}
          </Button>
        )}
      </div>
    </section>
  );
}
