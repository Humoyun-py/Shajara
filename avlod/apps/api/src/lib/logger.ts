type Level = 'debug' | 'info' | 'warn' | 'error';

function write(level: Level, msg: string, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'test' && level !== 'error') return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...extra });
  if (level === 'error') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (m: string, e?: Record<string, unknown>) => write('debug', m, e),
  info: (m: string, e?: Record<string, unknown>) => write('info', m, e),
  warn: (m: string, e?: Record<string, unknown>) => write('warn', m, e),
  error: (m: string, e?: Record<string, unknown>) => write('error', m, e),
};
