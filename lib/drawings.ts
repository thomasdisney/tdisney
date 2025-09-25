import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';

export type SceneElement = {
  id: string;
  type: 'image' | 'rect' | 'text';
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotation?: number;
  scale?: number;
  z?: number;
  src?: string;
  text?: string;
  style?: { fill?: string; stroke?: string; [k: string]: unknown };
  locked?: boolean;
};

export type Drawing = {
  id: string;
  owner: string;
  title: string;
  elements: SceneElement[];
  bg_image_path: string | null;
  updated_at: string;
};

const DRAWINGS_TABLE = 'drawings';
const DRAWING_IMAGES_BUCKET = 'drawing-images';
const MAX_SESSIONS = 3;

type SupabaseUser = {
  id: string;
};

async function requireUser(client: SupabaseClient): Promise<SupabaseUser> {
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) {
    throw new Error('You must be signed in to manage sessions.');
  }
  return { id: data.user.id };
}

function getFileExtension(file: File): string {
  const mimeExtension = file.type.split('/')[1];
  if (mimeExtension) {
    return mimeExtension;
  }
  const parts = file.name.split('.');
  return parts.length > 1 ? parts.pop() ?? 'png' : 'png';
}

async function uploadBackgroundImage(
  client: SupabaseClient,
  ownerId: string,
  drawingId: string,
  file: File
): Promise<string> {
  const ext = getFileExtension(file);
  const path = `${ownerId}/${drawingId}.${ext}`;
  // Use upsert=true to replace existing assets without requiring an explicit delete.
  const { error } = await client.storage
    .from(DRAWING_IMAGES_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type || 'image/png' });
  if (error) {
    throw error;
  }
  return path;
}

export async function getSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(DRAWING_IMAGES_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw error ?? new Error('Unable to create signed URL.');
  }
  return data.signedUrl;
}

export async function listDrawings(): Promise<Drawing[]> {
  const client = getSupabaseClient();
  const user = await requireUser(client);
  const { data, error } = await client
    .from(DRAWINGS_TABLE)
    .select('*')
    .eq('owner', user.id)
    .order('updated_at', { ascending: false })
    .limit(MAX_SESSIONS);
  if (error) {
    throw error;
  }
  return (data ?? []) as Drawing[];
}

export type CreateDrawingResult = {
  drawing: Drawing;
  replacedDrawing: { id: string; title: string } | null;
};

export async function createDrawing(
  title: string,
  elements: SceneElement[],
  bgFile?: File
): Promise<CreateDrawingResult> {
  const client = getSupabaseClient();
  const user = await requireUser(client);

  const { data: existingData, error: existingError } = await client
    .from(DRAWINGS_TABLE)
    .select('*')
    .eq('owner', user.id)
    .order('updated_at', { ascending: true })
    .limit(MAX_SESSIONS);
  if (existingError) {
    throw existingError;
  }

  const existing = (existingData ?? []) as Drawing[];

  if (existing.length < MAX_SESSIONS) {
    const drawingId = crypto.randomUUID();
    let bgImagePath: string | null = null;
    if (bgFile) {
      bgImagePath = await uploadBackgroundImage(client, user.id, drawingId, bgFile);
    }

    const insertPayload = {
      id: drawingId,
      owner: user.id,
      title,
      elements,
      bg_image_path: bgImagePath,
      updated_at: new Date().toISOString()
    } satisfies Partial<Drawing> & { owner: string; title: string; elements: SceneElement[] };

    const { data, error } = await client.from(DRAWINGS_TABLE).insert(insertPayload).select().single();
    if (error) {
      if (error.code === '23505') {
        throw new Error('You already have a session with that name.');
      }
      throw error;
    }
    return { drawing: data as Drawing, replacedDrawing: null };
  }

  const oldest = existing[0];
  let replacementBgPath: string | null = oldest.bg_image_path ?? null;

  if (bgFile) {
    const newPath = await uploadBackgroundImage(client, user.id, oldest.id, bgFile);
    if (oldest.bg_image_path && oldest.bg_image_path !== newPath) {
      const { error: removeError } = await client.storage
        .from(DRAWING_IMAGES_BUCKET)
        .remove([oldest.bg_image_path]);
      if (removeError) {
        throw removeError;
      }
    }
    replacementBgPath = newPath;
  } else if (oldest.bg_image_path) {
    const { error: removeError } = await client.storage
      .from(DRAWING_IMAGES_BUCKET)
      .remove([oldest.bg_image_path]);
    if (removeError) {
      throw removeError;
    }
    replacementBgPath = null;
  }

  const { data, error } = await client
    .from(DRAWINGS_TABLE)
    .update({
      title,
      elements,
      bg_image_path: replacementBgPath,
      updated_at: new Date().toISOString()
    })
    .eq('id', oldest.id)
    .eq('owner', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You already have a session with that name.');
    }
    throw error;
  }

  return {
    drawing: data as Drawing,
    replacedDrawing: { id: oldest.id, title: oldest.title }
  };
}

