/**
 * Helpers pour la gestion des médias (Vercel Blob).
 * SERVER-ONLY.
 */

import "server-only";

import { put, del, type PutBlobResult } from "@vercel/blob";
import { prisma } from "@/lib/kpi/store";
import type { MediaAsset, MediaKind } from "./types";

interface DbMediaAsset {
  id: number;
  contentId: number;
  kind: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  alt: string | null;
  caption: string | null;
  position: number;
  createdAt: Date;
}

function toMedia(row: DbMediaAsset): MediaAsset {
  return {
    id: row.id,
    contentId: row.contentId,
    kind: row.kind as MediaKind,
    url: row.url,
    filename: row.filename,
    size: row.size,
    mimeType: row.mimeType,
    alt: row.alt,
    caption: row.caption,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

function inferKind(mimeType: string): MediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIMES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf",
];

/**
 * Upload un fichier vers Vercel Blob et crée la ligne MediaAsset associée.
 */
export async function uploadMedia(input: {
  contentId: number;
  file: File;
  alt?: string;
  caption?: string;
}): Promise<MediaAsset> {
  if (input.file.size > MAX_SIZE) {
    throw new Error(`Fichier trop volumineux (max ${MAX_SIZE / 1024 / 1024} MB).`);
  }
  if (!ALLOWED_MIMES.includes(input.file.type)) {
    throw new Error(`Type MIME non autorisé : ${input.file.type}`);
  }

  // Path : pilotage/<contentId>/<timestamp>-<sanitized-name>
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `pilotage/${input.contentId}/${Date.now()}-${safeName}`;

  const blob: PutBlobResult = await put(pathname, input.file, {
    access: "public",
    addRandomSuffix: false,
    contentType: input.file.type,
  });

  // Détermine la position : max + 1
  const lastPosition = await prisma.mediaAsset.aggregate({
    where: { contentId: input.contentId },
    _max: { position: true },
  });
  const nextPosition = (lastPosition._max.position ?? -1) + 1;

  const row = await prisma.mediaAsset.create({
    data: {
      contentId: input.contentId,
      kind: inferKind(input.file.type),
      url: blob.url,
      filename: input.file.name,
      size: input.file.size,
      mimeType: input.file.type,
      alt: input.alt ?? null,
      caption: input.caption ?? null,
      position: nextPosition,
    },
  });

  return toMedia(row);
}

export async function listMedia(contentId: number): Promise<MediaAsset[]> {
  const rows = await prisma.mediaAsset.findMany({
    where: { contentId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toMedia);
}

export async function deleteMedia(mediaId: number): Promise<void> {
  const row = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!row) return;
  try {
    await del(row.url);
  } catch (err) {
    console.warn("[deleteMedia] Vercel Blob del failed:", (err as Error).message);
  }
  await prisma.mediaAsset.delete({ where: { id: mediaId } });
}

export async function updateMediaMeta(input: {
  mediaId: number;
  alt?: string | null;
  caption?: string | null;
  position?: number;
}): Promise<MediaAsset> {
  const row = await prisma.mediaAsset.update({
    where: { id: input.mediaId },
    data: {
      alt: input.alt,
      caption: input.caption,
      position: input.position,
    },
  });
  return toMedia(row);
}
