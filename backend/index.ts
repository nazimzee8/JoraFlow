// /backend/index.ts
import { SkillManager } from './services/AgentOrchestrator';

function main() {
  const manager = new SkillManager();
  const { skills, warnings, errors } = manager.loadSkills();

  console.log(`Loaded ${skills.length} skill(s).`);
  for (const skill of skills) {
    console.log(`- ${skill.name}: ${skill.description}`);
  }

  if (warnings.length) {
    console.warn(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.warn(`- ${w}`);
  }

  if (errors.length) {
    console.error(`\nErrors (${errors.length}):`);
    for (const e of errors) console.error(`- ${e}`);
    process.exitCode = 1;
  }
}

main();
