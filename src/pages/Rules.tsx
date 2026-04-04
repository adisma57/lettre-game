import { Link } from "react-router-dom";
import rulesData from "../content/rules.json";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { DrawDisplay } from "../components/game/DrawDisplay";
import { ROLE_CLASS_BY_STRING as ROLE_CLASS } from "../components/game/ColoredWord";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScoreItem = {
  label: string;
  points: string;
  description: string;
};

type Example = {
  draw: string[];
  word: string;
  score: number;
  note: string;
};

type ColorEntry = {
  role: string;
  label: string;
  description: string;
};

type GameMode = {
  name: string;
  route: string;
  description: string;
};

type Section = {
  id: string;
  title: string;
  body: string;
  formula?: string;
  items?: ScoreItem[];
  examples?: Example[];
  colors?: ColorEntry[];
  modes?: GameMode[];
};

type RulesConfig = {
  title: string;
  sections: Section[];
};

// ─── Sub-renderers ────────────────────────────────────────────────────────────

function Formula({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-lg bg-elevated px-4 py-3 font-mono text-sm text-primary">
      {text}
    </div>
  );
}

function ScoreItems({ items }: { items: ScoreItem[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-3">
          <Badge label={item.points} className="w-20 shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-fg">{item.label}</span>
            <span className="ml-2 text-muted">— {item.description}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Examples({ examples }: { examples: Example[] }) {
  return (
    <div className="mt-5 flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
        Exemples
      </h3>
      {examples.map((ex) => (
        <div key={ex.word} className="rounded-lg bg-elevated p-4">
          <div className="flex flex-wrap items-center gap-3">
            <DrawDisplay letters={ex.draw} size="sm" className="justify-start gap-1" />
            <span className="text-muted">→</span>
            <span className="font-mono text-lg font-bold text-fg">{ex.word}</span>
            <span className="ml-auto text-sm font-bold text-success">+{ex.score} pts</span>
          </div>
          <p className="mt-2 text-xs text-muted">{ex.note}</p>
        </div>
      ))}
    </div>
  );
}

function ColorLegend({ colors }: { colors: ColorEntry[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {colors.map((entry) => (
        <li key={entry.role} className="flex items-start gap-3 text-sm">
          <span className={`w-10 shrink-0 font-bold ${ROLE_CLASS[entry.role] ?? "text-fg"}`}>
            {entry.label}
          </span>
          <span className="text-muted">{entry.description}</span>
        </li>
      ))}
    </ul>
  );
}

function GameModes({ modes }: { modes: GameMode[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {modes.map((mode) => (
        <li key={mode.route}>
          <Link
            to={mode.route}
            className="group block rounded-lg border border-line bg-elevated p-4 transition-colors hover:border-primary"
          >
            <p className="text-sm font-semibold text-fg transition-colors group-hover:text-primary">
              {mode.name}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{mode.description}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const rules = rulesData as RulesConfig;

export default function Rules() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-fg">{rules.title}</h1>

      <div className="mt-8 flex flex-col gap-6">
        {rules.sections.map((section) => (
          <Card key={section.id}>
            <h2 className="text-lg font-semibold text-fg">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{section.body}</p>

            {section.formula  && <Formula      text={section.formula}      />}
            {section.items    && <ScoreItems   items={section.items}       />}
            {section.examples && <Examples     examples={section.examples} />}
            {section.colors   && <ColorLegend  colors={section.colors}     />}
            {section.modes    && <GameModes    modes={section.modes}       />}
          </Card>
        ))}
      </div>
    </div>
  );
}
