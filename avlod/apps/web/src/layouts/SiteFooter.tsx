import { Link } from 'react-router-dom';
import { Logo } from '../components/ui/Brand';

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-ink-950">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-5 font-serif text-xl italic text-sage-300">
            Ildizlarimiz. Tariximiz. Merosimiz.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-sage-500">
            Oila ish maydonlari sukut bo‘yicha shaxsiy. Ma’lumotlaringiz faqat siz taklif qilgan
            qarindoshlarga ko‘rinadi.
          </p>
        </div>
        <FooterCol
          title="Platforma"
          links={[
            ['Shajara', '/#shajara'],
            ['Oila tarixi', '/#tarix'],
            ['Xotiralar', '/#xotiralar'],
          ]}
        />
        <FooterCol
          title="Hisob"
          links={[
            ['Kirish', '/login'],
            ['Ro‘yxatdan o‘tish', '/register'],
            ['Mening oilalarim', '/dashboard'],
          ]}
        />
        <FooterCol
          title="Ishonch"
          links={[
            ['Maxfiylik', '/privacy'],
            ['Biz haqimizda', '/#biz-haqimizda'],
            ['API hujjatlari', '/api/docs'],
          ]}
        />
      </div>
      <div className="container-x flex flex-col justify-between gap-3 border-t border-white/[0.05] py-6 text-xs text-sage-600 sm:flex-row">
        <span>© {new Date().getFullYear()} AVLOD. Barcha huquqlar himoyalangan.</span>
        <span>Namuna oila ma’lumotlari to‘qima va faqat namoyish uchun.</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="eyebrow mb-4">{title}</h3>
      <ul className="space-y-2.5 text-sm">
        {links.map(([label, to]) => (
          <li key={label}>
            {to.startsWith('/api') ? (
              <a href={to} className="text-sage-400 transition-colors hover:text-parchment">
                {label}
              </a>
            ) : (
              <Link to={to} className="text-sage-400 transition-colors hover:text-parchment">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
