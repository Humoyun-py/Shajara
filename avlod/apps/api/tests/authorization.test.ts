import { beforeAll, describe, expect, it } from 'vitest';
import { addMember, addPerson, api, createFamily, registerUser, type TestUser } from './helpers';

/**
 * Workspace isolation and role enforcement. Members of family B must never read or
 * change family A's records, even when they know A's record ids.
 */
let alice: TestUser; // owner of family A
let bob: TestUser; // owner of family B (outsider to A)
let vera: TestUser; // viewer in A
let eddie: TestUser; // editor in A
let adam: TestUser; // admin in A
let familyA: string;
let familyB: string;
let personA: string;
let personB: string;

beforeAll(async () => {
  [alice, bob, vera, eddie, adam] = await Promise.all([
    registerUser('alice'),
    registerUser('bob'),
    registerUser('vera'),
    registerUser('eddie'),
    registerUser('adam'),
  ]);
  familyA = await createFamily(alice, 'Alice oilasi');
  familyB = await createFamily(bob, 'Bob oilasi');
  personA = await addPerson(alice, familyA, {
    givenName: 'Maxfiy',
    familyName: 'A',
    isLiving: true,
    birth: { year: 1990, month: 5, day: 4 },
    birthPlace: 'Buxoro',
    notes: 'internal',
  });
  personB = await addPerson(bob, familyB, { givenName: 'Begona', familyName: 'B' });
  await addMember(alice, familyA, vera, 'VIEWER');
  await addMember(alice, familyA, eddie, 'EDITOR');
  await addMember(alice, familyA, adam, 'ADMIN');
});

describe('workspace isolation', () => {
  it("hides another family's workspace and records behind 404", async () => {
    const paths = [
      `/api/v1/families/${familyA}`,
      `/api/v1/families/${familyA}/people`,
      `/api/v1/families/${familyA}/people/${personA}`,
      `/api/v1/families/${familyA}/tree`,
      `/api/v1/families/${familyA}/memories`,
      `/api/v1/families/${familyA}/timeline`,
      `/api/v1/families/${familyA}/members`,
      `/api/v1/families/${familyA}/stats`,
      `/api/v1/families/${familyA}/search?q=Maxfiy`,
    ];
    for (const p of paths) {
      const r = await api().get(p).set(bob.auth);
      expect(r.status, p).toBe(404);
    }
  });

  it("cannot reach family A's person through family B's URL", async () => {
    const read = await api().get(`/api/v1/families/${familyB}/people/${personA}`).set(bob.auth);
    expect(read.status).toBe(404);
    const write = await api()
      .patch(`/api/v1/families/${familyB}/people/${personA}`)
      .set(bob.auth)
      .send({ givenName: 'Hacked' });
    expect(write.status).toBe(404);
    const del = await api()
      .delete(`/api/v1/families/${familyB}/people/${personA}?detach=true`)
      .set(bob.auth);
    expect(del.status).toBe(404);
    const check = await api().get(`/api/v1/families/${familyA}/people/${personA}`).set(alice.auth);
    expect(check.body.data.person.givenName).toBe('Maxfiy');
  });

  it('cannot connect people from different workspaces', async () => {
    const link = await api()
      .post(`/api/v1/families/${familyB}/relationships/parents`)
      .set(bob.auth)
      .send({ parentId: personB, childId: personA });
    expect(link.status).toBe(404);
    const union = await api()
      .post(`/api/v1/families/${familyB}/relationships/unions`)
      .set(bob.auth)
      .send({ partnerAId: personB, partnerBId: personA });
    expect(union.status).toBe(404);
    const viaCreate = await api()
      .post(`/api/v1/families/${familyB}/people`)
      .set(bob.auth)
      .send({ person: { givenName: 'Child' }, relation: { to: personA, kind: 'CHILD_OF' } });
    expect(viaCreate.status).toBe(404);
  });

  it("cannot tag another family's people in memories", async () => {
    const r = await api()
      .post(`/api/v1/families/${familyB}/memories`)
      .set(bob.auth)
      .send({ title: 'Snoop', personIds: [personA] });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('INVALID_PERSON_REF');
  });

  it('lists only the caller’s families', async () => {
    const r = await api().get('/api/v1/families').set(bob.auth);
    const ids = r.body.data.map((f: { id: string }) => f.id);
    expect(ids).toContain(familyB);
    expect(ids).not.toContain(familyA);
  });

  it('requires authentication for every family route', async () => {
    expect((await api().get(`/api/v1/families/${familyA}/people`)).status).toBe(401);
    expect(
      (
        await api()
          .post(`/api/v1/families/${familyA}/people`)
          .send({ person: { givenName: 'X' } })
      ).status,
    ).toBe(401);
  });
});

