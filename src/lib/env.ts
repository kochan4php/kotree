// Configuration is checked once at server start, so a typo fails in the logs
// instead of halfway through a request. Every value is optional: the site is
// designed to run without Mongo, AI keys or alert webhooks.
type Env = Record<string, string | undefined>;

const problems: string[] = [];

function urlLike(name: string, value: string | undefined): void {
  if (!value) return;
  try {
    new URL(value);
  } catch {
    problems.push(`${name} must be an absolute URL`);
  }
}

function integer(name: string, value: string | undefined, min: number): void {
  if (!value) return;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min) problems.push(`${name} must be an integer >= ${min}`);
}

export function validateEnv(env: Env = process.env): void {
  problems.length = 0;
  if (env.MONGODB_URL && !/^mongodb(\+srv)?:\/\//.test(env.MONGODB_URL)) {
    problems.push('MONGODB_URL must start with mongodb:// or mongodb+srv://');
  }
  urlLike('NEXT_PUBLIC_BASE_URL', env.NEXT_PUBLIC_BASE_URL);
  urlLike('DISCORD_WEBHOOK_URL', env.DISCORD_WEBHOOK_URL);
  urlLike('TELEGRAM_WEBHOOK_URL', env.TELEGRAM_WEBHOOK_URL);
  integer('LOGIN_ALERT_THRESHOLD', env.LOGIN_ALERT_THRESHOLD, 1);
  if (env.ADMIN_TOTP_RECOVERY?.split(',').some((hash) => hash.trim() && !/^[a-f0-9]{64}$/i.test(hash.trim()))) {
    problems.push('ADMIN_TOTP_RECOVERY must be a comma-separated list of sha256 hashes');
  }
  if (env.ADMIN_TOTP_SECRET && !/^[A-Z2-7]{16,}$/i.test(env.ADMIN_TOTP_SECRET)) {
    problems.push('ADMIN_TOTP_SECRET must be base32 and at least 16 characters');
  }
  if (env.NODE_ENV === 'production' && env.ADMIN_TOKEN && env.ADMIN_TOKEN.length < 16) {
    problems.push('ADMIN_TOKEN must be at least 16 characters in production');
  }
  if (problems.length > 0) throw new Error(`Invalid environment:\n- ${problems.join('\n- ')}`);
}
