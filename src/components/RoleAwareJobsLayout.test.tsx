import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RoleAwareJobsLayout from "@/components/RoleAwareJobsLayout";

let roles: string[] = [];

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ roles }),
}));
vi.mock("@/components/AppLayout", () => ({ default: () => <div>Customer jobs shell</div> }));
vi.mock("@/components/TraderLayout", () => ({ default: () => <div>Trader jobs shell</div> }));
vi.mock("@/components/KycGate", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe("RoleAwareJobsLayout", () => {
  beforeEach(() => { roles = []; });

  it("uses the customer/public shell for customers", () => {
    roles = ["customer"];
    render(<RoleAwareJobsLayout />);
    expect(screen.getByText("Customer jobs shell")).toBeInTheDocument();
  });

  it("uses the KYC-gated trader shell for trader roles", () => {
    roles = ["trade"];
    render(<RoleAwareJobsLayout />);
    expect(screen.getByText("Trader jobs shell")).toBeInTheDocument();
  });
});
