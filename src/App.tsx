import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import AppLayout from "./components/AppLayout";
import RoleAwareJobsLayout from "./components/RoleAwareJobsLayout";
import ScrollToTop from "./components/ScrollToTop";
import TraderLayout from "./components/TraderLayout";
import DriverLayout from "./components/DriverLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import KycGate from "./components/KycGate";
import TierGate from "./components/TierGate";
import CookieNotice from "./components/CookieNotice";

import PromoGate, { UnlockScreen } from "./components/PromoGate";
import PromoHomePage from "./pages/PromoHomePage";
import AgentLayout from "./components/AgentLayout";
import AdminLayout from "./components/AdminLayout";

const SmartOrderPage = lazy(() => import("./pages/SmartOrderPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const JobDetailPage = lazy(() => import("./pages/JobDetailPage"));
const SubmitQuotePage = lazy(() => import("./pages/SubmitQuotePage"));
const MaterialsPage = lazy(() => import("./pages/MaterialsPage"));
const DeliveriesPage = lazy(() => import("./pages/DeliveriesPage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const TraderProfilePage = lazy(() => import("./pages/TraderProfilePage"));
const TraderDashboard = lazy(() => import("./pages/TraderDashboard"));
const TradeAccountsPage = lazy(() => import("./pages/TradeAccountsPage"));
const ProfileSetupPage = lazy(() => import("./pages/ProfileSetupPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const SiteEvidencePage = lazy(() => import("./pages/SiteEvidencePage"));
const SiteEvidenceProjectPage = lazy(() => import("./pages/SiteEvidenceProjectPage"));
const EvidenceCameraPage = lazy(() => import("./pages/EvidenceCameraPage"));
const EvidenceGalleryPage = lazy(() => import("./pages/EvidenceGalleryPage"));
const ComplianceCertsPage = lazy(() => import("./pages/ComplianceCertsPage"));
const PostJobPage = lazy(() => import("./pages/PostJobPage"));
const RepairAssistPage = lazy(() => import("./pages/RepairAssistPage"));
const RepairOpportunitiesPage = lazy(() => import("./pages/RepairOpportunitiesPage"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const BroadcastsPage = lazy(() => import("./pages/BroadcastsPage"));
const KycUploadPage = lazy(() => import("./pages/KycUploadPage"));
const AdminKycPage = lazy(() => import("./pages/AdminKycPage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const DailyLogsPage = lazy(() => import("./pages/DailyLogsPage"));
const CustomerPortalPage = lazy(() => import("./pages/CustomerPortalPage"));
const OrderReceiptPage = lazy(() => import("./pages/OrderReceiptPage"));
const VerifyOrderPage = lazy(() => import("./pages/VerifyOrderPage"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const AgentReferralsPage = lazy(() => import("./pages/AgentReferralsPage"));
const AgentCommissionsPage = lazy(() => import("./pages/AgentCommissionsPage"));
const AgentAnalyticsPage = lazy(() => import("./pages/AgentAnalyticsPage"));
const AgentReferralLinkPage = lazy(() => import("./pages/AgentReferralLinkPage"));
const AccountingPage = lazy(() => import("./pages/AccountingPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalyticsPage"));
const AdminAgentsPage = lazy(() => import("./pages/AdminAgentsPage"));
const AdminAuditLogPage = lazy(() => import("./pages/AdminAuditLogPage"));
const AdminRepairProvidersPage = lazy(() => import("./pages/AdminRepairProvidersPage"));
const AdminTraderDirectoryPage = lazy(() => import("./pages/AdminTraderDirectoryPage"));
const AdminLaunchReadinessPage = lazy(() => import("./pages/AdminLaunchReadinessPage"));
const AdminPilotRunsPage = lazy(() => import("./pages/AdminPilotRunsPage"));
const AdminDeletionRequestsPage = lazy(() => import("./pages/AdminDeletionRequestsPage"));
const AdminIntegrationOperationsPage = lazy(() => import("./pages/AdminIntegrationOperationsPage"));
const ClaimTraderProfilePage = lazy(() => import("./pages/ClaimTraderProfilePage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const DeleteAccountPage = lazy(() => import("./pages/DeleteAccountPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
          <Routes>
            {/* Promo homepage — public, default */}
            <Route path="/" element={<PromoHomePage />} />
            <Route path="/unlock" element={<UnlockScreen />} />
            <Route path="/privacy" element={<LegalPage />} />
            <Route path="/terms" element={<LegalPage />} />
            <Route path="/cookies" element={<LegalPage />} />

            {/* Everything below requires the promo access password */}
            <Route element={<PromoGate><Outlet /></PromoGate>}>
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

            {/* Shared job routes use a role-aware shell to avoid duplicate-route redirects. */}
            <Route element={<RoleAwareJobsLayout />}>
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
            </Route>


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
              <Route path="/repair-opportunities" element={<RepairOpportunitiesPage />} />
              <Route path="/jobs/:jobId/quote" element={<TierGate required="basic" feature="Quoting"><SubmitQuotePage /></TierGate>} />
              <Route path="/trade-accounts" element={<TierGate required="premium" feature="Trade accounts"><TradeAccountsPage /></TierGate>} />
              <Route path="/materials" element={<TierGate required="premium" feature="Material ordering"><MaterialsPage /></TierGate>} />
              <Route path="/smart-order" element={<TierGate required="premium" feature="Smart ordering"><SmartOrderPage /></TierGate>} />
              <Route path="/site-evidence" element={<TierGate required="premium" feature="Site evidence"><SiteEvidencePage /></TierGate>} />
              <Route path="/site-evidence/:jobId" element={<TierGate required="premium" feature="Site evidence"><SiteEvidenceProjectPage /></TierGate>} />
              <Route path="/site-evidence/:jobId/gallery" element={<TierGate required="premium" feature="Site evidence"><EvidenceGalleryPage /></TierGate>} />
              <Route path="/compliance" element={<TierGate required="premium" feature="Compliance certificates"><ComplianceCertsPage /></TierGate>} />
              <Route path="/deliveries" element={<TierGate required="premium" feature="Deliveries"><DeliveriesPage /></TierGate>} />
              <Route path="/messages" element={<TierGate required="basic" feature="Messaging"><MessagesPage /></TierGate>} />
              <Route path="/broadcasts" element={<BroadcastsPage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/kyc-upload" element={<KycUploadPage />} />
              <Route path="/schedule" element={<TierGate required="premium" feature="Scheduling"><SchedulePage /></TierGate>} />
              <Route path="/daily-logs" element={<TierGate required="premium" feature="Daily logs"><DailyLogsPage /></TierGate>} />
              <Route path="/daily-logs/:jobId" element={<TierGate required="premium" feature="Daily logs"><DailyLogsPage /></TierGate>} />
              <Route path="/orders/:orderId/receipt" element={<OrderReceiptPage />} />
              <Route path="/accounting" element={<TierGate required="premium" feature="Accounting"><AccountingPage /></TierGate>} />
            </Route>


            {/* Public / Customer layout (top nav) */}
            <Route element={<AppLayout />}>
              <Route path="/home" element={<LandingPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/trader/:id" element={<TraderProfilePage />} />
              <Route path="/claim-trader/:id" element={
                <ProtectedRoute>
                  <ClaimTraderProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/post-job" element={
                <ProtectedRoute>
                  <PostJobPage />
                </ProtectedRoute>
              } />
              <Route path="/repair-assist" element={
                <ProtectedRoute allowedRoles={["customer", "admin"]}>
                  <RepairAssistPage />
                </ProtectedRoute>
              } />
              <Route path="/my-projects" element={
                <ProtectedRoute allowedRoles={["customer", "admin"]}>
                  <CustomerPortalPage />
                </ProtectedRoute>
              } />
              <Route path="/account/delete" element={
                <ProtectedRoute>
                  <DeleteAccountPage />
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
              <Route path="/admin/repair-providers" element={<AdminRepairProvidersPage />} />
              <Route path="/admin/trader-directory" element={<AdminTraderDirectoryPage />} />
              <Route path="/admin/launch-readiness" element={<AdminLaunchReadinessPage />} />
              <Route path="/admin/pilot-runs" element={<AdminPilotRunsPage />} />
              <Route path="/admin/deletion-requests" element={<AdminDeletionRequestsPage />} />
              <Route path="/admin/integration-operations" element={<AdminIntegrationOperationsPage />} />
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
            </Route>
          </Routes>
          </Suspense>
          <CookieNotice />

        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