export async function updateDrawing(
  id: string,
  elements: SceneElement[],
  bgFile?: File
): Promise<{ bgPath: string | null }> {
  const client = getSupabaseClient();
  const user = await requireUser(client);
  const updateData: Partial<Drawing> = {
    elements,
    updated_at: new Date().toISOString()
  };

  if (bgFile) {
    const path = await uploadBackgroundImage(client, user.id, id, bgFile);
    updateData.bg_image_path = path;
  }

  const { data, error } = await client
    .from(DRAWINGS_TABLE)
    .update(updateData)
    .eq('id', id)
    .eq('owner', user.id)
    .select('bg_image_path')
    .single();
  if (error) {
    throw error;
  }

  const payload = data as { bg_image_path: string | null } | null;
  return { bgPath: payload?.bg_image_path ?? updateData.bg_image_path ?? null };
}

export async function renameDrawing(id: string, newTitle: string): Promise<void> {
  const client = getSupabaseClient();
  const user = await requireUser(client);
  const { error } = await client
    .from(DRAWINGS_TABLE)
    .update({ title: newTitle, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner', user.id);
  if (error) {
    if (error.code === '23505') {
      throw new Error('You already have a session with that name.');
    }
    throw error;
  }
}

export async function deleteDrawing(id: string): Promise<void> {
  const client = getSupabaseClient();
  const user = await requireUser(client);
  const { data: existing, error: selectError } = await client
    .from(DRAWINGS_TABLE)
    .select('bg_image_path')
    .eq('id', id)
    .eq('owner', user.id)
    .single();
  if (selectError) {
    throw selectError;
  }

  const { error: deleteError } = await client
    .from(DRAWINGS_TABLE)
    .delete()
    .eq('id', id)
    .eq('owner', user.id);
  if (deleteError) {
    throw deleteError;
  }

  const path = (existing as { bg_image_path: string | null } | null)?.bg_image_path;
  if (path) {
    const { error: storageError } = await client.storage.from(DRAWING_IMAGES_BUCKET).remove([path]);
    if (storageError) {
      // Surface the storage error so the UI can notify the user, but the DB delete already succeeded.
      throw storageError;
    }
  }
}

export async function loadDrawing(
  id: string
): Promise<{ elements: SceneElement[]; bgUrl: string | null; bgPath: string | null }> {
  const client = getSupabaseClient();
  const user = await requireUser(client);
  const { data, error } = await client
    .from(DRAWINGS_TABLE)
    .select('elements, bg_image_path')
    .eq('id', id)
    .eq('owner', user.id)
    .single();
  if (error) {
    throw error;
  }

  const record = data as { elements: SceneElement[]; bg_image_path: string | null };
  let bgUrl: string | null = null;
  if (record.bg_image_path) {
    bgUrl = await getSignedUrl(record.bg_image_path);
  }

  return {
    elements: record.elements ?? [],
    bgUrl,
    bgPath: record.bg_image_path ?? null
  };
}
