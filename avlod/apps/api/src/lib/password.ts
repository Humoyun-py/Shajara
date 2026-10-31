import bcrypt from 'bcryptjs';

const ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// Used to keep login timing similar for unknown emails.
let dummyHash: string | null = null;
export async function burnPasswordCheck(plain: string) {
  dummyHash ??= await bcrypt.hash('avlod-timing-equaliser', ROUNDS);
  await bcrypt.compare(plain, dummyHash);
}
