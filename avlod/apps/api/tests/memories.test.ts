import { beforeAll, describe, expect, it } from 'vitest';
import { addMember, addPerson, api, createFamily, registerUser, type TestUser } from './helpers';
import { prisma } from '../src/lib/prisma';

// Smallest valid PNG (1×1 transparent pixel).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

let owner: TestUser;
let editor: TestUser;
let outsider: TestUser;
let fam: string;
let person: string;

beforeAll(async () => {
  [owner, editor, outsider] = await Promise.all([
    registerUser('mem-owner'),
    registerUser('mem-editor'),
    registerUser('mem-out'),
  ]);
  fam = await createFamily(owner, 'Xotiralar oilasi');
  await addMember(owner, fam, editor, 'EDITOR');
  person = await addPerson(owner, fam, {
    givenName: 'Buvi',
    isLiving: false,
    death: { year: 2001 },
  });
});

describe('memories', () => {
  it('creates, filters, updates and deletes a memory', async () => {
    const created = await api()
      .post(`/api/v1/families/${fam}/memories`)
      .set(owner.auth)
      .send({
        title: "To'y",
        eventType: 'WEDDING',
        date: { year: 1975 },
        personIds: [person],
        provenance: 'Albom, 3-bet',
      });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect(created.body.data.people[0].id).toBe(person);

    const byYear = await api().get(`/api/v1/families/${fam}/memories?year=1975`).set(owner.auth);
    expect(byYear.body.data.map((m: { id: string }) => m.id)).toContain(id);
    const byPerson = await api()
      .get(`/api/v1/families/${fam}/memories?personId=${person}`)
      .set(owner.auth);
    expect(byPerson.body.meta.total).toBe(1);
    const byType = await api()
      .get(`/api/v1/families/${fam}/memories?eventType=BIRTH`)
      .set(owner.auth);
    expect(byType.body.meta.total).toBe(0);

    const patched = await api()
      .patch(`/api/v1/families/${fam}/memories/${id}`)
      .set(owner.auth)
      .send({ caption: 'Yangi izoh' });
    expect(patched.body.data.caption).toBe('Yangi izoh');

    // Editors may only delete their own memories.
    expect(
      (await api().delete(`/api/v1/families/${fam}/memories/${id}`).set(editor.auth)).status,
    ).toBe(403);
    expect(
      (await api().delete(`/api/v1/families/${fam}/memories/${id}`).set(owner.auth)).status,
    ).toBe(204);
  });

  it('uploads an image, stores only metadata and serves it via a signed URL', async () => {
    const res = await api()
      .post(`/api/v1/families/${fam}/memories`)
      .set(owner.auth)
      .field('data', JSON.stringify({ title: 'Surat', personIds: [person] }))
      .attach('file', PNG, { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    const media = res.body.data.media;
    expect(media.kind).toBe('IMAGE');
    expect(media.mimeType).toBe('image/png');

    const file = await api().get(media.url);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');

    const tampered = await api().get(media.url.replace(/sig=[^&]+/, 'sig=forged'));
    expect(tampered.status).toBe(403);
    const unsigned = await api().get(media.url.split('?')[0]);
    expect(unsigned.status).toBe(403);
  });

  it('rejects files whose content is not an allowed media type, whatever the claimed type', async () => {
    const res = await api()
      .post(`/api/v1/families/${fam}/memories`)
      .set(owner.auth)
      .field('data', JSON.stringify({ title: 'Yolg‘on' }))
      .attach('file', Buffer.from('<script>alert(1)</script>'), {
        filename: 'evil.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('uploads a portrait for a person', async () => {
    const res = await api()
      .post(`/api/v1/families/${fam}/people/${person}/portrait`)
      .set(owner.auth)
      .attach('file', PNG, { filename: 'p.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    const profile = await api().get(`/api/v1/families/${fam}/people/${person}`).set(owner.auth);
    expect(profile.body.data.person.portrait.id).toBe(res.body.data.id);
    expect(profile.body.data.photos).toHaveLength(1);
  });

  it('does not let outsiders read or upload media', async () => {
    const r = await api()
      .post(`/api/v1/families/${fam}/people/${person}/portrait`)
      .set(outsider.auth)
      .attach('file', PNG, { filename: 'p.png', contentType: 'image/png' });
    expect(r.status).toBe(404);
  });
});

describe('albums and timeline', () => {
  it('keeps memories when an album is deleted', async () => {
    const album = await api()
      .post(`/api/v1/families/${fam}/albums`)
      .set(owner.auth)
      .send({ title: 'Arxiv' });
    const mem = await api()
      .post(`/api/v1/families/${fam}/memories`)
      .set(owner.auth)
      .send({ title: 'Albomdagi', albumId: album.body.data.id });
    expect(mem.body.data.albumId).toBe(album.body.data.id);
    expect(
      (await api().delete(`/api/v1/families/${fam}/albums/${album.body.data.id}`).set(editor.auth))
        .status,
    ).toBe(403);
    expect(
      (await api().delete(`/api/v1/families/${fam}/albums/${album.body.data.id}`).set(owner.auth))
        .status,
    ).toBe(204);
    const after = await api()
      .get(`/api/v1/families/${fam}/memories/${mem.body.data.id}`)
      .set(owner.auth);
    expect(after.body.data.albumId).toBeNull();
  });

  it('orders timeline events chronologically with unknown dates last', async () => {
    const t = (title: string, year: number | null) =>
      api()
        .post(`/api/v1/families/${fam}/timeline`)
        .set(editor.auth)
        .send({ title, date: { year }, personId: person });
    await t('Keyin', 1990);
    await t("Noma'lum", null);
    await t('Avval', 1950);
    const list = await api().get(`/api/v1/families/${fam}/timeline`).set(owner.auth);
    expect(list.body.data.map((e: { title: string }) => e.title)).toEqual([
      'Avval',
      'Keyin',
      "Noma'lum",
    ]);
  });
});

describe('public demo', () => {
  it('is unavailable when no demo family exists', async () => {
    expect((await api().get('/api/v1/public/demo')).status).toBe(404);
  });

  it('exposes only the flagged demo family, with living people redacted', async () => {
    const demoOwner = await registerUser('demo');
    const demo = await createFamily(demoOwner, 'Namuna');
    const living = await addPerson(demoOwner, demo, {
      givenName: 'Tirik',
      isLiving: true,
      birth: { year: 1985, month: 1, day: 2 },
      birthPlace: 'Xiva',
      biography: 'Shaxsiy',
      notes: 'ichki',
    });
    await prisma.family.update({ where: { id: demo }, data: { isDemo: true, isPublicDemo: true } });
    try {
      const overview = await api().get('/api/v1/public/demo');
      expect(overview.status).toBe(200);
      expect(overview.body.data.family.id).toBe(demo);
      const profile = await api().get(`/api/v1/public/demo/people/${living}`);
      expect(profile.body.data.person).toMatchObject({
        biography: null,
        birthPlace: null,
        notes: null,
        portrait: null,
      });
      expect(profile.body.data.person.birth.month).toBeNull();
      // Records of private families are not reachable through the public API.
      expect((await api().get(`/api/v1/public/demo/people/${person}`)).status).toBe(404);
    } finally {
      await prisma.family.update({ where: { id: demo }, data: { isPublicDemo: false } });
    }
  });
});
