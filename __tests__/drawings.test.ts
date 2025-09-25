import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDrawing, renameDrawing } from '@/lib/drawings';
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

function mockListQuery(client: MockSupabaseClient, drawings: Drawing[], error: unknown = null) {
  client.from.mockImplementationOnce(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        limit: vi.fn(async () => ({ data: error ? null : drawings, error }))
      }))
    }))
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

function mockUpdateQuery(client: MockSupabaseClient, drawing: Drawing, error: unknown = null) {
  client.from.mockImplementationOnce(() => ({
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: error ? null : drawing, error }))
        }))
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
    mockListQuery(client, []);
    mockInsertQuery(client, drawing);

    const result = await createDrawing('Warehouse A', []);

    expect(result.drawing).toEqual(drawing);
    expect(result.replacedDrawing).toBeNull();
    expect(client.from).toHaveBeenNthCalledWith(1, 'drawings');
    expect(client.from).toHaveBeenNthCalledWith(2, 'drawings');
  });

  it('overwrites the oldest drawing when the limit is reached', async () => {
    const now = Date.now();
    const existing: Drawing[] = [
      {
        id: 'drawing-oldest',
        owner: 'user-1',
        title: 'Oldest',
        elements: [],
        bg_image_path: 'oldest/path.png',
        updated_at: new Date(now - 10000).toISOString()
      },
      {
        id: 'drawing-middle',
        owner: 'user-1',
        title: 'Middle',
        elements: [],
        bg_image_path: null,
        updated_at: new Date(now - 5000).toISOString()
      },
      {
        id: 'drawing-newest',
        owner: 'user-1',
        title: 'Newest',
        elements: [],
        bg_image_path: null,
        updated_at: new Date(now).toISOString()
      }
    ];
    const updated: Drawing = {
      id: 'drawing-oldest',
      owner: 'user-1',
      title: 'Replacement',
      elements: [{ id: 'a', type: 'rect', x: 0, y: 0 }],
      bg_image_path: null,
      updated_at: new Date(now + 1000).toISOString()
    };

    mockListQuery(client, existing);
    mockUpdateQuery(client, updated);

    const result = await createDrawing('Replacement', [{ id: 'a', type: 'rect', x: 0, y: 0 }]);

    expect(result.drawing).toEqual(updated);
    expect(result.replacedDrawing).toEqual({ id: 'drawing-oldest', title: 'Oldest' });
    expect(client.from).toHaveBeenNthCalledWith(1, 'drawings');
    expect(client.from).toHaveBeenNthCalledWith(2, 'drawings');
  });

  it('surface duplicate title errors from renameDrawing', async () => {
    mockRenameQuery(client, { code: '23505', message: 'duplicate key value violates unique constraint' });

    await expect(renameDrawing('drawing-1', 'Conflict')).rejects.toThrow(
      'You already have a session with that name.'
    );
  });
});