describe('role enforcement', () => {
  it('lets viewers read but not write', async () => {
    expect((await api().get(`/api/v1/families/${familyA}/people`).set(vera.auth)).status).toBe(200);
    const create = await api()
      .post(`/api/v1/families/${familyA}/people`)
      .set(vera.auth)
      .send({ person: { givenName: 'Nope' } });
    expect(create.status).toBe(403);
    const patch = await api()
      .patch(`/api/v1/families/${familyA}/people/${personA}`)
      .set(vera.auth)
      .send({ givenName: 'Nope' });
    expect(patch.status).toBe(403);
    expect(
      (await api().post(`/api/v1/families/${familyA}/memories`).set(vera.auth).send({ title: 'x' }))
        .status,
    ).toBe(403);
  });

  it('redacts living relatives’ private details for viewers', async () => {
    const asViewer = await api()
      .get(`/api/v1/families/${familyA}/people/${personA}`)
      .set(vera.auth);
    expect(asViewer.body.data.person.birth).toMatchObject({ year: 1990, month: null, day: null });
    expect(asViewer.body.data.person.birthPlace).toBeNull();
    expect(asViewer.body.data.person.notes).toBeNull();
    expect(asViewer.body.data.person.redacted).toBe(true);
    const asOwner = await api()
      .get(`/api/v1/families/${familyA}/people/${personA}`)
      .set(alice.auth);
    expect(asOwner.body.data.person.birth).toMatchObject({ year: 1990, month: 5, day: 4 });
    expect(asOwner.body.data.person.notes).toBe('internal');
  });

  it('lets editors edit but not delete people', async () => {
    const p = await addPerson(eddie, familyA, { givenName: 'Editor qo‘shgan' });
    const del = await api().delete(`/api/v1/families/${familyA}/people/${p}`).set(eddie.auth);
    expect(del.status).toBe(403);
    expect(
      (await api().delete(`/api/v1/families/${familyA}/people/${p}`).set(adam.auth)).status,
    ).toBe(204);
  });

  it('only admins manage invitations, only the owner creates admins', async () => {
    const byEditor = await api()
      .post(`/api/v1/families/${familyA}/invitations`)
      .set(eddie.auth)
      .send({ email: 'x@example.test', role: 'VIEWER' });
    expect(byEditor.status).toBe(403);
    const adminByAdmin = await api()
      .post(`/api/v1/families/${familyA}/invitations`)
      .set(adam.auth)
      .send({ email: 'y@example.test', role: 'ADMIN' });
    expect(adminByAdmin.status).toBe(403);
    const ok = await api()
      .post(`/api/v1/families/${familyA}/invitations`)
      .set(adam.auth)
      .send({ email: 'z@example.test', role: 'EDITOR' });
    expect(ok.status).toBe(201);
  });

  it('prevents admins from escalating roles or touching the owner', async () => {
    const members = await api().get(`/api/v1/families/${familyA}/members`).set(adam.auth);
    const find = (u: TestUser) =>
      members.body.data.find((m: { userId: string }) => m.userId === u.id).id;
    const promote = await api()
      .patch(`/api/v1/families/${familyA}/members/${find(vera)}`)
      .set(adam.auth)
      .send({ role: 'ADMIN' });
    expect(promote.status).toBe(403);
    const demoteOwner = await api()
      .patch(`/api/v1/families/${familyA}/members/${find(alice)}`)
      .set(adam.auth)
      .send({ role: 'VIEWER' });
    expect(demoteOwner.status).toBe(403);
    const removeOwner = await api()
      .delete(`/api/v1/families/${familyA}/members/${find(alice)}`)
      .set(adam.auth);
    expect(removeOwner.status).toBe(403);
    const toEditor = await api()
      .patch(`/api/v1/families/${familyA}/members/${find(vera)}`)
      .set(adam.auth)
      .send({ role: 'EDITOR' });
    expect(toEditor.status).toBe(200);
    await api()
      .patch(`/api/v1/families/${familyA}/members/${find(vera)}`)
      .set(adam.auth)
      .send({ role: 'VIEWER' });
  });

  it('only the owner can archive a workspace, with name confirmation', async () => {
    const famC = await createFamily(alice, 'Arxivlanadigan');
    await addMember(alice, famC, adam, 'ADMIN');
    expect(
      (
        await api()
          .delete(`/api/v1/families/${famC}`)
          .set(adam.auth)
          .send({ confirmName: 'Arxivlanadigan' })
      ).status,
    ).toBe(403);
    expect(
      (
        await api()
          .delete(`/api/v1/families/${famC}`)
          .set(alice.auth)
          .send({ confirmName: 'wrong' })
      ).status,
    ).toBe(400);
    expect(
      (
        await api()
          .delete(`/api/v1/families/${famC}`)
          .set(alice.auth)
          .send({ confirmName: 'Arxivlanadigan' })
      ).status,
    ).toBe(204);
    expect((await api().get(`/api/v1/families/${famC}`).set(alice.auth)).status).toBe(404);
  });
});

