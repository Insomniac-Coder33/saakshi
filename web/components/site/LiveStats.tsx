"use client";

// Real numbers from the sealer, read when the page opens. Small and honest beats big and invented.
import { useEffect, useState } from "react";
import { ANCHOR_ADDRESS, EXPLORER, txUrl } from "@/lib/chain";

interface Stats {
  seals: number;
  piecesSealed: number;
  medianSealSeconds: number | null;
  latest: { tx: string; block: number; at: string } | null;
  activity?: { from: string; hours: number[] };
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
      {stats?.activity && <Activity from={stats.activity.from} hours={stats.activity.hours} />}
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

const IST = "Asia/Kolkata";
const LEVEL = ["bg-white/[0.06]", "bg-rani-bright/25", "bg-rani-bright/45", "bg-rani-bright/70", "bg-rani-bright"];
const level = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 7 ? 2 : n <= 20 ? 3 : 4);

/** The last two weeks, one square per hour: the real seals, not a picture of them. */
function Activity({ from, hours }: { from: string; hours: number[] }) {
  const start = Date.parse(from);
  const days = Array.from({ length: hours.length / 24 }, (_, d) => hours.slice(d * 24, d * 24 + 24));
  const day = (d: number) => new Date(start + d * 86_400_000).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST });
  const hourName = (h: number) => (h === 0 ? "12 am" : h < 12 ? `${h} am` : h === 12 ? "12 pm" : `${h - 12} pm`);
  const total = hours.reduce((a, b) => a + b, 0);
  return (
    <figure className="mt-14 grid gap-8 border-t border-white/15 pt-8 sm:col-span-3 lg:grid-cols-[1fr_minmax(0,600px)] lg:gap-16">
      <figcaption>
        <p className="label text-on-dark-muted!">Seals, hour by hour</p>
        <p className="mt-4 max-w-[22rem] text-[15px] leading-[1.55] text-on-dark">
          {total.toLocaleString("en-IN")} pieces sealed in the last {days.length} days. Each square is an hour, by Indian time; the brighter it is, the more was
          sealed in it.
        </p>
        <div aria-hidden className="mt-6 flex items-center gap-1.5 text-[11px] text-on-dark-muted">
          <span className="mr-1">Fewer</span>
          {LEVEL.map((c) => (
            <i key={c} className={`size-2.5 rounded-[2px] ${c}`} />
          ))}
          <span className="ml-1">More</span>
        </div>
      </figcaption>
      <div className="grid grid-cols-[3.25rem_1fr] gap-x-3">
        <span />
        <div aria-hidden className="grid grid-cols-4 pb-1 text-[11px] text-on-dark-muted">
          {[0, 6, 12, 18].map((h) => (
            <span key={h}>{hourName(h)}</span>
          ))}
        </div>
        {days.map((row, d) => (
          <div key={d} className="contents">
            <span className="self-center text-[11px] leading-none text-on-dark-muted">{(days.length - 1 - d) % 2 === 0 ? day(d) : ""}</span>
            <div className="mt-[3px] grid grid-cols-24 gap-[3px]">
              {row.map((n, h) => (
                <i
                  key={h}
                  title={`${day(d)}, ${hourName(h)}: ${n} ${n === 1 ? "piece" : "pieces"} sealed`}
                  className={`aspect-square rounded-[2px] ${LEVEL[level(n)]}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </figure>
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
