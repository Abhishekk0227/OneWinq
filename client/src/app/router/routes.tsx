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

// Lazy loaded page components for optimal performance & code splitting
const PublicProfilePage = React.lazy(() => import('@/pages/public/PublicProfilePage'))
const CardTapRedirectPage = React.lazy(() => import('@/pages/public/CardTapRedirectPage'))

// Auth pages
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = React.lazy(() => import('@/pages/auth/RegisterPage'))
const VerifyEmailPage = React.lazy(() => import('@/pages/auth/VerifyEmailPage'))
const ForgotPasswordPage = React.lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = React.lazy(() => import('@/pages/auth/ResetPasswordPage'))

// App pages
const DashboardPage = React.lazy(() => import('@/pages/app/DashboardPage'))
const ProfilePage = React.lazy(() => import('@/pages/app/ProfilePage'))
const ProfileEditPage = React.lazy(() => import('@/pages/app/ProfileEditPage'))
const ProfileTemplatesPage = React.lazy(() => import('@/pages/app/ProfileTemplatesPage'))
const FeedPage = React.lazy(() => import('@/pages/app/FeedPage'))
const DiscoveryPage = React.lazy(() => import('@/pages/app/DiscoveryPage'))
const ConnectionsPage = React.lazy(() => import('@/pages/app/ConnectionsPage'))
const MessagesPage = React.lazy(() => import('@/pages/app/MessagesPage'))
const NotificationsPage = React.lazy(() => import('@/pages/app/NotificationsPage'))
const AnalyticsPage = React.lazy(() => import('@/pages/app/AnalyticsPage'))
const CardsPage = React.lazy(() => import('@/pages/app/CardsPage'))
const OrdersPage = React.lazy(() => import('@/pages/app/OrdersPage'))
const SettingsPage = React.lazy(() => import('@/pages/app/SettingsPage'))
const SupportPage = React.lazy(() => import('@/pages/app/SupportPage'))

// Admin pages
const AdminDashboardPage = React.lazy(() => import('@/pages/admin/AdminDashboardPage'))
const AdminUsersPage = React.lazy(() => import('@/pages/admin/AdminUsersPage'))
const AdminCardsPage = React.lazy(() => import('@/pages/admin/AdminCardsPage'))
const AdminOrdersPage = React.lazy(() => import('@/pages/admin/AdminOrdersPage'))
const AdminReportsPage = React.lazy(() => import('@/pages/admin/AdminReportsPage'))
const AdminSupportPage = React.lazy(() => import('@/pages/admin/AdminSupportPage'))
const AdminAuditPage = React.lazy(() => import('@/pages/admin/AdminAuditPage'))
const AdminProfessionsPage = React.lazy(() => import('@/pages/admin/AdminProfessionsPage'))
const AdminTemplatesPage = React.lazy(() => import('@/pages/admin/AdminTemplatesPage'))

function Suspended({ children }: { children: React.ReactNode }) {
  return <React.Suspense fallback={<LoadingScreen />}>{children}</React.Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
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
