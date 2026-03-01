import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockSignIn = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignIn,
    },
  }),
}));

import LoginPage from "@/app/(auth)/login/page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
  });

  it("renders email field", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders password field", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders sign in button", () => {
    render(<LoginPage />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("renders sign up link", () => {
    render(<LoginPage />);
    expect(screen.getByText("Sign up")).toBeInTheDocument();
  });

  it("validates empty email", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Password"), "password123");
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Please enter your email address.")).toBeInTheDocument();
    });
  });

  it("validates empty password", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Please enter your password.")).toBeInTheDocument();
    });
  });

  it("calls signInWithPassword", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password123",
      });
    });
  });

  it("redirects on success", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("shows error on auth failure", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid credentials" } });
    render(<LoginPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("maps email_or_phone error", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid login credentials. Please check your email or phone and password." } });
    render(<LoginPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "bad");
    await user.type(screen.getByLabelText("Password"), "pass");
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    });
  });

  it("shows loading state", async () => {
    let resolvePromise: (value: { error: null }) => void;
    mockSignIn.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));
    render(<LoginPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Signing in...")).toBeInTheDocument();
    });
    resolvePromise!({ error: null });
  });
});
