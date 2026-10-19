import type { Template } from "../templates";
import { CORPORATE_TEMPLATES } from "../corporate";
import { FINANCE_TEMPLATES } from "./finance";
import { GROWTH_TEMPLATES } from "./growth";
import { MORE_TEMPLATES } from "./more";
import { PEOPLE_TEMPLATES } from "./people";

export const TEMPLATES: Template[] = [...GROWTH_TEMPLATES, ...FINANCE_TEMPLATES, ...PEOPLE_TEMPLATES, ...MORE_TEMPLATES, ...CORPORATE_TEMPLATES];

export function templateOf(id: string): Template {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown template ${id}`);
  return t;
}
