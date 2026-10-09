import * as React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/app/layouts/RootLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { AppLayout } from '@/app/layouts/AppLayout'
import { AdminLayout } from '@/app/layouts/AdminLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { AdminRoute } from './AdminRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary'
import { lazyWithRetry } from '@/lib/utils/lazyWithRetry'

// Lazy loaded page components with automatic retry fallback on chunk failure
const PublicProfilePage = lazyWithRetry(() => import('@/pages/public/PublicProfilePage'))
const CardTapRedirectPage = lazyWithRetry(() => import('@/pages/public/CardTapRedirectPage'))

// Auth pages
const LoginPage = lazyWithRetry(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazyWithRetry(() => import('@/pages/auth/RegisterPage'))
const VerifyEmailPage = lazyWithRetry(() => import('@/pages/auth/VerifyEmailPage'))
const ForgotPasswordPage = lazyWithRetry(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazyWithRetry(() => import('@/pages/auth/ResetPasswordPage'))

// App pages
const DashboardPage = lazyWithRetry(() => import('@/pages/app/DashboardPage'))
const ProfilePage = lazyWithRetry(() => import('@/pages/app/ProfilePage'))
const ProfileEditPage = lazyWithRetry(() => import('@/pages/app/ProfileEditPage'))
const ProfileTemplatesPage = lazyWithRetry(() => import('@/pages/app/ProfileTemplatesPage'))
const FeedPage = lazyWithRetry(() => import('@/pages/app/FeedPage'))
const DiscoveryPage = lazyWithRetry(() => import('@/pages/app/DiscoveryPage'))
const ConnectionsPage = lazyWithRetry(() => import('@/pages/app/ConnectionsPage'))
const MessagesPage = lazyWithRetry(() => import('@/pages/app/MessagesPage'))
const NotificationsPage = lazyWithRetry(() => import('@/pages/app/NotificationsPage'))
const AnalyticsPage = lazyWithRetry(() => import('@/pages/app/AnalyticsPage'))
const CardsPage = lazyWithRetry(() => import('@/pages/app/CardsPage'))
const OrdersPage = lazyWithRetry(() => import('@/pages/app/OrdersPage'))
const SettingsPage = lazyWithRetry(() => import('@/pages/app/SettingsPage'))
const SupportPage = lazyWithRetry(() => import('@/pages/app/SupportPage'))

// Organization & Recruitment pages
const CreateOrganizationPage = lazyWithRetry(() => import('@/pages/app/CreateOrganizationPage'))
const OrganizationDashboardPage = lazyWithRetry(() => import('@/pages/app/OrganizationDashboardPage'))
const OrganizationProfilePage = lazyWithRetry(() => import('@/pages/app/OrganizationProfilePage'))
const OrganizationMembersPage = lazyWithRetry(() => import('@/pages/app/OrganizationMembersPage'))
const OrganizationDepartmentsPage = lazyWithRetry(() => import('@/pages/app/OrganizationDepartmentsPage'))
const OrganizationJobsPage = lazyWithRetry(() => import('@/pages/app/OrganizationJobsPage'))
const OrganizationApplicationsPage = lazyWithRetry(() => import('@/pages/app/OrganizationApplicationsPage'))
const OrganizationCardsPage = lazyWithRetry(() => import('@/pages/app/OrganizationCardsPage'))
const OrganizationAuditPage = lazyWithRetry(() => import('@/pages/app/OrganizationAuditPage'))
const OrganizationSettingsPage = lazyWithRetry(() => import('@/pages/app/OrganizationSettingsPage'))
const JobsPage = lazyWithRetry(() => import('@/pages/app/JobsPage'))
const MyApplicationsPage = lazyWithRetry(() => import('@/pages/app/MyApplicationsPage'))
const OrganizationApprovalsPage = lazyWithRetry(() => import('@/pages/app/OrganizationApprovalsPage'))
const OrganizationEventsPage = lazyWithRetry(() => import('@/pages/app/OrganizationEventsPage'))
const OrganizationRolesPage = lazyWithRetry(() => import('@/pages/app/OrganizationRolesPage'))
const CompanyShowcasePage = lazyWithRetry(() => import('@/pages/public/CompanyShowcasePage'))
const AcceptInvitationPage = lazyWithRetry(() => import('@/pages/public/AcceptInvitationPage'))

// Admin pages
const AdminDashboardPage = lazyWithRetry(() => import('@/pages/admin/AdminDashboardPage'))
const AdminUsersPage = lazyWithRetry(() => import('@/pages/admin/AdminUsersPage'))
const AdminCardsPage = lazyWithRetry(() => import('@/pages/admin/AdminCardsPage'))
const AdminOrdersPage = lazyWithRetry(() => import('@/pages/admin/AdminOrdersPage'))
const AdminReportsPage = lazyWithRetry(() => import('@/pages/admin/AdminReportsPage'))
const AdminSupportPage = lazyWithRetry(() => import('@/pages/admin/AdminSupportPage'))
const AdminAuditPage = lazyWithRetry(() => import('@/pages/admin/AdminAuditPage'))
const AdminProfessionsPage = lazyWithRetry(() => import('@/pages/admin/AdminProfessionsPage'))
const AdminTemplatesPage = lazyWithRetry(() => import('@/pages/admin/AdminTemplatesPage'))

function Suspended({ children }: { children: React.ReactNode }) {
  return <React.Suspense fallback={<LoadingScreen />}>{children}</React.Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      // Direct root access to Login Page
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },

      // Public Vanity Profile
      {
        path: 'u/:username',
        element: (
          <Suspended>
            <PublicProfilePage />
          </Suspended>
        ),
      },

      // Public Company Brand Showcase
      {
        path: 'company/:slug',
        element: (
          <Suspended>
            <CompanyShowcasePage />
          </Suspended>
        ),
      },

      // Organization Member Invitation Acceptance
      {
        path: 'invitation',
        element: (
          <Suspended>
            <AcceptInvitationPage />
          </Suspended>
        ),
      },

      // Public NFC Tap & Digital Card QR Resolution
      {
        path: 'p/c/:cardUid',
        element: (
          <Suspended>
            <CardTapRedirectPage />
          </Suspended>
        ),
      },
      {
        path: 'c/:cardUid',
        element: (
          <Suspended>
            <CardTapRedirectPage />
          </Suspended>
        ),
      },
      {
        path: 'users/:cardUid',
        element: (
          <Suspended>
            <CardTapRedirectPage />
          </Suspended>
        ),
      },

      // Public Only Auth routes
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              {
                path: 'login',
                element: (
                  <Suspended>
                    <LoginPage />
                  </Suspended>
                ),
              },
              {
                path: 'signup',
                element: (
                  <Suspended>
                    <RegisterPage />
                  </Suspended>
                ),
              },
              {
                path: 'verify-email',
                element: (
                  <Suspended>
                    <VerifyEmailPage />
                  </Suspended>
                ),
              },
              {
                path: 'forgot-password',
                element: (
                  <Suspended>
                    <ForgotPasswordPage />
                  </Suspended>
                ),
              },
              {
                path: 'reset-password',
                element: (
                  <Suspended>
                    <ResetPasswordPage />
                  </Suspended>
                ),
              },
            ],
          },
        ],
      },

      // Onboarding route: redirect to app (onboarding wizard removed — template selection now in Profile)
      {
        path: 'onboarding',
        element: <Navigate to="/app" replace />,
      },

      // Root Discovery & Network Aliases (prevent falling back to home feed)
      {
        path: 'discover',
        element: <Navigate to="/app/network" replace />,
      },
      {
        path: 'discovery',
        element: <Navigate to="/app/network" replace />,
      },
      {
        path: 'network',
        element: <Navigate to="/app/network" replace />,
      },
      {
        path: 'people',
        element: <Navigate to="/app/network" replace />,
      },
      {
        path: 'discover-people',
        element: <Navigate to="/app/network" replace />,
      },

      // Protected User Application Routes
      {
        path: 'app',
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                index: true,
                element: (
                  <Suspended>
                    <FeedPage />
                  </Suspended>
                ),
              },
              {
                path: 'dashboard',
                element: (
                  <Suspended>
                    <DashboardPage />
                  </Suspended>
                ),
              },
              {
                path: 'profile',
                element: (
                  <Suspended>
                    <ProfilePage />
                  </Suspended>
                ),
              },
              {
                path: 'profile/edit',
                element: (
                  <Suspended>
                    <ProfileEditPage />
                  </Suspended>
                ),
              },
              {
                path: 'templates',
                element: (
                  <Suspended>
                    <ProfileTemplatesPage />
                  </Suspended>
                ),
              },
              {
                path: 'feed',
                element: (
                  <Suspended>
                    <FeedPage />
                  </Suspended>
                ),
              },
              {
                path: 'network',
                element: (
                  <Suspended>
                    <DiscoveryPage />
                  </Suspended>
                ),
              },
              {
                path: 'discover',
                element: <Navigate to="/app/network" replace />,
              },
              {
                path: 'discovery',
                element: <Navigate to="/app/network" replace />,
              },
              {
                path: 'people',
                element: <Navigate to="/app/network" replace />,
              },
              {
                path: 'discover-people',
                element: <Navigate to="/app/network" replace />,
              },
              {
                path: 'connections',
                element: (
                  <Suspended>
                    <ConnectionsPage />
                  </Suspended>
                ),
              },
              {
                path: 'messages',
                element: (
                  <Suspended>
                    <MessagesPage />
                  </Suspended>
                ),
              },
              {
                path: 'notifications',
                element: (
                  <Suspended>
                    <NotificationsPage />
                  </Suspended>
                ),
              },
              {
                path: 'analytics',
                element: (
                  <Suspended>
                    <AnalyticsPage />
                  </Suspended>
                ),
              },
              {
                path: 'cards',
                element: (
                  <Suspended>
                    <CardsPage />
                  </Suspended>
                ),
              },
              {
                path: 'orders',
                element: (
                  <Suspended>
                    <OrdersPage />
                  </Suspended>
                ),
              },
              {
                path: 'settings',
                element: (
                  <Suspended>
                    <SettingsPage />
                  </Suspended>
                ),
              },
              {
                path: 'support',
                element: (
                  <Suspended>
                    <SupportPage />
                  </Suspended>
                ),
              },

              // Candidate & Talent Marketplace
              {
                path: 'jobs',
                element: (
                  <Suspended>
                    <JobsPage />
                  </Suspended>
                ),
              },
              {
                path: 'my-applications',
                element: (
                  <Suspended>
                    <MyApplicationsPage />
                  </Suspended>
                ),
              },

              // Organization Management
              {
                path: 'organizations/create',
                element: (
                  <Suspended>
                    <CreateOrganizationPage />
                  </Suspended>
                ),
              },
              {
                path: 'org/dashboard',
                element: (
                  <Suspended>
                    <OrganizationDashboardPage />
                  </Suspended>
                ),
              },
              {
                path: 'org/profile',
                element: (
                  <Suspended>
                    <OrganizationProfilePage />
                  </Suspended>
                ),
              },
              {
                path: 'org/members',
                element: (
                  <Suspended>
                    <OrganizationMembersPage />
                  </Suspended>
                ),
              },
              {
                path: 'org/approvals',
                element: (
                  <Suspended>
                    <OrganizationApprovalsPage />
                  </Suspended>
                ),
              },
              {
                path: 'org/events',
                element: (
                  <Suspended>
                    <OrganizationEventsPage />
                  </Suspended>
                ),
              },
              {
                path: 'org/roles',
                element: (
                  <Suspended>
                    <OrganizationRolesPage />
                  </Suspended>
                ),
              },
              {
                path: 'org/departments',
                element: (
                  <Suspended>
                    <OrganizationDepartmentsPage />
                  </Suspended>
                ),
              },
              {
                path: 'org/jobs',
                element: (
                  <Suspended>
                    <OrganizationJobsPage />
                  </Suspended>
                ),
              },
              {
                path: 'org/applications',
                element: (
                  <Suspended>
                    <OrganizationApplicationsPage />
                  </Suspended>
                ),
              },
              {
                path: 'org/cards',
                element: (
                  <Suspended>
                    <OrganizationCardsPage />
                  </Suspended>
                ),
              },
              {
                path: 'org/audit',
                element: (
                  <Suspended>
                    <OrganizationAuditPage />
                  </Suspended>
                ),
              },
              {
                path: 'org/settings',
                element: (
                  <Suspended>
                    <OrganizationSettingsPage />
                  </Suspended>
                ),
              },
            ],
          },
        ],
      },

      // Protected Admin Portal Routes
      {
        path: 'admin',
        element: <AdminRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              {
                index: true,
                element: (
                  <Suspended>
                    <AdminDashboardPage />
                  </Suspended>
                ),
              },
              {
                path: 'users',
                element: (
                  <Suspended>
                    <AdminUsersPage />
                  </Suspended>
                ),
              },
              {
                path: 'professions',
                element: (
                  <Suspended>
                    <AdminProfessionsPage />
                  </Suspended>
                ),
              },
              {
                // Profile Templates: the user-facing template catalog (separate from Profession taxonomy)
                path: 'templates',
                element: (
                  <Suspended>
                    <AdminTemplatesPage />
                  </Suspended>
                ),
              },
              {
                path: 'cards',
                element: (
                  <Suspended>
                    <AdminCardsPage />
                  </Suspended>
                ),
              },
              {
                path: 'orders',
                element: (
                  <Suspended>
                    <AdminOrdersPage />
                  </Suspended>
                ),
              },
              {
                path: 'reports',
                element: (
                  <Suspended>
                    <AdminReportsPage />
                  </Suspended>
                ),
              },
              {
                path: 'support',
                element: (
                  <Suspended>
                    <AdminSupportPage />
                  </Suspended>
                ),
              },
              {
                path: 'audit',
                element: (
                  <Suspended>
                    <AdminAuditPage />
                  </Suspended>
                ),
              },
            ],
          },
        ],
      },

      // Catch-all 404 redirect
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
