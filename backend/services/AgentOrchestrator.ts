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

export type RateLimiter = {
  allow: (userId: string) => Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
};

export type SecurityContext = {
  userId?: string;
  ip?: string;
  headers?: Record<string, string | undefined>;
  requireWafHeaders?: boolean;
  rateLimiter?: RateLimiter;
  onPromptInjection?: (info: { userId?: string; ip?: string; reason: string }) => Promise<void>;
};

export type GeminiCaller = (input: {
  systemInstruction: string;
  contents: Array<{ role: 'user'; parts: Array<{ text: string }> }>;
}) => Promise<unknown>;

export const ORCHESTRATOR_SYSTEM_PROMPT = `You are the JoraFlow Orchestrator. Your job is to select the most relevant skill(s) for each request and route the task accordingly.

Rules of Engagement:
1. Determine the user's intent and which application area it affects.
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
  private knowledgePlanCache: string | null = null;

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

  refreshKnowledgePlan(): void {
    this.knowledgePlanCache = null;
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

    if (primary && primary.name !== 'security-guardrail') {
      if (/(auth|security|privacy|token|email|storage|database|rls|oauth|frontend|ui|lovable)/i.test(userInput)) {
        const sec = this.skills.find(s => s.name === 'security-guardrail');
        if (sec && !secondary.includes(sec)) secondary.unshift(sec);
      }
    }

    return { primary, secondary, rationale };
  }

  loadKnowledgePlan(): string {
    if (this.knowledgePlanCache !== null) return this.knowledgePlanCache;
    const planPath = path.join(__dirname, '../../docs/KNOWLEDGE_PLAN.md');
    if (!fs.existsSync(planPath)) {
      this.knowledgePlanCache = '';
      return this.knowledgePlanCache;
    }
    const content = fs.readFileSync(planPath, 'utf8');
    this.knowledgePlanCache = `\n\n[KNOWLEDGE PLAN]\n${content}`;
    return this.knowledgePlanCache;
  }

  loadRequiredReferences(skill: SkillDefinition): string {
    const required = extractRequiredReferences(skill.instructions);
    if (!required.length) return '';

    const baseDir = path.dirname(skill.sourcePath);
    const loaded: string[] = [];
    for (const rel of required) {
      const full = path.join(baseDir, rel);
      if (fs.existsSync(full)) {
        loaded.push(`\n\n[REFERENCE: ${rel}]\n${fs.readFileSync(full, 'utf8')}`);
      }
    }

    return loaded.join('');
  }

  buildSystemPrompt(selection: OrchestratorSelection): string {
    if (!selection.primary) return ORCHESTRATOR_SYSTEM_PROMPT;

    const secondaryBlock = selection.secondary.length
      ? `\nSECONDARY SKILLS:\n${selection.secondary
          .map(s => `- ${s.name}: ${s.description}`)
          .join('\n')}`
      : '';

    const plan = this.loadKnowledgePlan();
    const refs = this.loadRequiredReferences(selection.primary);

    return `${ORCHESTRATOR_SYSTEM_PROMPT}\n\nCURRENTLY ACTIVE SKILL: ${selection.primary.name}\nSKILL INSTRUCTIONS:\n${selection.primary.instructions}${secondaryBlock}${plan}${refs}`;
  }

  async runAgenticWorkflow(
    userInput: string,
    llmCall: LlmCaller,
    rawEmailData?: string,
    security?: SecurityContext
  ): Promise<unknown> {
    if (!this.skills.length) this.loadSkills();

    await enforceSecurity(userInput, security);

    const selection = this.findBestSkillFor(userInput);
    const systemPrompt = this.buildSystemPrompt(selection);
    const mergedInput = rawEmailData ? `${userInput}\n\n${rawEmailData}` : userInput;

    return llmCall({ systemPrompt, userInput: mergedInput });
  }

  async runWithGemini(
    userInput: string,
    geminiGenerate: GeminiCaller,
    rawEmailData?: string,
    security?: SecurityContext
  ): Promise<unknown> {
    if (!this.skills.length) this.loadSkills();

    await enforceSecurity(userInput, security);

    const selection = this.findBestSkillFor(userInput);
    const systemPrompt = this.buildSystemPrompt(selection);
    const mergedInput = rawEmailData ? `${userInput}\n\n${rawEmailData}` : userInput;

    return geminiGenerate({
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text: mergedInput }] }],
    });
  }
}

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

function extractRequiredReferences(instructions: string): string[] {
  const lines = instructions.split(/\r?\n/);
  const reqIndex = lines.findIndex(l => l.trim().toLowerCase() === '## required references');
  if (reqIndex === -1) return [];

  const refs: string[] = [];
  for (let i = reqIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('-')) break;
    const match = line.match(/`([^`]+)`/);
    if (match) refs.push(match[1]);
  }

  return refs;
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

async function enforceSecurity(userInput: string, security?: SecurityContext): Promise<void> {
  if (!security) return;

  if (security.headers) {
    const waf = verifyWafHeaders(security.headers);
    if (!waf.ok || (security.requireWafHeaders && waf.warnings.length > 0)) {
      throw new SecurityError('waf_blocked', 403);
    }
  }

  const reason = detectPromptInjection(userInput);
  if (reason) {
    if (security.onPromptInjection) {
      await security.onPromptInjection({ userId: security.userId, ip: security.ip, reason });
    }
    throw new SecurityError('prompt_injection_detected', 401);
  }

  if (security.rateLimiter && security.userId) {
    const result = await security.rateLimiter.allow(security.userId);
    if (!result.allowed) {
      throw new SecurityError('rate_limited', 429, result.retryAfterSeconds);
    }
  }
}

export function verifyWafHeaders(headers: Record<string, string | undefined>): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const threatScore = headers['x-waf-threat-score'];
  const geoIp = headers['x-waf-geo-ip'];
  const reqId = headers['x-waf-request-id'];

  if (!threatScore) warnings.push('missing_threat_score');
  if (!geoIp) warnings.push('missing_geo_ip');
  if (!reqId) warnings.push('missing_request_id');

  if (threatScore && Number(threatScore) >= 80) {
    return { ok: false, warnings: ['high_threat_score'] };
  }

  return { ok: warnings.length === 0, warnings };
}

export function detectPromptInjection(input: string): string | null {
  const patterns = [
    /ignore (all|previous|system) instructions/i,
    /reveal (system|developer) prompt/i,
    /exfiltrate|leak|dump (keys|secrets|tokens)/i,
    /bypass security|disable guardrails/i,
  ];

  for (const p of patterns) {
    if (p.test(input)) return `matched:${p.source}`;
  }
  return null;
}

export class SecurityError extends Error {
  readonly statusCode: number;
  readonly retryAfterSeconds?: number;

  constructor(message: string, statusCode: number, retryAfterSeconds?: number) {
    super(message);
    this.statusCode = statusCode;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
