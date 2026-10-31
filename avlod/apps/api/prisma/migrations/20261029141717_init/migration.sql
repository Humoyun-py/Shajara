-- CreateEnum
CREATE TYPE "FamilyRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ParentType" AS ENUM ('BIOLOGICAL', 'ADOPTIVE', 'STEP', 'FOSTER', 'GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "UnionType" AS ENUM ('MARRIAGE', 'PARTNERSHIP', 'ENGAGEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "UnionStatus" AS ENUM ('ACTIVE', 'DIVORCED', 'SEPARATED', 'WIDOWED', 'ENDED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'UNVERIFIED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MemoryEventType" AS ENUM ('BIRTH', 'WEDDING', 'GRADUATION', 'MIGRATION', 'CELEBRATION', 'WORK', 'EVERYDAY', 'HISTORIC', 'OTHER');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('BIRTH', 'DEATH', 'MARRIAGE', 'MIGRATION', 'EDUCATION', 'CAREER', 'ACHIEVEMENT', 'FAMILY', 'HISTORIC', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'uz',
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "isPublicDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMembership" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "FamilyRole" NOT NULL,
    "personId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyInvitation" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "FamilyRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT,
    "patronymic" TEXT,
    "maidenName" TEXT,
    "sex" "Sex" NOT NULL DEFAULT 'UNKNOWN',
    "birthYear" INTEGER,
    "birthMonth" INTEGER,
    "birthDay" INTEGER,
    "birthApproximate" BOOLEAN NOT NULL DEFAULT false,
    "birthPlace" TEXT,
    "deathYear" INTEGER,
    "deathMonth" INTEGER,
    "deathDay" INTEGER,
    "deathApproximate" BOOLEAN NOT NULL DEFAULT false,
    "deathPlace" TEXT,
    "isLiving" BOOLEAN,
    "biography" TEXT,
    "occupation" TEXT,
    "achievements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "branchLabel" TEXT,
    "notes" TEXT,
    "portraitMediaId" UUID,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentChildRelationship" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "parentId" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "type" "ParentType" NOT NULL DEFAULT 'BIOLOGICAL',
    "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentChildRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Union" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "partnerAId" UUID NOT NULL,
    "partnerBId" UUID NOT NULL,
    "type" "UnionType" NOT NULL DEFAULT 'MARRIAGE',
    "status" "UnionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "startYear" INTEGER,
    "endYear" INTEGER,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Union_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "originalName" TEXT,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonPhoto" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdById" UUID,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "albumId" UUID,
    "mediaId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "MemoryEventType" NOT NULL DEFAULT 'OTHER',
    "year" INTEGER,
    "month" INTEGER,
    "day" INTEGER,
    "approximate" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "caption" TEXT,
    "provenance" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryPerson" (
    "memoryId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryPerson_pkey" PRIMARY KEY ("memoryId","personId")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "personId" UUID,
    "memoryId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TimelineEventType" NOT NULL DEFAULT 'OTHER',
    "year" INTEGER,
    "month" INTEGER,
    "day" INTEGER,
    "approximate" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "familyId" UUID,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshSession_userId_idx" ON "RefreshSession"("userId");

-- CreateIndex
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Family_isPublicDemo_idx" ON "Family"("isPublicDemo");

-- CreateIndex
CREATE INDEX "FamilyMembership_userId_idx" ON "FamilyMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMembership_familyId_userId_key" ON "FamilyMembership"("familyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyInvitation_tokenHash_key" ON "FamilyInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "FamilyInvitation_familyId_status_idx" ON "FamilyInvitation"("familyId", "status");

-- CreateIndex
CREATE INDEX "FamilyInvitation_email_status_idx" ON "FamilyInvitation"("email", "status");

-- CreateIndex
CREATE INDEX "Person_familyId_deletedAt_idx" ON "Person"("familyId", "deletedAt");

-- CreateIndex
CREATE INDEX "Person_familyId_familyName_givenName_idx" ON "Person"("familyId", "familyName", "givenName");

-- CreateIndex
CREATE INDEX "Person_familyId_branchLabel_idx" ON "Person"("familyId", "branchLabel");

-- CreateIndex
CREATE UNIQUE INDEX "Person_id_familyId_key" ON "Person"("id", "familyId");

-- CreateIndex
CREATE INDEX "ParentChildRelationship_familyId_idx" ON "ParentChildRelationship"("familyId");

-- CreateIndex
CREATE INDEX "ParentChildRelationship_childId_idx" ON "ParentChildRelationship"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentChildRelationship_parentId_childId_key" ON "ParentChildRelationship"("parentId", "childId");

-- CreateIndex
CREATE INDEX "Union_familyId_idx" ON "Union"("familyId");

-- CreateIndex
CREATE INDEX "Union_partnerBId_idx" ON "Union"("partnerBId");

-- CreateIndex
CREATE UNIQUE INDEX "Union_partnerAId_partnerBId_key" ON "Union"("partnerAId", "partnerBId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_familyId_idx" ON "MediaAsset"("familyId");

-- CreateIndex
CREATE INDEX "PersonPhoto_personId_idx" ON "PersonPhoto"("personId");

-- CreateIndex
CREATE INDEX "PersonPhoto_familyId_idx" ON "PersonPhoto"("familyId");

-- CreateIndex
CREATE INDEX "Album_familyId_idx" ON "Album"("familyId");

-- CreateIndex
CREATE INDEX "Memory_familyId_year_idx" ON "Memory"("familyId", "year");

-- CreateIndex
CREATE INDEX "Memory_familyId_eventType_idx" ON "Memory"("familyId", "eventType");

-- CreateIndex
CREATE INDEX "Memory_albumId_idx" ON "Memory"("albumId");

-- CreateIndex
CREATE INDEX "MemoryPerson_personId_idx" ON "MemoryPerson"("personId");

-- CreateIndex
CREATE INDEX "TimelineEvent_familyId_year_idx" ON "TimelineEvent"("familyId", "year");

-- CreateIndex
CREATE INDEX "TimelineEvent_personId_idx" ON "TimelineEvent"("personId");

-- CreateIndex
CREATE INDEX "AuditLog_familyId_createdAt_idx" ON "AuditLog"("familyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMembership" ADD CONSTRAINT "FamilyMembership_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMembership" ADD CONSTRAINT "FamilyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMembership" ADD CONSTRAINT "FamilyMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvitation" ADD CONSTRAINT "FamilyInvitation_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvitation" ADD CONSTRAINT "FamilyInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_portraitMediaId_fkey" FOREIGN KEY ("portraitMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChildRelationship" ADD CONSTRAINT "ParentChildRelationship_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChildRelationship" ADD CONSTRAINT "ParentChildRelationship_parentId_familyId_fkey" FOREIGN KEY ("parentId", "familyId") REFERENCES "Person"("id", "familyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChildRelationship" ADD CONSTRAINT "ParentChildRelationship_childId_familyId_fkey" FOREIGN KEY ("childId", "familyId") REFERENCES "Person"("id", "familyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Union" ADD CONSTRAINT "Union_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Union" ADD CONSTRAINT "Union_partnerAId_familyId_fkey" FOREIGN KEY ("partnerAId", "familyId") REFERENCES "Person"("id", "familyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Union" ADD CONSTRAINT "Union_partnerBId_familyId_fkey" FOREIGN KEY ("partnerBId", "familyId") REFERENCES "Person"("id", "familyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonPhoto" ADD CONSTRAINT "PersonPhoto_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonPhoto" ADD CONSTRAINT "PersonPhoto_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonPhoto" ADD CONSTRAINT "PersonPhoto_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryPerson" ADD CONSTRAINT "MemoryPerson_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "Memory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryPerson" ADD CONSTRAINT "MemoryPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "Memory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Integrity rules not expressible in the Prisma schema

-- Nobody is their own parent; partners are stored once in canonical order.
ALTER TABLE "ParentChildRelationship" ADD CONSTRAINT "ParentChild_not_self" CHECK ("parentId" <> "childId");
ALTER TABLE "Union" ADD CONSTRAINT "Union_ordered_pair" CHECK ("partnerAId" < "partnerBId");
ALTER TABLE "Union" ADD CONSTRAINT "Union_years" CHECK ("startYear" IS NULL OR "endYear" IS NULL OR "endYear" >= "startYear");

-- Partial dates: month needs a year, day needs a month, ranges are sane.
ALTER TABLE "Person" ADD CONSTRAINT "Person_birth_date" CHECK (
  ("birthMonth" IS NULL OR ("birthYear" IS NOT NULL AND "birthMonth" BETWEEN 1 AND 12)) AND
  ("birthDay" IS NULL OR ("birthMonth" IS NOT NULL AND "birthDay" BETWEEN 1 AND 31)));
ALTER TABLE "Person" ADD CONSTRAINT "Person_death_date" CHECK (
  ("deathMonth" IS NULL OR ("deathYear" IS NOT NULL AND "deathMonth" BETWEEN 1 AND 12)) AND
  ("deathDay" IS NULL OR ("deathMonth" IS NOT NULL AND "deathDay" BETWEEN 1 AND 31)));
ALTER TABLE "Person" ADD CONSTRAINT "Person_living_no_death" CHECK (NOT ("isLiving" IS TRUE AND "deathYear" IS NOT NULL));

-- Only one public demo family.
CREATE UNIQUE INDEX "Family_single_public_demo" ON "Family" ("isPublicDemo") WHERE "isPublicDemo" = true;

-- Case-insensitive search on names.
CREATE INDEX "Person_givenName_lower_idx" ON "Person" (lower("givenName"));
CREATE INDEX "Person_familyName_lower_idx" ON "Person" (lower("familyName"));
