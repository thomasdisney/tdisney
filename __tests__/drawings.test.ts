import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDrawing, MaxSessionsError, renameDrawing } from '@/lib/drawings';
import type { Drawing } from '@/lib/drawings';

vi.mock('@/lib/supabaseClient', () => {
  return {
    getSupabaseClient: vi.fn()
  };
});

const { getSupabaseClient } = await import('@/lib/supabaseClient');

type MockSupabaseClient = {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
  storage: {
    from: ReturnType<typeof vi.fn>;
  };
};

function createClient(): MockSupabaseClient {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null }))
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: null, error: null })),
        remove: vi.fn(async () => ({ data: null, error: null })),
        createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://example.com/signed' }, error: null }))
      }))
    }
  };
}

function mockCountQuery(client: MockSupabaseClient, count: number, error: unknown = null) {
  client.from.mockImplementationOnce(() => ({
    select: vi.fn(async () => ({ count, error }))
  }));
}

function mockInsertQuery(client: MockSupabaseClient, drawing: Drawing, error: unknown = null) {
  client.from.mockImplementationOnce(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: error ? null : drawing, error }))
      }))
    }))
  }));
}

function mockRenameQuery(client: MockSupabaseClient, error: unknown = null) {
  client.from.mockImplementationOnce(() => ({
    update: vi.fn(() => ({
      eq: vi.fn(async () => ({ error }))
    }))
  }));
}

const getSupabaseClientMock = getSupabaseClient as unknown as ReturnType<typeof vi.fn>;

describe('drawings library', () => {
  let client: MockSupabaseClient;

  beforeEach(() => {
    getSupabaseClientMock.mockReset();
    client = createClient();
    getSupabaseClientMock.mockReturnValue(client);
  });

  it('creates a drawing when under the limit', async () => {
    const drawing: Drawing = {
      id: 'drawing-1',
      owner: 'user-1',
      title: 'Warehouse A',
      elements: [],
      bg_image_path: null,
      updated_at: new Date().toISOString()
    };
    mockCountQuery(client, 1);
    mockInsertQuery(client, drawing);

    const result = await createDrawing('Warehouse A', []);

    expect(result).toEqual(drawing);
    expect(client.from).toHaveBeenNthCalledWith(1, 'drawings');
    expect(client.from).toHaveBeenNthCalledWith(2, 'drawings');
  });

  it('throws MaxSessionsError when the limit is reached', async () => {
    mockCountQuery(client, 3);

    await expect(createDrawing('Overflow', [])).rejects.toBeInstanceOf(MaxSessionsError);
  });

  it('surface duplicate title errors from renameDrawing', async () => {
    mockRenameQuery(client, { code: '23505', message: 'duplicate key value violates unique constraint' });

    await expect(renameDrawing('drawing-1', 'Conflict')).rejects.toThrow(
      'You already have a session with that name.'
    );
  });
});
