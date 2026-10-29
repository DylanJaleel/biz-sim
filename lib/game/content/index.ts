import type { Template } from "../templates";
import type { Startup } from "../types";
import { FAMILY_TEMPLATE_SCALE, FAMILY_THEME_SCALE, familyOutcome } from "../family";
import { CORPORATE_TEMPLATES } from "../corporate";
import { FINANCE_TEMPLATES } from "./finance";
import { GROWTH_TEMPLATES } from "./growth";
import { MORE_TEMPLATES } from "./more";
import { PEOPLE_TEMPLATES } from "./people";
import { THEME_TEMPLATES } from "./themes";

/** Board topics move a family business valued on EBITDA less than a startup (family.ts); the Mittelstand topics (m_) a little more. */
function forFamilies(t: Template): Template {
  if (t.corporate) return t;
  const scale = t.id.startsWith("m_") ? FAMILY_THEME_SCALE : FAMILY_TEMPLATE_SCALE;
  const outcomes = Object.fromEntries(
    Object.entries(t.outcomes).map(([vote, o]) => [vote, { ...o, resolve: (s: Startup) => familyOutcome(o.resolve(s), s, scale) }]),
  ) as Template["outcomes"];
  return { ...t, outcomes };
}

export const TEMPLATES: Template[] = [
  ...GROWTH_TEMPLATES,
  ...FINANCE_TEMPLATES,
  ...PEOPLE_TEMPLATES,
  ...MORE_TEMPLATES,
  ...THEME_TEMPLATES.filter((t) => t.id.startsWith("m_")),
  ...CORPORATE_TEMPLATES,
].map(forFamilies);

export function templateOf(id: string): Template {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown template ${id}`);
  return t;
}
