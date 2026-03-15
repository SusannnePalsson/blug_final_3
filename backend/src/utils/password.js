import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing/verification wrapper.
 * Uses @node-rs/argon2 for better Windows ARM64 support.
 */
export async function hashPassword(password) {
  // @node-rs/argon2 uses Argon2id by default.
  return await hash(password);
}

export async function verifyPassword(passwordHash, password) {
  return await verify(passwordHash, password);
}
