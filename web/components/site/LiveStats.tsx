"use client";

// Real numbers from the sealer, read when the page opens. Small and honest beats big and invented.
import { useEffect, useState } from "react";
import { ANCHOR_ADDRESS, EXPLORER, txUrl } from "@/lib/chain";

interface Stats {
  seals: number;
  piecesSealed: number;
  medianSealSeconds: number | null;
  latest: { tx: string; block: number; at: string } | null;
}

export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats, () => {});
  }, []);

  const wait = stats?.medianSealSeconds != null ? duration(stats.medianSealSeconds) : null;
  const last = stats?.latest?.at
    ? new Date(stats.latest.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })
    : null;
  return (
    <div className="grid gap-x-10 sm:grid-cols-3">
      <Stat value={stats ? stats.piecesSealed.toLocaleString("en-IN") : "·"} label="evidence pieces sealed on Polygon" />
      <Stat value={stats ? stats.seals.toLocaleString("en-IN") : "·"} label="Merkle roots anchored on-chain" />
      {/* The wait needs pieces that are still stored; erased accounts take theirs with them. Until then, the latest seal's date. */}
      <Stat
        value={wait ?? last ?? "·"}
        label={
          stats?.latest ? (
            <>
              {wait ? `typical wait from upload to seal. Latest seal ${last}, ` : "latest seal, "}
              <a href={txUrl(stats.latest.tx)} target="_blank" rel="noreferrer" className="text-rani-bright underline underline-offset-2">
                block {stats.latest.block}
              </a>
            </>
          ) : (
            "latest seal"
          )
        }
      />
      <p className="mt-8 text-[13px] text-on-dark-muted sm:col-span-3">
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
    <div className="border-t border-white/15 pb-2 pt-7 max-sm:mb-6">
      <p className="font-display text-[56px] leading-none text-white">{value}</p>
      <p className="mt-3 text-[14px] leading-snug text-on-dark-muted">{label}</p>
    </div>
  );
}

function duration(s: number): string {
  return s < 90 ? `${s} s` : `${Math.round(s / 60)} min`;
}
