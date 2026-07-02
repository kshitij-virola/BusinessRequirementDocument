import { spawn, ChildProcess } from 'child_process'
import net from 'net'

export interface RunResult {
  code: number | null
  signal: NodeJS.Signals | null
}

/** Finds a free TCP port by binding to port 0 and reading back the OS-assigned port. */
export const getFreePort = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address()
      if (address && typeof address === 'object') {
        const port = address.port
        srv.close(() => resolve(port))
      } else {
        srv.close(() => reject(new Error('Could not determine a free port')))
      }
    })
  })
}

/**
 * Spawns argv[0] with the rest as args, detached in its own process group so
 * killProcess() can take out child processes it spawns (e.g. vite spawned by npm).
 */
export const spawnProcess = (argv: string[], cwd: string, extraEnv: Record<string, string> = {}): ChildProcess => {
  const [cmd, ...args] = argv
  return spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

/** Runs a command to completion, resolving with its exit code/signal. */
export const runToCompletion = (
  argv: string[],
  cwd: string,
  onOutput: (line: string) => void
): { child: ChildProcess; done: Promise<RunResult> } => {
  const child = spawnProcess(argv, cwd)
  child.stdout?.on('data', (buf) => onOutput(buf.toString()))
  child.stderr?.on('data', (buf) => onOutput(buf.toString()))

  const done = new Promise<RunResult>((resolve) => {
    child.on('close', (code, signal) => resolve({ code, signal }))
    child.on('error', (err) => {
      onOutput(`[process error] ${err.message}`)
      resolve({ code: null, signal: null })
    })
  })

  return { child, done }
}

/** Kills a detached process (and its process group on POSIX) started via spawnProcess(). */
export const killProcess = (child: ChildProcess): void => {
  if (child.exitCode !== null || child.signalCode !== null) return
  try {
    if (process.platform !== 'win32' && child.pid) {
      process.kill(-child.pid, 'SIGTERM')
    } else {
      child.kill('SIGTERM')
    }
  } catch {
    // process may have already exited between the check above and the kill
  }
}