describe('invitations', () => {
  it('can only be accepted by the invited email address, once', async () => {
    const invitee = await registerUser('invitee');
    const stranger = await registerUser('stranger');
    const inv = await api()
      .post(`/api/v1/families/${familyA}/invitations`)
      .set(alice.auth)
      .send({ email: invitee.email, role: 'VIEWER' });
    const token = String(inv.body.data.acceptUrl).split('/invitations/')[1];
    const preview = await api().get(`/api/v1/invitations/preview/${token}`);
    expect(preview.body.data.familyName).toBe('Alice oilasi');
    expect(
      (await api().post('/api/v1/invitations/accept').set(stranger.auth).send({ token })).status,
    ).toBe(403);
    expect(
      (await api().post('/api/v1/invitations/accept').set(invitee.auth).send({ token })).status,
    ).toBe(200);
    expect(
      (await api().post('/api/v1/invitations/accept').set(invitee.auth).send({ token })).status,
    ).toBe(400);
    expect((await api().get(`/api/v1/families/${familyA}/people`).set(invitee.auth)).status).toBe(
      200,
    );
  });

  it('cannot be used after revocation', async () => {
    const invitee = await registerUser('revoked');
    const inv = await api()
      .post(`/api/v1/families/${familyA}/invitations`)
      .set(alice.auth)
      .send({ email: invitee.email, role: 'VIEWER' });
    const token = String(inv.body.data.acceptUrl).split('/invitations/')[1];
    expect(
      (
        await api()
          .delete(`/api/v1/families/${familyA}/invitations/${inv.body.data.id}`)
          .set(alice.auth)
      ).status,
    ).toBe(204);
    const r = await api().post('/api/v1/invitations/accept').set(invitee.auth).send({ token });
    expect(r.status).toBe(400);
    expect((await api().get(`/api/v1/families/${familyA}`).set(invitee.auth)).status).toBe(404);
  });
});
