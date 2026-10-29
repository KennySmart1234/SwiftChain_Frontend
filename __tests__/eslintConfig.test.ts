import { execFileSync } from 'child_process';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..');
const eslintBin = path.join(repoRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');

type LintMessage = {
  ruleId: string | null;
  message: string;
  severity: number;
};

jest.setTimeout(180000);

function lint(code: string, filename: string): LintMessage[] {
  const stdout = execFileSync(
    process.execPath,
    [eslintBin, '--stdin', '--stdin-filename', filename, '--format', 'json'],
    { cwd: repoRoot, input: code, encoding: 'utf8' }
  );
  const [result] = JSON.parse(stdout) as { messages: LintMessage[] }[];
  return result ? result.messages : [];
}

const ruleIds = (messages: LintMessage[]) => messages.map((message) => message.ruleId);

describe('ESLint ruleset', () => {
  it('flags console.log while allowing console.error and console.warn', () => {
    expect(ruleIds(lint('export function f() {\n  console.log("noise");\n}\n', 'lib/sample.ts'))).toContain(
      'no-console'
    );

    for (const method of ['error', 'warn']) {
      const messages = lint(`export function f() {\n  console.${method}("diagnostic");\n}\n`, 'lib/sample.ts');
      expect(messages.filter((message) => message.ruleId === 'no-console')).toEqual([]);
    }
  });

  it('reports unused TypeScript bindings once, through the TS-aware rule', () => {
    const messages = lint('export function f() {\n  const unusedValue = 1;\n  return 2;\n}\n', 'lib/sample.ts');

    expect(ruleIds(messages)).toEqual(['@typescript-eslint/no-unused-vars']);
    expect(ruleIds(messages)).not.toContain('no-unused-vars');
  });

  it('accepts underscore-prefixed placeholders for arguments, catches and destructuring', () => {
    const code = [
      'export function read({ a, b: _b }: { a: number; b: number }, _label: string) {',
      '  const [, ...rest] = [1, 2, 3];',
      '  try {',
      '    return a + rest.length;',
      '  } catch (_error) {',
      '    return 0;',
      '  }',
      '}',
    ].join('\n');

    expect(lint(code, 'lib/sample.ts').filter((message) => message.severity === 2)).toEqual([]);
  });

  it('keeps checked-in and generated build output out of the lint run', () => {
    expect(
      lint('const stale = 1;\n', '.next/dev/stale.ts').some(
        (message) => message.ruleId === null && /ignored/i.test(message.message)
      )
    ).toBe(true);

    expect(
      lint('const stale = 1;\n', 'coverage/report.ts').some((message) =>
        /ignored/i.test(message.message)
      )
    ).toBe(true);

    expect(
      lint('export const live = 1;\n', 'lib/live.ts').some((message) => /ignored/i.test(message.message))
    ).toBe(false);
  });
});
