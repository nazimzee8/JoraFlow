// /backend/services/AgentOrchestrator.ts
import * as fs from 'node:fs';
import * as path from 'node:path';

export type SkillMeta = {
  name: string;
  description: string;
  version?: string;
};

export type SkillDefinition = {
  name: string;
  description: string;
  instructions: string;
  sourcePath: string;
  toolDefinition: {
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: {
        type: 'object';
        properties: {
          task_input: { type: 'string' };
        };
        required: ['task_input'];
      };
    };
  };
};

export type SkillLoadResult = {
  skills: SkillDefinition[];
  warnings: string[];
  errors: string[];
};

export type OrchestratorSelection = {
  primary: SkillDefinition | null;
  secondary: SkillDefinition[];
  rationale: string;
};

export type LlmCallInput = {
  systemPrompt: string;
  userInput: string;
};

export type LlmCaller = (input: LlmCallInput) => Promise<unknown>;

export type GeminiCaller = (input: {
  systemInstruction: string;
  contents: Array<{ role: 'user'; parts: Array<{ text: string }> }>;
}) => Promise<unknown>;

export const ORCHESTRATOR_SYSTEM_PROMPT = `You are the JoraFlow Orchestrator. Your job is to select the most relevant skill(s) for each request and route the task accordingly.

Rules of Engagement:
1. Determine the user’s intent and which application area it affects.
2. If a request maps to a specific skill, use that skill first.
3. If multiple skills apply, pick the primary skill, then optionally consult secondary skills.
4. If no skill fits, answer normally without invoking a skill.
5. Always prioritize security and privacy requirements.

Skill Routing:
- job-parsing-engine: Use when parsing emails, extracting application status, company, title, dates, or building logic for inbox ingestion, classification, or ATS detection.
- design-system: Use when designing UI, styling, layouts, components, motion, or responsiveness for JoraFlow.
- security-guardrail: Use for any security, privacy, validation, auth, storage, or data-handling decisions. This skill can be invoked alongside any other skill as a safety check.

Output Guidance:
- If a skill is used, state which skill(s) were used.
- Keep answers concise and implementation-oriented.`;

export class SkillManager {
  private skills: SkillDefinition[] = [];

  constructor(private readonly skillsDir = path.join(__dirname, '../../skills')) {}

  loadSkills(): SkillLoadResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const skills: SkillDefinition[] = [];

    if (!fs.existsSync(this.skillsDir)) {
      return { skills: [], warnings: [], errors: [`Skills directory not found: ${this.skillsDir}`] };
    }

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(this.skillsDir, entry.name);

