import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JobDetailPage from "@/pages/JobDetailPage";

const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "unselected-trader" }, roles: ["trade"] }),
}));
vi.mock("@/hooks/use-evidence-urls", () => ({ useEvidenceUrls: () => ({}) }));
vi.mock("@/components/RepairIntelligencePanel", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from, rpc } }));

const leadId = "00000000-0000-4000-8000-000000000021";

const renderLead = () => render(
  <MemoryRouter initialEntries={[`/jobs/${leadId}`]}>
    <Routes>
      <Route path="/jobs/:id" element={<JobDetailPage />} />
    </Routes>
  </MemoryRouter>,
);

describe("unselected trader project preview", () => {
  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
    from.mockImplementation((table: string) => {
      if (table !== "jobs") throw new Error(`Private table queried before full job authorisation: ${table}`);
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
      };
    });
    rpc.mockResolvedValue({
      data: [{
        id: leadId,
        title: "Builder project",
        requested_trade: "builder",
        city: "Luton",
        postcode_district: "LU3",
        status: "posted",
        created_at: "2026-11-01T07:00:00Z",
        project_category: "renovation",
        budget_min: 100,
        budget_max: 1000,
      }],
      error: null,
    });
  });

  it("renders a safe lead without fetching quotes, media, scope or exact location", async () => {
    renderLead();
    expect(await screen.findByRole("heading", { name: "Builder project" })).toBeInTheDocument();
    expect(screen.getByText(/LU3 district/)).toBeInTheDocument();
    expect(screen.getByText(/customer identity, street address/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Prepare a quotation" })).toHaveAttribute("href", `/jobs/${leadId}/quote`);
    await waitFor(() => expect(from).toHaveBeenCalledTimes(1));
    expect(rpc).toHaveBeenCalledWith("list_project_job_previews", { p_job_id: leadId });
    expect(screen.queryByText(/Confidential Road/)).not.toBeInTheDocument();
  });

  it("fails closed if an unavailable backend returns no preview", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    renderLead();
    expect(await screen.findByText("Job not found or not available to your account.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Prepare a quotation" })).not.toBeInTheDocument();
  });
});
