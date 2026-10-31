import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Settings, UserRound } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from '../components/ui/Brand';
import { Spinner } from '../components/ui/States';
import { useAuth } from '../features/auth/AuthProvider';
import { cn } from '../lib/utils';

/** Guards private routes: waits for session restore, then redirects anonymous users to /login. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading')
    return <Spinner label="Sessiya tiklanmoqda…" className="min-h-screen" />;
  if (status === 'anonymous')
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  return <Outlet />;
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  return (
    <div className="min-h-screen bg-ink-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-ink-900"
      >
        Asosiy mazmunga o‘tish
      </a>
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" aria-label="AVLOD — bosh sahifa">
              <Logo className="[&_span]:text-lg" />
            </Link>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                cn(
                  'hidden text-[13px] sm:block',
                  isActive ? 'text-parchment' : 'text-sage-400 hover:text-parchment',
                )
              }
            >
              Oilalarim
            </NavLink>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full border border-white/10 py-1.5 pl-1.5 pr-4 text-sm text-sage-300 hover:border-gold-400/40"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-400/15 text-gold-300">
                <UserRound className="h-4 w-4" aria-hidden />
              </span>
              <span className="max-w-[10rem] truncate">{user?.displayName}</span>
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 p-1.5 shadow-lift"
                  onKeyDown={(e) => e.key === 'Escape' && setMenu(false)}
                >
                  <p className="truncate px-3 py-2 text-xs text-sage-500">{user?.email}</p>
                  <Link
                    role="menuitem"
                    to="/settings/profile"
                    onClick={() => setMenu(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-sage-300 hover:bg-white/[0.05] hover:text-parchment"
                  >
                    <Settings className="h-4 w-4" /> Hisob sozlamalari
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={async () => {
                      setMenu(false);
                      await logout();
                      navigate('/');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-sage-300 hover:bg-white/[0.05] hover:text-parchment"
                  >
                    <LogOut className="h-4 w-4" /> Chiqish
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
    </div>
  );
}
