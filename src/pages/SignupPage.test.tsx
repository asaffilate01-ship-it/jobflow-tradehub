import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupPage from "@/pages/SignupPage";

const { signUp } = vi.hoisted(() => ({ signUp: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signUp } } }));
vi.mock("@/hooks/use-page-meta", () => ({ usePageMeta: () => {} }));
vi.mock("@/components/Logo", () => ({ default: () => <span>Craftvaro</span> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const showSignup = () => render(
  <MemoryRouter initialEntries={["/signup"]}>
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<div>Login ready</div>} />
      <Route path="/profile-setup" element={<div>Profile setup ready</div>} />
    </Routes>
  </MemoryRouter>,
);

const enterDetails = () => {
  fireEvent.change(screen.getByPlaceholderText("John Smith"), { target: { value: "Sample User" } });
  fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "sample@example.test" } });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "SamplePass123!" } });
};

describe("registration with server-owned role assignment", () => {
  beforeEach(() => signUp.mockReset());

  it("asks for email confirmation and never initiates a separate phone OTP signup", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "new" }, session: null }, error: null });
    showSignup();
    enterDetails();
    fireEvent.click(screen.getByRole("button", { name: /Tradesperson/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(screen.getByText("Login ready")).toBeInTheDocument());
    expect(signUp).toHaveBeenCalledTimes(1);
    expect(signUp.mock.calls[0][0].options.data).toEqual({ full_name: "Sample User", role: "trade" });
    expect(screen.queryByText("Verify your phone")).not.toBeInTheDocument();
  });

  it("navigates signed-in users into real profile setup after the role trigger", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "new" }, session: { access_token: "test" } }, error: null });
    showSignup();
    enterDetails();
    fireEvent.click(screen.getByRole("button", { name: /Driver/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(screen.getByText("Profile setup ready")).toBeInTheDocument());
    expect(signUp.mock.calls[0][0].options.data.role).toBe("driver");
  });

  it("does not claim the account was created when the auth API rejects signup", async () => {
    signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Registration unavailable" } });
    showSignup();
    enterDetails();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Create account" })).not.toBeDisabled());
    expect(screen.queryByText("Login ready")).not.toBeInTheDocument();
  });
});
