import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, UserRound, X } from 'lucide-react';
import { Logo } from '../components/ui/Brand';
import { buttonClass } from '../components/ui/Button';
import { useAuth } from '../features/auth/AuthProvider';
import { useFamilies } from '../services/queries';
import { cn } from '../lib/utils';

/** Links resolve to the signed-in user's first family, or to landing sections for visitors. */
function useNavLinks() {
  const { status } = useAuth();
  const families = useFamilies(status === 'authenticated');
  const fam = status === 'authenticated' ? families.data?.[0]?.id : undefined;
  return [
    { label: 'Bosh sahifa', to: '/' },
    { label: 'Shajara', to: fam ? `/family/${fam}/tree` : '/#shajara' },
    { label: 'Oila tarixi', to: fam ? `/family/${fam}/timeline` : '/#tarix' },
    { label: 'Xotiralar', to: fam ? `/family/${fam}/memories` : '/#xotiralar' },
    { label: 'Biz haqimizda', to: '/#biz-haqimizda' },
  ];
}

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { status, user } = useAuth();
  const links = useNavLinks();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500',
        scrolled || open
          ? 'border-b border-white/[0.06] bg-ink-900/70 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <nav
        aria-label="Asosiy"
        className="container-x flex h-[72px] items-center justify-between gap-6"
      >
        <Link to="/" aria-label="AVLOD — bosh sahifa">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.label}>
              <NavLink
                to={l.to}
                end
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 text-[13px] tracking-wide transition-colors',
                    isActive && l.to === location.pathname
                      ? 'text-parchment'
                      : 'text-sage-400 hover:text-parchment',
                  )
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 lg:flex">
          {status === 'authenticated' ? (
            <Link to="/dashboard" className={buttonClass('secondary', 'sm')}>
              <UserRound className="h-4 w-4" aria-hidden />
              {user?.displayName.split(' ')[0] ?? 'Profil'}
            </Link>
          ) : (
            <>
              <Link to="/login" className={buttonClass('ghost', 'sm')}>
                Kirish
              </Link>
              <Link to="/register" className={buttonClass('primary', 'sm')}>
                Boshlash
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-parchment lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Menyuni yopish' : 'Menyuni ochish'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/[0.06] lg:hidden"
          >
            <ul className="container-x flex flex-col py-4">
              {links.map((l, i) => (
                <motion.li
                  key={l.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Link to={l.to} className="block py-3 font-serif text-2xl text-parchment">
                    {l.label}
                  </Link>
                </motion.li>
              ))}
              <li className="mt-4 flex gap-3">
                {status === 'authenticated' ? (
                  <Link to="/dashboard" className={buttonClass('primary', 'md', 'flex-1')}>
                    Mening oilalarim
                  </Link>
                ) : (
                  <>
                    <Link to="/login" className={buttonClass('secondary', 'md', 'flex-1')}>
                      Kirish
                    </Link>
                    <Link to="/register" className={buttonClass('primary', 'md', 'flex-1')}>
                      Ro‘yxatdan o‘tish
                    </Link>
                  </>
                )}
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
