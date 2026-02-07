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
    return this.knowledgePlanCache;\n  }\n\n  loadIntegrationGuide(): string {\n    const guidePath = path.join(__dirname, '../../docs/TECHNICAL_INTEGRATION_GUIDE.md');\n    if (!fs.existsSync(guidePath)) return '';\n    const content = fs.readFileSync(guidePath, 'utf8');\n    return \n\n[TECHNICAL INTEGRATION GUIDE]\n# JoraFlow Technical Integration Guide

This guide keeps Lovable (frontend) and Codex (backend) aligned on data contracts, API behavior, security, and deployment constraints for the Day 4 demo.

## 0. Stack Decisions (Current)
- **Backend runtime:** Supabase Edge Functions (Deno)
- **Database:** Supabase Postgres
- **API style:** Supabase Edge Function endpoints (e.g., `supabase.functions.invoke('parse-inbox')`)
- **Frontend data flow:** Supabase Realtime subscriptions
- **LLM provider:** Gemini 3 Pro (single provider)

## 1. Source-of-Truth Data Model
The backend is the source of truth. The frontend must match these fields exactly.

### Table: `applications`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "company": "string",
  "role": "string",
  "status": "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | "UNKNOWN",
  "confidence_score": 0.0,
  "last_sync": "timestamp",
  "source_provider": "string",
  "source_email_id": "string|null"
}
```

### Table: `status_history`
Tracks transitions for Sankey/funnel flow.

```json
{
  "id": "uuid",
  "application_id": "uuid",
  "from_status": "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | "UNKNOWN",
  "to_status": "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | "UNKNOWN",
  "changed_at": "timestamp",
  "source": "email" | "manual" | "import"
}
```

### Table: `sync_logs`
Tracks parsing state for realtime UI.

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "status": "idle" | "parsing" | "done" | "error",
  "progress": 0,
  "last_sync": "timestamp",
  "message": "string|null"
}
```

**Frontend rule:** TypeScript types must match these names and enums exactly.

## 2. API Contracts (Edge Functions)
### Parse Inbox
- **Endpoint:** Supabase Edge Function `parse-inbox`
- **Invocation:** `supabase.functions.invoke('parse-inbox')`
- **Auth:** Supabase JWT required
- **Purpose:** Trigger agentic parsing and job status extraction

Request body:
```json
{
  "user_id": "uuid",
  "days": 90
}
```

Response:
```json
{
  "queued": true,
  "job_count_estimate": 120
}
```

### Sync Status (Fallback)
- **Endpoint:** Edge Function `sync-status`
- **Purpose:** Polling fallback if realtime is unavailable

Response:
```json
{
  "status": "idle" | "parsing" | "done" | "error",
  "last_sync": "timestamp"
}
```

## 3. Realtime UX Sync (Lovable)
Parsing is async. Frontend should reflect backend status.

- Backend writes to `sync_logs` as it processes.
- Frontend subscribes to `sync_logs` (realtime) to update UI instantly.
- UI shows a Parsing Status component with loading state until `done`.

## 4. Security & Privacy Guardrails
Enforce in backend implementation:

- Never store full email bodies.
- Use strict Zod validation for all API requests.
- Sanitize any HTML snippets using `dompurify` before rendering.
- Validate sender domains (MX lookup) to flag spoofing.
- Require Supabase Auth JWT for all endpoints.
- Enforce RLS on all tables.

## 5. Token Efficiency & Rate Limiting
To control costs:

- Pre-filter emails with lightweight keyword checks before LLM parsing.
- Batch parsing requests where possible.
- Rate limit inbox parsing per user.

## 6. Skills Directory Deployment Constraint (Edge Functions)
`AgentOrchestrator.ts` reads skills from `skills/` using Node `fs`. This will **not** work inside Supabase Edge Functions (Deno).

**Required adaptation for Edge:**
- Bundle skills into JSON at build time, or
- Store skill definitions in Supabase and load via DB/API, or
- Use `import` with `Deno.readTextFile` and ship skills with the function (if allowed).

## 7. Team Sync Checklist
- Shared schema updated? Update frontend types and backend models.
- New API endpoint? Document request/response in this file.
- New skill? Ensure backend can load it and frontend knows effects.
- Security change? Update `security-guardrail` references.

## 8. Ownership
- **Backend (Codex):** Skills, ingestion, parsing, DB writes, security, auth.
- **Frontend (Lovable):** UI, realtime updates, data visualization, user flows.

## 9. Project Directive (4-Day Plan)
No `Project_Directive` file found in this repo yet. If you have one, add it to `docs/` and link it here so both Lovable and Codex can follow the same plan.

## 9. Project Directive (4-Day Plan)
See docs/Project_Directives.txt for the official 4-day execution pipeline. Key points:
- Day 1: SQL schema + OpenAPI spec + OAuth scopes
- Day 2: UI build + mock data + realtime listeners
- Day 3: Edge Functions + Gemini parsing + security guardrails
- Day 4: Integration + animations + full demo run

