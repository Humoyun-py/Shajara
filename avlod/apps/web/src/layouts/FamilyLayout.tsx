import { NavLink, Outlet, useParams } from 'react-router-dom';
import { BookOpen, Clock3, GitFork, Images, Settings, Users } from 'lucide-react';
import { LABELS, type FamilySummaryDTO } from '@avlod/shared';
import { ErrorState, Spinner, Badge } from '../components/ui/States';
import { useFamily } from '../services/queries';
import { cn } from '../lib/utils';

export interface FamilyOutletContext {
  family: FamilySummaryDTO;
}

const tabs = [
  { to: 'tree', label: 'Shajara', icon: GitFork },
  { to: 'people', label: 'Qarindoshlar', icon: Users },
  { to: 'memories', label: 'Xotiralar', icon: Images },
  { to: 'timeline', label: 'Tarix', icon: Clock3 },
  { to: 'settings', label: 'Sozlamalar', icon: Settings },
];

export function FamilyLayout() {
  const { familyId = '' } = useParams();
  const family = useFamily(familyId);
  if (family.isLoading) return <Spinner />;
  if (family.error || !family.data)
    return <ErrorState error={family.error} onRetry={() => family.refetch()} />;
  const f = family.data;
  return (
    <div>
      <div className="border-b border-white/[0.06] bg-ink-850/60">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 pt-5 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> Oila ish maydoni
            </p>
            <h1 className="mt-1 truncate font-serif text-3xl text-parchment sm:text-4xl">
              {f.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {f.role && <Badge tone="gold">{LABELS.role[f.role]}</Badge>}
              {f.isDemo && <Badge tone="warn">Namuna ma’lumotlar — to‘qima</Badge>}
              <Badge>{f.personCount} kishi</Badge>
            </div>
          </div>
          <nav aria-label="Oila bo‘limlari" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
            <ul className="flex min-w-max gap-1">
              {tabs.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 px-4 pb-3 pt-2 text-[13px] transition-colors',
                        isActive
                          ? 'text-parchment after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-gold-400'
                          : 'text-sage-400 hover:text-parchment',
                      )
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <Outlet context={{ family: f } satisfies FamilyOutletContext} />
    </div>
  );
}