      try {
        let skillFilePath: string | null = null;

        if (entry.isDirectory()) {
          const candidate = path.join(entryPath, 'SKILL.md');
          if (fs.existsSync(candidate)) skillFilePath = candidate;
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          skillFilePath = entryPath;
        }

        if (!skillFilePath) continue;

        const content = fs.readFileSync(skillFilePath, 'utf8');
        const parsed = parseFrontmatter(content);

        if (!parsed) {
          warnings.push(`No frontmatter found in ${skillFilePath}`);
          continue;
        }

        const { meta, body } = parsed;
        const name = (meta.name || '').trim();
        const description = (meta.description || '').trim();

        if (!name || !description) {
          errors.push(`Missing name/description in ${skillFilePath}`);
          continue;
        }

        skills.push({
          name,
          description,
          instructions: body.trim(),
          sourcePath: skillFilePath,
          toolDefinition: {
            type: 'function',
            function: {
              name,
              description,
              parameters: {
                type: 'object',
                properties: { task_input: { type: 'string' } },
                required: ['task_input'],
              },
            },
          },
        });
      } catch (err) {
        errors.push(`Failed to load ${entryPath}: ${(err as Error).message}`);
      }
    }

    this.skills = skills;
    return { skills, warnings, errors };
  }

  getSkills(): SkillDefinition[] {
    return this.skills;
  }

  getToolDefinitions(): SkillDefinition['toolDefinition'][] {
    return this.skills.map(s => s.toolDefinition);
  }

  findBestSkillFor(userInput: string): OrchestratorSelection {
    const input = userInput.toLowerCase();

    const scored = this.skills.map(skill => {
      const haystack = `${skill.name} ${skill.description} ${skill.instructions}`.toLowerCase();
      let score = 0;

      if (input.includes(skill.name.toLowerCase())) score += 5;
      if (input.includes(skill.description.toLowerCase())) score += 3;

      const keywords = extractKeywords(haystack);
      for (const kw of keywords) {
        if (kw.length < 4) continue;
        if (input.includes(kw)) score += 1;
      }

      return { skill, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const primary = scored[0]?.score ? scored[0].skill : null;
    const secondary = scored
      .slice(1)
      .filter(s => s.score > 0)
      .map(s => s.skill);

    let rationale = 'No strong match; defaulting to general response.';
    if (primary) {
      rationale = `Selected ${primary.name} based on keyword overlap and skill description match.`;
    }

    // Always include security-guardrail as secondary if request mentions data, auth, or privacy.
    if (primary && primary.name !== 'security-guardrail') {
      if (/(auth|security|privacy|token|email|storage|database|rls|oauth)/i.test(userInput)) {
        const sec = this.skills.find(s => s.name === 'security-guardrail');
        if (sec && !secondary.includes(sec)) secondary.unshift(sec);
      }
    }

    return { primary, secondary, rationale };
  }

  buildSystemPrompt(selection: OrchestratorSelection): string {
    if (!selection.primary) return ORCHESTRATOR_SYSTEM_PROMPT;

    const secondaryBlock = selection.secondary.length
      ? `\nSECONDARY SKILLS:\n${selection.secondary
          .map(s => `- ${s.name}: ${s.description}`)
          .join('\n')}`
      : '';

    return `${ORCHESTRATOR_SYSTEM_PROMPT}

CURRENTLY ACTIVE SKILL: ${selection.primary.name}
SKILL INSTRUCTIONS:\n`;
  }

  async runAgenticWorkflow(
    userInput: string,
    llmCall: LlmCaller,
    rawEmailData?: string
  ): Promise<unknown> {
    if (!this.skills.length) this.loadSkills();

    const selection = this.findBestSkillFor(userInput);
    const systemPrompt = this.buildSystemPrompt(selection);
    const mergedInput = rawEmailData ? `${userInput}\n\n${rawEmailData}` : userInput;

    return llmCall({ systemPrompt, userInput: mergedInput });
  }

  async runWithGemini(
    userInput: string,
    geminiGenerate: GeminiCaller,
    rawEmailData?: string
  ): Promise<unknown> {
    if (!this.skills.length) this.loadSkills();

    const selection = this.findBestSkillFor(userInput);
    const systemPrompt = this.buildSystemPrompt(selection);
    const mergedInput = rawEmailData ? `${userInput}\n\n${rawEmailData}` : userInput;

    return geminiGenerate({
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text: mergedInput }] }],
    });
  }
}

// Minimal frontmatter parser that handles simple YAML key: value pairs.
// If you need full YAML support (arrays, nested objects), consider adding js-yaml.
function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) return null;

  const parts = trimmed.split('---');
  if (parts.length < 3) return null;

  const frontmatter = parts[1];
  const body = parts.slice(2).join('---');

  const meta: Record<string, string> = {};
  const lines = frontmatter.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2];
    value = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    meta[key] = value;
  }

  return { meta, body };
}

function extractKeywords(text: string): string[] {
  const words = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const stop = new Set([
    'the','and','for','with','this','that','from','when','use','your','into','will','only','also','have','should','must','then','than','been','are','not','any','all','job','skills','skill','email','data','system','design','security'
  ]);

  const uniq = new Set<string>();
  for (const w of words) {
    if (stop.has(w)) continue;
    if (w.length < 3) continue;
    uniq.add(w);
  }

  return Array.from(uniq).slice(0, 50);
}
function extractRequiredReferences(instructions: string): string[] {
  const lines = instructions.split(/\r?\n/);
  const reqIndex = lines.findIndex(l => l.trim().toLowerCase() === '## required references');
  if (reqIndex === -1) return [];

  const refs: string[] = [];
  for (let i = reqIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('-')) break;
    const match = line.match(/([^]+)/);
    if (match) refs.push(match[1]);
  }

  return refs;
}
