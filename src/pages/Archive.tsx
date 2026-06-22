import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useLanguage, useT } from "../contexts/LanguageContext";
import { loadArchiveState } from "../services/dailyState";
import { getTodayKey } from "../services/dailyState";

const FREE_DAYS = 3;
const TOTAL_DAYS = 7;

function getPastDates(count: number): string[] {
  const dates: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    );
  }
  return dates;
}

export default function Archive() {
  const t = useT();
  const { lang } = useLanguage();

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(t.archive.dateLocale, {
        weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
      }),
    [t.archive.dateLocale]
  );

  const today = getTodayKey();
  const dates = useMemo(() => getPastDates(TOTAL_DAYS), [today]);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">{t.archive.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.archive.subtitle}</p>
      </div>

      <ul className="space-y-3">
        {dates.map((dateStr, idx) => {
          const isFree = idx < FREE_DAYS;
          const saved = isFree ? loadArchiveState(lang, dateStr) : null;
          const played = saved?.completed ?? false;
          const score = played
            ? Math.max(...(saved!.attempts.map(a => a.total)))
            : null;
          const best = played ? saved!.bestPossibleScore : null;

          return (
            <li key={dateStr}>
              <div
                className={[
                  "flex items-center gap-4 rounded-xl border p-4 transition-colors",
                  isFree
                    ? "border-line bg-surface"
                    : "border-line/40 bg-surface/40 opacity-60",
                ].join(" ")}
              >
                {/* Date */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold capitalize ${isFree ? "text-fg" : "text-muted"}`}>
                    {dateFmt.format(new Date(dateStr + "T00:00:00Z"))}
                  </p>
                  {played && score !== null && best !== null && best > 0 && (
                    <p className="mt-0.5 text-xs text-muted">
                      {score} / {best} pts —{" "}
                      <span className={score >= best ? "text-success" : ""}>
                        {Math.round((score / best) * 100)}%
                      </span>
                    </p>
                  )}
                </div>

                {/* Badge + CTA */}
                <div className="flex items-center gap-2 shrink-0">
                  {isFree ? (
                    <>
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {t.archive.freeBadge}
                      </span>
                      <Link
                        to={`/archive/${dateStr}`}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                      >
                        {played ? t.archive.replayCta : t.archive.playCta}
                      </Link>
                    </>
                  ) : (
                    <span className="rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted">
                      {t.archive.iapBadge}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-center text-xs text-muted">{t.archive.iapDesc}</p>
    </div>
  );
}
