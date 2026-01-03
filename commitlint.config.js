export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-enum': [
      1,
      'always',
      ['policy-engine', 'mcp-server', 'simulation', 'dashboard', 'deps', 'release'],
    ],
    'subject-case': [2, 'always', 'lower-case'],
  },
};
