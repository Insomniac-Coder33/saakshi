// The showcase opens the way Kumartuli finishes the goddess: her eyes are painted last (chokkhu daan),
// and that is when she comes alive. The bindi is pressed on, the third eye opens, and only then does the
// hero's promise appear (see `opening` in globals.css). It plays once, on load, and then holds still.
export function OpeningEye({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-100 -100 200 200" aria-hidden className={`opening-eye overflow-visible ${className}`}>
      <circle className="halo" r="100" />
      <circle className="disc" r="100" />
      <path className="lid" d="M 0 -60 A 80.17 80.17 0 0 1 0 60 A 80.17 80.17 0 0 1 0 -60 Z" />
      <circle className="pupil" r="13" />
    </svg>
  );
}
