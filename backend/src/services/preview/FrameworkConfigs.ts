import type { Framework } from '../../models/Workspace'

export interface FrameworkConfig {
  install: string[]         // argv for install step; empty = skip
  start: string[]           // argv for start step; '{PORT}' -> port, '{BASE}' -> '/preview/<id>/', '{BASE_PATH}' -> '/preview/<id>'
  readyPattern: RegExp      // stdout/stderr pattern that means "server is up"
  defaultPort: number
}

export const FRAMEWORK_CONFIGS: Record<Framework, FrameworkConfig> = {
  react: {
    install: ['npm', 'install', '--prefer-offline'],
    start:   ['npm', 'run', 'dev', '--', '--port', '{PORT}', '--host', '0.0.0.0', '--base', '{BASE}'],
    readyPattern: /ready in|Local:\s+http|localhost/i,
    defaultPort: 5173,
  },
  vue: {
    install: ['npm', 'install', '--prefer-offline'],
    start:   ['npm', 'run', 'dev', '--', '--port', '{PORT}', '--host', '0.0.0.0', '--base', '{BASE}'],
    readyPattern: /ready in|Local:\s+http|localhost/i,
    defaultPort: 5173,
  },
  angular: {
    install: ['npm', 'install', '--prefer-offline'],
    start:   ['npm', 'start', '--', '--port', '{PORT}', '--host', '0.0.0.0', '--disable-host-check', '--base-href', '{BASE}', '--serve-path', '{BASE_PATH}'],
    readyPattern: /compiled successfully|Application bundle generation complete|Compiled successfully/i,
    defaultPort: 4200,
  },
  html: {
    install: [],
    start:   ['npx', 'serve', '.', '-p', '{PORT}', '--no-clipboard'],
    readyPattern: /serving|listening|Accepting connections/i,
    defaultPort: 3000,
  },
  wordpress: {
    install: [],
    start:   ['docker', 'compose', 'up', '-d'],
    readyPattern: /done|running|Started/i,
    defaultPort: 8080,
  },
}
