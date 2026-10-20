import type { Template } from "../templates";
import { CORPORATE_TEMPLATES } from "../corporate";
import { FINANCE_TEMPLATES } from "./finance";
import { GROWTH_TEMPLATES } from "./growth";
import { MORE_TEMPLATES } from "./more";
import { PEOPLE_TEMPLATES } from "./people";
import { THEME_TEMPLATES } from "./themes";

export const TEMPLATES: Template[] = [...GROWTH_TEMPLATES, ...FINANCE_TEMPLATES, ...PEOPLE_TEMPLATES, ...MORE_TEMPLATES, ...THEME_TEMPLATES.filter((t) => t.id.startsWith("m_")), ...CORPORATE_TEMPLATES];

export function templateOf(id: string): Template {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown template ${id}`);
  return t;
}
