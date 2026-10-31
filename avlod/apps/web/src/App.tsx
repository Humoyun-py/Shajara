import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Spinner } from './components/ui/States';
import { AppLayout, RequireAuth } from './layouts/AppLayout';
import { FamilyLayout } from './layouts/FamilyLayout';
import { LandingPage } from './pages/LandingPage';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages';
import { InvitationPage, NotFoundPage, PrivacyPage } from './pages/MiscPages';

// Heavier, authenticated screens are code-split.
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const TreePage = lazy(() => import('./pages/TreePage').then((m) => ({ default: m.TreePage })));
const PeoplePage = lazy(() =>
  import('./pages/PeoplePage').then((m) => ({ default: m.PeoplePage })),
);
const PersonProfilePage = lazy(() =>
  import('./pages/PersonProfilePage').then((m) => ({ default: m.PersonProfilePage })),
);
const MemoriesPage = lazy(() =>
  import('./pages/MemoriesPage').then((m) => ({ default: m.MemoriesPage })),
);
const TimelinePage = lazy(() =>
  import('./pages/TimelinePage').then((m) => ({ default: m.TimelinePage })),
);
const FamilySettingsPage = lazy(() =>
  import('./pages/FamilySettingsPage').then((m) => ({ default: m.FamilySettingsPage })),
);
const AccountSettingsPage = lazy(() =>
  import('./pages/AccountSettingsPage').then((m) => ({ default: m.AccountSettingsPage })),
);

function Page({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Suspense fallback={<Spinner />}>{children}</Suspense>
    </motion.div>
  );
}

/** Scroll to top on navigation, or to the #hash target for landing sections. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
        });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export function App() {
  const location = useLocation();
  // Animate between top-level sections only; tab switches inside a family stay instant.
  const sectionKey = location.pathname.split('/').slice(0, 2).join('/');
  return (
    <>
      <ScrollManager />
      <AnimatePresence mode="wait">
        <Routes location={location} key={sectionKey}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/invitations/:token" element={<InvitationPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route
                path="/dashboard"
                element={
                  <Page>
                    <DashboardPage />
                  </Page>
                }
              />
              <Route
                path="/settings/profile"
                element={
                  <Page>
                    <AccountSettingsPage />
                  </Page>
                }
              />
              <Route path="/family/:familyId" element={<FamilyLayout />}>
                <Route index element={<Navigate to="tree" replace />} />
                <Route
                  path="tree"
                  element={
                    <Suspense fallback={<Spinner />}>
                      <TreePage />
                    </Suspense>
                  }
                />
                <Route
                  path="people"
                  element={
                    <Suspense fallback={<Spinner />}>
                      <PeoplePage />
                    </Suspense>
                  }
                />
                <Route
                  path="people/:personId"
                  element={
                    <Suspense fallback={<Spinner />}>
                      <PersonProfilePage />
                    </Suspense>
                  }
                />
                <Route
                  path="memories"
                  element={
                    <Suspense fallback={<Spinner />}>
                      <MemoriesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="timeline"
                  element={
                    <Suspense fallback={<Spinner />}>
                      <TimelinePage />
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<Spinner />}>
                      <FamilySettingsPage />
                    </Suspense>
                  }
                />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}
