import crypto from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app';

export const app = createApp();
export const api = () => request(app);

export interface TestUser {
  id: string;
  email: string;
  token: string;
  cookie: string;
  auth: { Authorization: string };
}

const PASSWORD = 'CorrectHorse42battery';

export async function registerUser(label = 'user'): Promise<TestUser> {
  const email = `${label}-${crypto.randomUUID().slice(0, 8)}@example.test`;
  const res = await api()
    .post('/api/v1/auth/register')
    .send({ email, password: PASSWORD, displayName: `Test ${label}` });
  if (res.status !== 201)
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const cookie = [res.headers['set-cookie']].flat().find((c) => c?.startsWith('avlod_rt='))!;
  return {
    id: res.body.data.user.id,
    email,
    token: res.body.data.accessToken,
    cookie: cookie.split(';')[0]!,
    auth: { Authorization: `Bearer ${res.body.data.accessToken}` },
  };
}
registerUser.password = PASSWORD;

export async function createFamily(user: TestUser, name = 'Test oilasi'): Promise<string> {
  const res = await api().post('/api/v1/families').set(user.auth).send({ name });
  if (res.status !== 201) throw new Error(`createFamily failed: ${res.status}`);
  return res.body.data.id;
}

export async function addPerson(
  user: TestUser,
  familyId: string,
  person: Record<string, unknown>,
  relation?: Record<string, unknown>,
) {
  const res = await api()
    .post(`/api/v1/families/${familyId}/people`)
    .set(user.auth)
    .send({ person, relation });
  if (res.status !== 201)
    throw new Error(`addPerson failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.id as string;
}

/** Invites `invitee` into the family with a role and accepts on their behalf. */
export async function addMember(
  owner: TestUser,
  familyId: string,
  invitee: TestUser,
  role: 'ADMIN' | 'EDITOR' | 'VIEWER',
) {
  const inv = await api()
    .post(`/api/v1/families/${familyId}/invitations`)
    .set(owner.auth)
    .send({ email: invitee.email, role });
  if (inv.status !== 201)
    throw new Error(`invite failed: ${inv.status} ${JSON.stringify(inv.body)}`);
  const token = String(inv.body.data.acceptUrl).split('/invitations/')[1];
  const acc = await api().post('/api/v1/invitations/accept').set(invitee.auth).send({ token });
  if (acc.status !== 200)
    throw new Error(`accept failed: ${acc.status} ${JSON.stringify(acc.body)}`);
}
