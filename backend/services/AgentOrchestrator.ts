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