Directive: Do not deviate from the OpenAPI spec or SQL schema established on Day 1. Frontend must be responsive; backend must enforce Zero-Trust security.

## 10. Day-by-Day Sync Checklist
Use this to keep Lovable and Codex aligned on exact files and endpoints.

Day 1 (Backend - Codex)
- SQL schema created: tables pplications, status_history, sync_logs
- OpenAPI spec created: docs/openapi.yaml
- OAuth scopes configured in Supabase dashboard

Day 2 (Frontend - Lovable)
- UI components wired to mock data
- TypeScript types aligned with pplications + status_history
- Realtime subscriptions set to status_history and sync_logs

Day 3 (Backend - Codex)
- Edge Functions deployed: parse-inbox, sync-status
- Orchestrator in Edge-compatible form (no Node s)
- Security guardrails active (DNS validation, PII scrubbing)

Day 4 (Integration)
- Lovable swaps mock calls for supabase.functions.invoke('parse-inbox')
- Dashboard live updates verified
- Demo run: 100 sample emails end-to-end

## 11. Contract Enforcement Checklist
- Any API change must update docs/openapi.yaml first.
- Frontend requests must match the OpenAPI request bodies exactly.
- Backend responses must match the OpenAPI response schemas exactly.
- If a field is added/renamed, update both TypeScript types and DB schema.
- Do not ship changes that break the contract without updating this guide.
\n## 12. Skill References Loading\nAll skills must declare a 'Required References' section in SKILL.md. The orchestrator auto-loads those reference files and appends them to the system prompt. If you add a new reference file, add it to that section.\n

## 13. Security Blacklist + WAF + Rate Limits
- security_blacklist table defined in docs/migrations/001_security_blacklist.sql.
- Edge Functions must log prompt-injection attempts to security_blacklist.
- WAF headers (x-waf-*) should be validated on every Edge request.
- Rate limit sync attempts to 5/min and return HTTP 429 with etry_after_seconds.

Frontend notes (Lovable):
- If a 429 is returned, show a friendly cooldown state.
- If a 403 waf_blocked or high_risk_sender is returned, show a security warning.

## 14. Frontend Error Handling (Lovable)
Map backend security errors to clear UI states:
- 429 rate_limited: show cooldown state with retry timer.
- 403 waf_blocked: show a security warning and stop retries.
- 403 high_risk_sender: mark sender as High Risk and quarantine.
- 401 prompt_injection_detected: show a generic security error and log out user.

## 15. Security Tests (Codex)
Backend tests live in ackend/tests/ and are run via:
- 
pm run backend:test
These validate prompt injection detection, WAF header logic, and rate limiting.


## 16. Lovable UI Mapping (Security)
Front-end should render these states based on API responses:
- ate_limited: show cooldown timer + retry CTA
- waf_blocked: show security warning + support link
- high_risk_sender: tag sender as High Risk in UI
- prompt_injection_detected: force logout + show generic security error

## 17. Evidence Window + A11y Requirements (Lovable)
- The Sankey node detail view must show a "Source Snippet" (Evidence Window) from the email that triggered the status.
- Masked PII only; never display raw phone or address text.
- Add ARIA labels to all Sankey SVG paths and enable high-contrast mode for funnel stages.
- Provide a "Scanning Inbox" skeleton state before first sync completes.

## 18. Cross-Platform Reconciliation
- Merge email-derived and job-board metadata into one application record.
- Fuzzy match Company + Role at >= 85% similarity.
- Source priority within 5 minutes: Manual > Job Board > Email parsing.
- Store lower-priority source as evidence for the Evidence Window.

## 19. Job Board Metadata Requirements
- Parse LinkedIn/Indeed/Greenhouse confirmation pages.
- Extract source_channel (e.g., LinkedIn Easy Apply vs Direct Career Site).
- Detect referral tags and store eferral = true for badge display.
\n## 21. Knowledge Plan\nThe master blueprint is docs/KNOWLEDGE_PLAN.md. Both Lovable and Codex must follow it.\n

## 22. Knowledge Plan Reload
If docs/KNOWLEDGE_PLAN.md changes at runtime, call SkillManager.refreshKnowledgePlan() to reload the cached content without restarting the service.
\n## 23. Lovable Design System\nSee docs/DESIGN_SYSTEM_LOVABLE.md for UI patterns, Evidence Window, and interactive states.\n;\n  }\n\n  loadRequiredReferences(skill: SkillDefinition): string {
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

    const plan = this.loadKnowledgePlan();\n    const guide = this.loadIntegrationGuide();\n    const refs = this.loadRequiredReferences(selection.primary);

    return `${ORCHESTRATOR_SYSTEM_PROMPT}\n\nCURRENTLY ACTIVE SKILL: ${selection.primary.name}\nSKILL INSTRUCTIONS:\nC:\Users\nazer\OneDrive\Documents\JoraFlow\docs\TECHNICAL_INTEGRATION_GUIDE.md`;
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

