/**
 * Seeds a FICTIONAL demonstration family for local development and the public demo.
 * Every record is flagged isDemo=true and the family is named "(namuna)" — none of these
 * people exist. Re-running replaces the previous demo family; real families are untouched.
 *
 *   npm run db:seed
 *
 * Demo login (local only): demo@avlod.local / value of SEED_DEMO_PASSWORD (default below).
 */
import {
  PrismaClient,
  type MemoryEventType,
  type ParentType,
  type Sex,
  type TimelineEventType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_EMAIL = 'demo@avlod.local';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'AvlodDemo2026';

interface P {
  key: string;
  givenName: string;
  familyName?: string;
  patronymic?: string;
  maidenName?: string;
  sex: Sex;
  birth?: [number | null, number?, number?, boolean?];
  death?: [number | null, number?, number?, boolean?];
  isLiving?: boolean | null;
  birthPlace?: string;
  deathPlace?: string;
  occupation?: string;
  biography?: string;
  achievements?: string[];
  branch?: string;
  notes?: string;
}

const people: P[] = [
  // Generation 0 — founders, sparse records
  {
    key: 'abdulla',
    givenName: 'Abdulla',
    familyName: 'Karimov',
    sex: 'MALE',
    birth: [1898, undefined, undefined, true],
    death: [1967, undefined, undefined, true],
    isLiving: false,
    birthPlace: "Marg'ilon",
    occupation: "Bog'bon, ipakchi",
    branch: 'Karimovlar',
    biography:
      "Oila rivoyatlariga ko'ra, Abdulla bobo Marg'ilon atrofida tut bog'i barpo etgan va pilla yetishtirgan. Tug'ilgan yili hujjatlarda aniq ko'rsatilmagan.",
    notes: "Tug'ilgan yil oila xotiralariga asoslangan — arxiv hujjati topilmagan.",
  },
  {
    key: 'oysha',
    givenName: 'Oyshaxon',
    familyName: 'Karimova',
    sex: 'FEMALE',
    birth: [1904, undefined, undefined, true],
    death: [1979, 3],
    isLiving: false,
    occupation: 'Kashtachi',
    branch: 'Karimovlar',
    biography:
      "Suzana tikish san'atini qizlariga o'rgatgan. Uning ikki suzanasi hozirgacha oilada saqlanadi.",
    achievements: ['Mahalla kashtachilik ustaxonasini tashkil etgan'],
  },
  // Generation 1
  {
    key: 'rahim',
    givenName: 'Rahim',
    familyName: 'Karimov',
    patronymic: 'Abdulla o‘g‘li',
    sex: 'MALE',
    birth: [1925, 4, 12],
    death: [1994, 11, 2],
    isLiving: false,
    birthPlace: "Marg'ilon",
    deathPlace: 'Toshkent',
    occupation: "Tarix o'qituvchisi",
    branch: 'Karimovlar',
    biography:
      "Urushdan keyin Toshkentga ko'chib, 35 yil maktabda tarix fanidan dars bergan. Oila shajarasini birinchi bo'lib daftarga yozgan.",
    achievements: ["Xalq ta'limi a'lochisi", 'Oila shajarasining ilk qo‘lyozmasi muallifi'],
  },
  {
    key: 'zuhra',
    givenName: 'Zuhra',
    familyName: 'Karimova',
    maidenName: 'Yusupova',
    sex: 'FEMALE',
    birth: [1930, 8, 3],
    death: [2011, 1, 19],
    isLiving: false,
    birthPlace: 'Namangan',
    occupation: 'Shifokor-pediatr',
    branch: 'Karimovlar',
  },
  {
    key: 'saodat',
    givenName: 'Saodat',
    familyName: 'Nazarova',
    maidenName: 'Karimova',
    sex: 'FEMALE',
    birth: [1928],
    death: [2015, 6],
    isLiving: false,
    occupation: "To'quvchi",
    branch: 'Nazarovlar',
    biography: "Farg'ona to'qimachilik kombinatida 40 yil ishlagan.",
  },
  {
    key: 'botir',
    givenName: 'Botir',
    familyName: 'Nazarov',
    sex: 'MALE',
    birth: [1924, undefined, undefined, true],
    death: [1990],
    isLiving: false,
    occupation: 'Haydovchi',
    branch: 'Nazarovlar',
  },
  {
    key: 'mahmud',
    givenName: 'Mahmud',
    familyName: 'Karimov',
    patronymic: 'Abdulla o‘g‘li',
    sex: 'MALE',
    birth: [1932, 2, 20],
    death: [2001, 9, 9],
    isLiving: false,
    occupation: 'Muhandis-quruvchi',
    branch: 'Karimovlar',
    biography: '1966-yilgi Toshkent zilzilasidan keyin shaharni qayta qurishda qatnashgan.',
  },
  {
    key: 'lola',
    givenName: 'Lola',
    familyName: 'Karimova',
    sex: 'FEMALE',
    birth: [1936],
    isLiving: null,
    branch: 'Karimovlar',
    notes: 'Vafot sanasi aniqlanmagan.',
  },
  {
    key: 'hamid',
    givenName: 'Hamid',
    familyName: 'Karimov',
    sex: 'MALE',
    birth: [1943, undefined, undefined, true],
    death: [2009],
    isLiving: false,
    occupation: 'Agronom',
    branch: 'Karimovlar',
    biography: 'Urush yillarida Abdulla va Oyshaxon oilasiga asrab olingan.',
  },
  // Generation 2
  {
    key: 'akmal',
    givenName: 'Akmal',
    familyName: 'Karimov',
    patronymic: 'Rahim o‘g‘li',
    sex: 'MALE',
    birth: [1952, 5, 1],
    isLiving: true,
    birthPlace: 'Toshkent',
    occupation: 'Arxitektor',
    branch: 'Karimovlar',
    achievements: ['Toshkentdagi uch jamoat binosining loyiha muallifi'],
  },
  {
    key: 'dilnoza',
    givenName: 'Dilnoza',
    familyName: 'Karimova',
    sex: 'FEMALE',
    birth: [1956, 10, 14],
    isLiving: true,
    occupation: 'Musiqa o‘qituvchisi',
    branch: 'Karimovlar',
  },
  {
    key: 'gulnora',
    givenName: 'Gulnora',
    familyName: 'Karimova',
    patronymic: 'Rahim qizi',
    sex: 'FEMALE',
    birth: [1955, 12, 25],
    isLiving: true,
    occupation: 'Kutubxonachi',
    branch: 'Karimovlar',
  },
  {
    key: 'shavkat',
    givenName: 'Shavkat',
    familyName: 'Nazarov',
    sex: 'MALE',
    birth: [1950],
    death: [2020, 4],
    isLiving: false,
    occupation: 'Agronom',
    branch: 'Nazarovlar',
  },
  {
    key: 'nodira',
    givenName: 'Nodira',
    familyName: 'Nazarova',
    sex: 'FEMALE',
    birth: [1953],
    isLiving: true,
    branch: 'Nazarovlar',
  },
  {
    key: 'farrux',
    givenName: 'Farrux',
    familyName: 'Karimov',
    patronymic: 'Mahmud o‘g‘li',
    sex: 'MALE',
    birth: [1960, 3, 8],
    isLiving: true,
    occupation: 'Shifokor-jarroh',
    branch: 'Karimovlar',
  },
  {
    key: 'malika',
    givenName: 'Malika',
    familyName: 'Karimova',
    sex: 'FEMALE',
    birth: [1963],
    isLiving: true,
    branch: 'Karimovlar',
  },
  // Generation 3
  {
    key: 'jasur',
    givenName: 'Jasur',
    familyName: 'Karimov',
    patronymic: 'Akmal o‘g‘li',
    sex: 'MALE',
    birth: [1980, 7, 7],
    isLiving: true,
    occupation: 'Dasturiy muhandis',
    branch: 'Karimovlar',
    biography: 'Oila arxivini raqamlashtirish tashabbuskori.',
  },
  {
    key: 'kamola',
    givenName: 'Kamola',
    familyName: 'Karimova',
    sex: 'FEMALE',
    birth: [1983],
    isLiving: true,
    branch: 'Karimovlar',
  },
  {
    key: 'madina',
    givenName: 'Madina',
    familyName: 'Karimova',
    patronymic: 'Akmal qizi',
    sex: 'FEMALE',
    birth: [1984, 9, 30],
    isLiving: true,
    occupation: 'Jurnalist',
    branch: 'Karimovlar',
  },
  {
    key: 'bekzod',
    givenName: 'Bekzod',
    familyName: 'Nazarov',
    sex: 'MALE',
    birth: [1978],
    isLiving: true,
    occupation: 'Fermer',
    branch: 'Nazarovlar',
  },
  {
    key: 'sardor',
    givenName: 'Sardor',
    familyName: 'Karimov',
    sex: 'MALE',
    birth: [1988],
    isLiving: true,
    branch: 'Karimovlar',
  },
  {
    key: 'nilufar',
    givenName: 'Nilufar',
    familyName: 'Karimova',
    sex: 'FEMALE',
    birth: [1991],
    isLiving: true,
    branch: 'Karimovlar',
  },
  // Generation 4
  {
    key: 'amir',
    givenName: 'Amir',
    familyName: 'Karimov',
    sex: 'MALE',
    birth: [2008],
    isLiving: true,
    branch: 'Karimovlar',
  },
  {
    key: 'soliha',
    givenName: 'Soliha',
    familyName: 'Karimova',
    sex: 'FEMALE',
    birth: [2012],
    isLiving: true,
    branch: 'Karimovlar',
  },
  {
    key: 'temur',
    givenName: 'Temur',
    familyName: 'Nazarov',
    sex: 'MALE',
    birth: [2005],
    isLiving: true,
    branch: 'Nazarovlar',
  },
];

const parents: [string, string, ParentType?][] = [
  ['abdulla', 'rahim'],
  ['oysha', 'rahim'],
  ['abdulla', 'saodat'],
  ['oysha', 'saodat'],
  ['abdulla', 'mahmud'],
  ['oysha', 'mahmud'],
  ['abdulla', 'hamid', 'ADOPTIVE'],
  ['oysha', 'hamid', 'ADOPTIVE'],
  ['rahim', 'akmal'],
  ['zuhra', 'akmal'],
  ['rahim', 'gulnora'],
  ['zuhra', 'gulnora'],
  ['saodat', 'shavkat'],
  ['botir', 'shavkat'],
  ['mahmud', 'farrux'],
  ['lola', 'farrux'],
  ['akmal', 'jasur'],
  ['dilnoza', 'jasur'],
  ['akmal', 'madina'],
  ['dilnoza', 'madina'],
  ['shavkat', 'bekzod'],
  ['nodira', 'bekzod'],
  ['farrux', 'sardor'],
  ['malika', 'sardor'],
  ['farrux', 'nilufar'],
  ['malika', 'nilufar'],
  ['jasur', 'amir'],
  ['kamola', 'amir'],
  ['jasur', 'soliha'],
  ['kamola', 'soliha'],
  ['bekzod', 'temur'],
];

const unions: [string, string, number | null, 'ACTIVE' | 'WIDOWED' | 'UNKNOWN'][] = [
  ['abdulla', 'oysha', 1922, 'WIDOWED'],
  ['rahim', 'zuhra', 1950, 'WIDOWED'],
  ['saodat', 'botir', 1948, 'WIDOWED'],
  ['mahmud', 'lola', 1958, 'UNKNOWN'],
  ['akmal', 'dilnoza', 1978, 'ACTIVE'],
  ['shavkat', 'nodira', 1975, 'WIDOWED'],
  ['farrux', 'malika', 1986, 'ACTIVE'],
  ['jasur', 'kamola', 2006, 'ACTIVE'],
];

const memories: {
  title: string;
  year: number;
  approx?: boolean;
  type: MemoryEventType;
  location?: string;
  description: string;
  provenance?: string;
  people: string[];
  album?: 'archive' | 'celebrations';
}[] = [
  {
    title: "Tut bog'idagi kuz",
    year: 1931,
    approx: true,
    type: 'EVERYDAY',
    location: "Marg'ilon",
    description:
      "Abdulla bobo bog'ida pilla yig'imi. Oilada aytilishicha, bu yil bog' ilk marta mo'l hosil bergan.",
    provenance: 'Og‘zaki rivoyat: Rahim Karimov daftaridan (namuna).',
    people: ['abdulla', 'oysha'],
    album: 'archive',
  },
  {
    title: "Rahim va Zuhraning to'yi",
    year: 1950,
    type: 'WEDDING',
    location: 'Namangan',
    description: "Ikki oila Namangandagi hovlida yig'ilgan. To'y uch kun davom etgan.",
    people: ['rahim', 'zuhra', 'abdulla', 'oysha'],
    album: 'celebrations',
  },
  {
    title: "Toshkentga ko'chish",
    year: 1953,
    type: 'MIGRATION',
    location: 'Toshkent',
    description: "Rahim oilasi bilan poytaxtga ko'chib, Chilonzordagi kichik uyga joylashgan.",
    people: ['rahim', 'zuhra', 'akmal'],
    album: 'archive',
  },
  {
    title: 'Oyshaxon buvining suzanasi',
    year: 1960,
    approx: true,
    type: 'HISTORIC',
    description:
      "Qo'lda tikilgan suzana — oiladagi eng qadimgi buyum. Har to'yda kelin xonasiga osiladi.",
    provenance: 'Asl buyum Gulnora Karimovada saqlanadi (namuna).',
    people: ['oysha', 'gulnora'],
    album: 'archive',
  },
  {
    title: 'Zilziladan keyingi qurilish',
    year: 1966,
    type: 'WORK',
    location: 'Toshkent',
    description: 'Mahmud muhandis sifatida yangi turar-joy massivlarini qurishda ishlagan.',
    people: ['mahmud'],
  },
  {
    title: 'Akmalning bitiruvi',
    year: 1975,
    type: 'GRADUATION',
    location: 'Toshkent',
    description: 'Arxitektura institutini imtiyozli diplom bilan tamomlagan.',
    people: ['akmal', 'rahim', 'zuhra'],
    album: 'celebrations',
  },
  {
    title: "Navro'z — butun avlod bir dasturxonda",
    year: 1999,
    type: 'CELEBRATION',
    location: 'Toshkent',
    description: "To'rt avlod vakillari birinchi marta bir joyda to'plangan sumalak kechasi.",
    people: ['zuhra', 'akmal', 'dilnoza', 'gulnora', 'farrux', 'malika', 'jasur', 'madina'],
    album: 'celebrations',
  },
  {
    title: "Jasur va Kamolaning to'yi",
    year: 2006,
    type: 'WEDDING',
    location: 'Samarqand',
    description: 'Samarqanddagi oilaviy to‘y.',
    people: ['jasur', 'kamola', 'akmal', 'dilnoza'],
    album: 'celebrations',
  },
  {
    title: 'Oila arxivini raqamlashtirish',
    year: 2021,
    type: 'HISTORIC',
    description:
      "Jasur Rahim bobo daftarini va eski suratlarni skanerlab, AVLOD'ga yuklashni boshlagan.",
    people: ['jasur', 'madina'],
  },
];

const events: {
  title: string;
  year: number | null;
  month?: number;
  approx?: boolean;
  type: TimelineEventType;
  location?: string;
  description?: string;
  person?: string;
}[] = [
  {
    title: "Abdulla Karimov tug'ildi",
    year: 1898,
    approx: true,
    type: 'BIRTH',
    location: "Marg'ilon",
    person: 'abdulla',
  },
  { title: 'Abdulla va Oyshaxon turmush qurdi', year: 1922, type: 'MARRIAGE', person: 'abdulla' },
  {
    title: "Tut bog'i barpo etildi",
    year: 1928,
    approx: true,
    type: 'FAMILY',
    location: "Marg'ilon",
    description: "Oila bog'i — keyingi avlodlar uchun uchrashuv joyi.",
  },
  {
    title: 'Hamid oilaga asrab olindi',
    year: 1944,
    approx: true,
    type: 'FAMILY',
    person: 'hamid',
    description: "Urush yillarida yetim qolgan bola oilaning to'liq a'zosiga aylandi.",
  },
  {
    title: 'Rahim Toshkentga ko‘chdi',
    year: 1953,
    type: 'MIGRATION',
    location: 'Toshkent',
    person: 'rahim',
  },
  {
    title: 'Toshkent zilzilasi',
    year: 1966,
    month: 4,
    type: 'HISTORIC',
    location: 'Toshkent',
    description: 'Oila uyi shikastlangan, Mahmud qayta qurishda qatnashgan.',
  },
  {
    title: 'Abdulla Karimov vafot etdi',
    year: 1967,
    approx: true,
    type: 'DEATH',
    person: 'abdulla',
  },
  { title: 'Akmal arxitektor bo‘ldi', year: 1975, type: 'EDUCATION', person: 'akmal' },
  {
    title: 'Rahim shajara daftarini yakunladi',
    year: 1988,
    type: 'ACHIEVEMENT',
    person: 'rahim',
    description: "Besh avlodni qamragan qo'lyozma shajara.",
  },
  { title: "To'rt avlod Navro'zda", year: 1999, type: 'FAMILY', location: 'Toshkent' },
  { title: "Amir — beshinchi avlodning to'ng'ichi", year: 2008, type: 'BIRTH', person: 'amir' },
  { title: 'Raqamli arxiv boshlandi', year: 2021, type: 'ACHIEVEMENT', person: 'jasur' },
];

const d = (t?: [number | null, number?, number?, boolean?]) => ({
  year: t?.[0] ?? null,
  month: t?.[1] ?? null,
  day: t?.[2] ?? null,
  approximate: t?.[3] ?? false,
});

async function removeDemoFamilies() {
  const demo = await prisma.family.findMany({ where: { isDemo: true }, select: { id: true } });
  for (const { id } of demo) {
    await prisma.$transaction([
      prisma.timelineEvent.deleteMany({ where: { familyId: id } }),
      prisma.memoryPerson.deleteMany({ where: { memory: { familyId: id } } }),
      prisma.memory.deleteMany({ where: { familyId: id } }),
      prisma.album.deleteMany({ where: { familyId: id } }),
      prisma.personPhoto.deleteMany({ where: { familyId: id } }),
      prisma.parentChildRelationship.deleteMany({ where: { familyId: id } }),
      prisma.union.deleteMany({ where: { familyId: id } }),
      prisma.familyMembership.deleteMany({ where: { familyId: id } }),
      prisma.familyInvitation.deleteMany({ where: { familyId: id } }),
      prisma.person.deleteMany({ where: { familyId: id } }),
      prisma.mediaAsset.deleteMany({ where: { familyId: id } }),
      prisma.auditLog.deleteMany({ where: { familyId: id } }),
      prisma.family.delete({ where: { id } }),
    ]);
  }
}

async function main() {
  await removeDemoFamilies();

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      displayName: 'Demo foydalanuvchi',
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
    },
  });

  const family = await prisma.family.create({
    data: {
      name: 'Karimovlar oilasi (namuna)',
      description:
        "Bu oila to'qima — AVLOD imkoniyatlarini ko'rsatish uchun yaratilgan namunaviy ma'lumotlar. Haqiqiy shaxslarga hech qanday aloqasi yo'q.",
      isDemo: true,
      isPublicDemo: true,
      createdById: user.id,
      memberships: { create: { userId: user.id, role: 'OWNER' } },
    },
  });

  const ids = new Map<string, string>();
  for (const p of people) {
    const birth = d(p.birth);
    const death = d(p.death);
    const created = await prisma.person.create({
      data: {
        familyId: family.id,
        givenName: p.givenName,
        familyName: p.familyName ?? null,
        patronymic: p.patronymic ?? null,
        maidenName: p.maidenName ?? null,
        sex: p.sex,
        birthYear: birth.year,
        birthMonth: birth.month,
        birthDay: birth.day,
        birthApproximate: birth.approximate,
        deathYear: death.year,
        deathMonth: death.month,
        deathDay: death.day,
        deathApproximate: death.approximate,
        isLiving: p.isLiving ?? null,
        birthPlace: p.birthPlace ?? null,
        deathPlace: p.deathPlace ?? null,
        occupation: p.occupation ?? null,
        biography: p.biography ?? null,
        achievements: p.achievements ?? [],
        branchLabel: p.branch ?? null,
        notes: p.notes ?? null,
        isDemo: true,
        createdById: user.id,
      },
    });
    ids.set(p.key, created.id);
  }
  const id = (k: string) => {
    const v = ids.get(k);
    if (!v) throw new Error(`unknown person key ${k}`);
    return v;
  };

  await prisma.parentChildRelationship.createMany({
    data: parents.map(([parent, child, type]) => ({
      familyId: family.id,
      parentId: id(parent),
      childId: id(child),
      type: type ?? 'BIOLOGICAL',
      verification:
        type === 'ADOPTIVE'
          ? 'VERIFIED'
          : parent === 'abdulla' || parent === 'oysha'
            ? 'UNVERIFIED'
            : 'VERIFIED',
    })),
  });

  await prisma.union.createMany({
    data: unions.map(([a, b, startYear, status]) => {
      const [x, y] = [id(a), id(b)].sort();
      return {
        familyId: family.id,
        partnerAId: x!,
        partnerBId: y!,
        type: 'MARRIAGE' as const,
        status,
        startYear,
        verification: 'VERIFIED' as const,
      };
    }),
  });

  const archive = await prisma.album.create({
    data: {
      familyId: family.id,
      title: 'Oila arxivi',
      description: 'Eng qadimgi xotiralar va buyumlar.',
      isDemo: true,
      createdById: user.id,
    },
  });
  const celebrations = await prisma.album.create({
    data: {
      familyId: family.id,
      title: "To'ylar va bayramlar",
      description: 'Oilaviy tantanalar.',
      isDemo: true,
      createdById: user.id,
    },
  });

  const memoryIds = new Map<string, string>();
  for (const m of memories) {
    const created = await prisma.memory.create({
      data: {
        familyId: family.id,
        title: m.title,
        description: m.description,
        eventType: m.type,
        year: m.year,
        approximate: m.approx ?? false,
        location: m.location ?? null,
        provenance: m.provenance ?? null,
        albumId:
          m.album === 'archive' ? archive.id : m.album === 'celebrations' ? celebrations.id : null,
        isDemo: true,
        createdById: user.id,
        people: { create: m.people.map((k) => ({ personId: id(k) })) },
      },
    });
    memoryIds.set(m.title, created.id);
  }

  for (const e of events) {
    await prisma.timelineEvent.create({
      data: {
        familyId: family.id,
        title: e.title,
        description: e.description ?? null,
        type: e.type,
        year: e.year,
        month: e.month ?? null,
        approximate: e.approx ?? false,
        location: e.location ?? null,
        personId: e.person ? id(e.person) : null,
        memoryId: e.title.includes('Navro')
          ? (memoryIds.get("Navro'z — butun avlod bir dasturxonda") ?? null)
          : null,
        isDemo: true,
        createdById: user.id,
      },
    });
  }

  console.log(`Seeded demo family "${family.name}" with ${people.length} fictional people.`);
  console.log(
    `Local demo login: ${DEMO_EMAIL} (password from SEED_DEMO_PASSWORD or the documented default).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
