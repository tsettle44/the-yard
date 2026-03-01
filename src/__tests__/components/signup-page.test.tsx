import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockSignUp = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
  }),
}));

import SignupPage from "@/app/(auth)/signup/page";

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({ error: null });
  });

  it("renders email field", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders password field", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders sign up button", () => {
    render(<SignupPage />);
    expect(screen.getByText("Sign Up")).toBeInTheDocument();
  });

  it("renders sign in link", () => {
    render(<SignupPage />);
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("calls signUp with email and password", async () => {
    render(<SignupPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    fireEvent.submit(screen.getByText("Sign Up").closest("form")!);
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password123",
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining("/callback"),
        }),
      });
    });
  });

  it("includes emailRedirectTo with origin/callback", async () => {
    render(<SignupPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    fireEvent.submit(screen.getByText("Sign Up").closest("form")!);
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            emailRedirectTo: expect.stringContaining("/callback"),
          },
        })
      );
    });
  });

  it("shows success message after signup", async () => {
    render(<SignupPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    fireEvent.submit(screen.getByText("Sign Up").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/Check your email/)).toBeInTheDocument();
    });
  });

  it("shows error on signup failure", async () => {
    mockSignUp.mockResolvedValue({ error: { message: "Email already registered" } });
    render(<SignupPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    fireEvent.submit(screen.getByText("Sign Up").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Email already registered")).toBeInTheDocument();
    });
  });

  it("has password minLength requirement", () => {
    render(<SignupPage />);
    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("minLength", "6");
  });
});
