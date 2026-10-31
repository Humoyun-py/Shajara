import { beforeAll, describe, expect, it } from 'vitest';
import { addPerson, api, createFamily, registerUser, type TestUser } from './helpers';

let owner: TestUser;
let fam: string;
let grandpa: string;
let father: string;
let mother: string;
let child: string;

const base = () => `/api/v1/families/${fam}`;
const link = (parentId: string, childId: string, type = 'BIOLOGICAL') =>
  api().post(`${base()}/relationships/parents`).set(owner.auth).send({ parentId, childId, type });

beforeAll(async () => {
  owner = await registerUser('tree');
  fam = await createFamily(owner, 'Daraxt oilasi');
  grandpa = await addPerson(owner, fam, {
    givenName: 'Bobo',
    birth: { year: 1900, approximate: true },
  });
  father = await addPerson(
    owner,
    fam,
    { givenName: 'Ota', birth: { year: 1930 } },
    { to: grandpa, kind: 'CHILD_OF' },
  );
  mother = await addPerson(owner, fam, { givenName: 'Ona' }, { to: father, kind: 'PARTNER_OF' });
  child = await addPerson(
    owner,
    fam,
    { givenName: 'Farzand', isLiving: true },
    { to: father, kind: 'CHILD_OF' },
  );
  expect((await link(mother, child)).status).toBe(201);
});

describe('relationship rules', () => {
  it('rejects self-parenting', async () => {
    const r = await link(father, father);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('SELF_RELATION');
  });

  it('rejects duplicate links', async () => {
    const r = await link(father, child);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('DUPLICATE_RELATION');
  });

  it('rejects cycles across several generations', async () => {
    const r = await link(child, grandpa);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('CYCLE');
  });

  it('allows at most two biological parents, but further adoptive parents', async () => {
    const third = await addPerson(owner, fam, { givenName: 'Uchinchi' });
    const bio = await link(third, child);
    expect(bio.status).toBe(409);
    expect(bio.body.error.code).toBe('TOO_MANY_BIOLOGICAL_PARENTS');
    expect((await link(third, child, 'ADOPTIVE')).status).toBe(201);
  });

  it('rejects partnering a parent with their own child and duplicate unions', async () => {
    const r = await api()
      .post(`${base()}/relationships/unions`)
      .set(owner.auth)
      .send({ partnerAId: father, partnerBId: child });
    expect(r.status).toBe(409);
    const dup = await api()
      .post(`${base()}/relationships/unions`)
      .set(owner.auth)
      .send({ partnerAId: mother, partnerBId: father });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_UNION');
  });

  it('serialises concurrent writes so cycles cannot slip through', async () => {
    const a = await addPerson(owner, fam, { givenName: 'A' });
    const b = await addPerson(owner, fam, { givenName: 'B' });
    const [r1, r2] = await Promise.all([link(a, b), link(b, a)]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
  });

  it('accepts incomplete and approximate historical dates', async () => {
    const r = await api()
      .post(`${base()}/people`)
      .set(owner.auth)
      .send({
        person: {
          givenName: 'Qadimgi',
          birth: { year: 1820, approximate: true },
          death: { year: null },
          isLiving: false,
        },
      });
    expect(r.status).toBe(201);
    expect(r.body.data.birth).toEqual({ year: 1820, month: null, day: null, approximate: true });
    const invalid = await api()
      .post(`${base()}/people`)
      .set(owner.auth)
      .send({ person: { givenName: 'X', birth: { year: 1999, month: 2, day: 30 } } });
    expect(invalid.status).toBe(400);
  });
});

describe('profiles, tree and statistics', () => {
  it('returns relatives with siblings and generation', async () => {
    const sibling = await addPerson(
      owner,
      fam,
      { givenName: 'Aka' },
      { to: father, kind: 'CHILD_OF' },
    );
    await link(mother, sibling);
    const r = await api().get(`${base()}/people/${child}`).set(owner.auth);
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.generation).toBe(2);
    expect(d.relatives.parents.map((p: { person: { id: string } }) => p.person.id).sort()).toEqual(
      expect.arrayContaining([father, mother]),
    );
    expect(
      d.relatives.siblings.find((s: { person: { id: string } }) => s.person.id === sibling).shared,
    ).toBe('FULL');
  });

  it('builds the tree with generations, and a window around a root', async () => {
    const full = await api().get(`${base()}/tree`).set(owner.auth);
    expect(full.status).toBe(200);
    const gen = (id: string) =>
      full.body.data.persons.find((p: { id: string }) => p.id === id).generation;
    expect(gen(grandpa)).toBe(0);
    expect(gen(father)).toBe(1);
    expect(gen(mother)).toBe(1); // partner aligned with spouse
    expect(gen(child)).toBe(2);

    const win = await api().get(`${base()}/tree?rootId=${child}&up=1&down=0`).set(owner.auth);
    const ids = win.body.data.persons.map((p: { id: string }) => p.id);
    expect(ids).toEqual(expect.arrayContaining([child, father, mother]));
    expect(ids).not.toContain(grandpa);
    expect(win.body.data.truncated).toBe(true);
    expect(win.body.data.expandable).toEqual(
      expect.arrayContaining([expect.objectContaining({ personId: father, up: true })]),
    );
  });

  it('computes statistics from the database', async () => {
    const s = await api().get(`${base()}/stats`).set(owner.auth);
    expect(s.body.data.generations).toBe(3);
    expect(s.body.data.familyMembers).toBeGreaterThanOrEqual(5);
    expect(s.body.data.branches).toBe(1);
  });

  it('searches people by partial names', async () => {
    const r = await api().get(`${base()}/search?q=farz`).set(owner.auth);
    expect(r.body.data.people.map((p: { id: string }) => p.id)).toContain(child);
  });
});

describe('deletion policy', () => {
  it('refuses to delete a connected person unless detaching is confirmed, and never cascades', async () => {
    const r = await api().delete(`${base()}/people/${father}`).set(owner.auth);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('HAS_RELATIONSHIPS');
    const ok = await api().delete(`${base()}/people/${father}?detach=true`).set(owner.auth);
    expect(ok.status).toBe(204);
    // Relatives survive; only the links were removed.
    expect((await api().get(`${base()}/people/${child}`).set(owner.auth)).status).toBe(200);
    expect((await api().get(`${base()}/people/${grandpa}`).set(owner.auth)).status).toBe(200);
    expect((await api().get(`${base()}/people/${father}`).set(owner.auth)).status).toBe(404);
    const audit = await api().get(`${base()}/audit`).set(owner.auth);
    expect(audit.body.data.some((e: { action: string }) => e.action === 'person.delete')).toBe(
      true,
    );
  });
});
