"use client";

// Real numbers from the sealer, read when the page opens. Small and honest beats big and invented.
import { useEffect, useState } from "react";
import { ANCHOR_ADDRESS, EXPLORER, txUrl } from "@/lib/chain";

interface Stats {
  seals: number;
  piecesSealed: number;
  latest: { tx: string; block: number; at: string } | null;
}

export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats, () => {});
  }, []);

  const ago = stats?.latest?.at ? since(new Date(stats.latest.at)) : null;
  return (
    <div className="grid gap-px overflow-hidden rounded-[24px] bg-plum-line sm:grid-cols-3">
      <Stat value={stats ? stats.piecesSealed.toLocaleString("en-IN") : "·"} label="evidence pieces sealed on Polygon" />
      <Stat value={stats ? stats.seals.toLocaleString("en-IN") : "·"} label="Merkle roots anchored on-chain" />
      <Stat
        value={ago ?? "·"}
        label={
          stats?.latest ? (
            <>
              since the last seal,{" "}
              <a href={txUrl(stats.latest.tx)} target="_blank" rel="noreferrer" className="text-rani-bright underline underline-offset-2">
                block {stats.latest.block}
              </a>
            </>
          ) : (
            "since the last seal"
          )
        }
      />
      <p className="bg-plum px-7 py-4 text-[13px] text-on-dark-muted sm:col-span-3">
        Live from the{" "}
        <a href={`${EXPLORER}/address/${ANCHOR_ADDRESS}`} target="_blank" rel="noreferrer" className="text-on-dark underline underline-offset-2">
          EvidenceAnchor contract
        </a>{" "}
        on Polygon Amoy, Polygon’s public test network.
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: React.ReactNode }) {
  return (
    <div className="bg-plum px-7 py-8">
      <p className="font-display text-[56px] leading-none text-white">{value}</p>
      <p className="mt-3 text-[14px] leading-snug text-on-dark-muted">{label}</p>
    </div>
  );
}

function since(d: Date): string {
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;
}
