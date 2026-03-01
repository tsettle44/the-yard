import { vi } from "vitest";

// Mock for next/headers
export const mockCookies = {
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

// Mock for next/navigation
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

export const mockSearchParams = new URLSearchParams();

export function setupNextMocks() {
  vi.mock("next/headers", () => ({
    cookies: vi.fn().mockResolvedValue(mockCookies),
  }));

  vi.mock("next/navigation", () => ({
    useRouter: () => mockRouter,
    useSearchParams: () => mockSearchParams,
    usePathname: () => "/",
    redirect: vi.fn(),
  }));

  vi.mock("next/link", () => ({
    default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => {
      return { type: "a", props: { href, ...props, children } };
    },
  }));
}
