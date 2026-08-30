import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProtectedRoute from "@/components/ProtectedRoute";

let authState: {
  user: { id: string } | null;
  roles: string[];
  loading: boolean;
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

const renderProtected = (allowedRoles?: Array<"customer" | "trade" | "admin">) => render(
  <MemoryRouter initialEntries={["/secure"]}>
    <Routes>
      <Route path="/" element={<div>Home</div>} />
      <Route path="/login" element={<div>Login</div>} />
      <Route
        path="/secure"
        element={<ProtectedRoute allowedRoles={allowedRoles}><div>Secure</div></ProtectedRoute>}
      />
    </Routes>
  </MemoryRouter>,
);

describe("ProtectedRoute", () => {
  beforeEach(() => {
    authState = { user: { id: "user-1" }, roles: ["customer"], loading: false };
  });

  it("redirects signed-out visitors to login", () => {
    authState.user = null;
    authState.roles = [];
    renderProtected();
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("redirects a user who lacks the required role", () => {
    renderProtected(["trade"]);
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders for an allowed role", () => {
    renderProtected(["customer"]);
    expect(screen.getByText("Secure")).toBeInTheDocument();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex,nofollow");
  });
});
