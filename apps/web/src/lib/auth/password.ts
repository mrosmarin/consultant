// App-level password policy for sign-up. Length-first per NIST 800-63B guidance
// (favor length over composition rules), with a small screen for obviously weak
// or common passwords. Stricter than Neon Auth / Better Auth's default minimum
// (8), so anything that passes here also satisfies the auth server.

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

// A short blocklist of obviously weak / common passwords (and substrings). Not
// exhaustive — a deterrent against the laziest choices, not a breach database.
const COMMON = [
  "password",
  "passw0rd",
  "12345678",
  "123456789",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "endlessworlds",
];

export const PASSWORD_GUIDANCE = `Use at least ${MIN_PASSWORD_LENGTH} characters. A passphrase of a few unrelated words works well.`;

// Returns an error message if the password is unacceptable, otherwise null.
export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }

  const lower = password.toLowerCase();
  if (COMMON.some((c) => lower.includes(c))) {
    return "That password is too common or guessable — pick something less predictable.";
  }

  // Reject a single repeated character (e.g. "aaaaaaaaaaaa").
  if (/^(.)\1+$/.test(password)) {
    return "Password can't be a single repeated character.";
  }

  return null;
}
