import { vi } from "vitest";

export interface MockSupabaseChain {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signUp: ReturnType<typeof vi.fn>;
    exchangeCodeForSession: ReturnType<typeof vi.fn>;
  };
  _result: { data: unknown; error: unknown };
}

export function createMockSupabase(defaults?: { data?: unknown; error?: unknown }): MockSupabaseChain {
  const result = { data: defaults?.data ?? null, error: defaults?.error ?? null };

  const chain: MockSupabaseChain = {
    _result: result,
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
    },
  };

  // Make every chain method return the chain itself for fluent chaining
  const chainMethods = ["from", "select", "insert", "update", "delete", "upsert", "eq", "in", "is", "or", "order"] as const;
  for (const method of chainMethods) {
    chain[method].mockReturnValue(chain);
  }

  // single() resolves the chain
  chain.single.mockImplementation(() => Promise.resolve(result));

  // rpc returns a promise directly
  chain.rpc.mockResolvedValue(result);

  // Make the chain thenable so `await supabase.from(...).select(...)` works
  const thenableResult = () => Promise.resolve(result);
  for (const method of chainMethods) {
    const original = chain[method].getMockImplementation() || (() => chain);
    chain[method].mockImplementation((...args: unknown[]) => {
      const ret = { ...chain, then: (resolve: (v: unknown) => void) => thenableResult().then(resolve) };
      return ret;
    });
  }

  // Re-implement so `from` returns something with all chainable methods
  function makeChainable() {
    const obj: Record<string, unknown> = {};
    for (const m of [...chainMethods, "single", "rpc"] as const) {
      obj[m] = chain[m];
    }
    obj.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
    return obj;
  }

  for (const method of chainMethods) {
    chain[method].mockReturnValue(makeChainable());
  }
  chain.single.mockImplementation(() => Promise.resolve(result));

  return chain;
}

// Helper to set the result that the chain will resolve with
export function setMockResult(mock: MockSupabaseChain, data: unknown, error: unknown = null) {
  mock._result.data = data;
  mock._result.error = error;
}
