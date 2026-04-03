import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import SmartOrderPage from "./pages/SmartOrderPage";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import AppLayout from "./components/AppLayout";
import ScrollToTop from "./components/ScrollToTop";
import TraderLayout from "./components/TraderLayout";
import DriverLayout from "./components/DriverLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import KycGate from "./components/KycGate";
import LandingPage from "./pages/LandingPage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import SubmitQuotePage from "./pages/SubmitQuotePage";
import MaterialsPage from "./pages/MaterialsPage";
import DeliveriesPage from "./pages/DeliveriesPage";
import MarketplacePage from "./pages/MarketplacePage";
import TraderProfilePage from "./pages/TraderProfilePage";
import TraderDashboard from "./pages/TraderDashboard";
import TradeAccountsPage from "./pages/TradeAccountsPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import MessagesPage from "./pages/MessagesPage";
import SiteEvidencePage from "./pages/SiteEvidencePage";
import SiteEvidenceProjectPage from "./pages/SiteEvidenceProjectPage";
import EvidenceCameraPage from "./pages/EvidenceCameraPage";
import EvidenceGalleryPage from "./pages/EvidenceGalleryPage";
import ComplianceCertsPage from "./pages/ComplianceCertsPage";
import PostJobPage from "./pages/PostJobPage";
import DriverDashboard from "./pages/DriverDashboard";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import BroadcastsPage from "./pages/BroadcastsPage";
import KycUploadPage from "./pages/KycUploadPage";
import AdminKycPage from "./pages/AdminKycPage";
import SchedulePage from "./pages/SchedulePage";
import DailyLogsPage from "./pages/DailyLogsPage";
import CustomerPortalPage from "./pages/CustomerPortalPage";
import OrderReceiptPage from "./pages/OrderReceiptPage";
import VerifyOrderPage from "./pages/VerifyOrderPage";
import AgentLayout from "./components/AgentLayout";
import AdminLayout from "./components/AdminLayout";
import AgentDashboard from "./pages/AgentDashboard";
import AgentReferralsPage from "./pages/AgentReferralsPage";
import AgentCommissionsPage from "./pages/AgentCommissionsPage";
import AgentAnalyticsPage from "./pages/AgentAnalyticsPage";
import AgentReferralLinkPage from "./pages/AgentReferralLinkPage";
import AccountingPage from "./pages/AccountingPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import AdminAgentsPage from "./pages/AdminAgentsPage";
import AdminAuditLogPage from "./pages/AdminAuditLogPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            {/* Public pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-order/:orderId" element={<VerifyOrderPage />} />
            <Route path="/profile-setup" element={
              <ProtectedRoute>
                <ProfileSetupPage />
              </ProtectedRoute>
            } />

            {/* Full-screen camera (outside layout — no sidebar/nav) */}
            <Route path="/site-evidence/:jobId/camera" element={
              <ProtectedRoute allowedRoles={["trade", "admin"]}>
                <EvidenceCameraPage />
              </ProtectedRoute>
            } />

            {/* Trader layout (sidebar desktop, bottom nav mobile) — BEFORE AppLayout so authenticated traders match first */}
            <Route element={
              <ProtectedRoute allowedRoles={["trade", "admin", "staff"]}>
                <KycGate>
                  <TraderLayout />
                </KycGate>
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<TraderDashboard />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/jobs/:jobId/quote" element={<SubmitQuotePage />} />
              <Route path="/trade-accounts" element={<TradeAccountsPage />} />
              <Route path="/materials" element={<MaterialsPage />} />
              <Route path="/smart-order" element={<SmartOrderPage />} />
              <Route path="/site-evidence" element={<SiteEvidencePage />} />
              <Route path="/site-evidence/:jobId" element={<SiteEvidenceProjectPage />} />
              <Route path="/site-evidence/:jobId/gallery" element={<EvidenceGalleryPage />} />
              <Route path="/compliance" element={<ComplianceCertsPage />} />
              <Route path="/deliveries" element={<DeliveriesPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/broadcasts" element={<BroadcastsPage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/kyc-upload" element={<KycUploadPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/daily-logs" element={<DailyLogsPage />} />
              <Route path="/daily-logs/:jobId" element={<DailyLogsPage />} />
              <Route path="/orders/:orderId/receipt" element={<OrderReceiptPage />} />
              <Route path="/accounting" element={<AccountingPage />} />
            </Route>

            {/* Public / Customer layout (top nav) */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/trader/:id" element={<TraderProfilePage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/post-job" element={
                <ProtectedRoute>
                  <PostJobPage />
                </ProtectedRoute>
              } />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/my-projects" element={
                <ProtectedRoute allowedRoles={["customer", "admin"]}>
                  <CustomerPortalPage />
                </ProtectedRoute>
              } />
            </Route>

            {/* Admin layout */}
            <Route element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/kyc-review" element={<AdminKycPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/admin/agents" element={<AdminAgentsPage />} />
              <Route path="/admin/commissions" element={<AgentCommissionsPage />} />
              <Route path="/admin/broadcasts" element={<BroadcastsPage />} />
              <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
            </Route>

            {/* Driver layout (sidebar desktop, bottom nav mobile) */}
            <Route element={
              <ProtectedRoute allowedRoles={["driver", "admin"]}>
                <KycGate>
                  <DriverLayout />
                </KycGate>
              </ProtectedRoute>
            }>
              <Route path="/driver" element={<DriverDashboard />} />
              <Route path="/driver/deliveries" element={<DeliveriesPage />} />
              <Route path="/driver/broadcasts" element={<BroadcastsPage />} />
              <Route path="/driver/kyc-upload" element={<KycUploadPage />} />
              <Route path="/driver/orders/:orderId/receipt" element={<OrderReceiptPage />} />
            </Route>

            {/* Agent layout (sidebar desktop, bottom nav mobile) */}
            <Route element={
              <ProtectedRoute allowedRoles={["agent", "admin"]}>
                <AgentLayout />
              </ProtectedRoute>
            }>
              <Route path="/agent" element={<AgentDashboard />} />
              <Route path="/agent/referrals" element={<AgentReferralsPage />} />
              <Route path="/agent/commissions" element={<AgentCommissionsPage />} />
              <Route path="/agent/analytics" element={<AgentAnalyticsPage />} />
              <Route path="/agent/referral-link" element={<AgentReferralLinkPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
