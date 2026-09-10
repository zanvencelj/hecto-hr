import {
  ADMIN_APP_URL,
  MANAGER_APP_URL,
  REPO_URL,
  SUS_FORM_EMBED_URL,
  SUS_FORM_URL,
} from '@/config/links';
import { useAppLinks } from '@/hooks/use-app-links';

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.19-1.64 3.348-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.63 0 2.91.06 4.406 2.19-.116.074-2.336 1.36-2.336 4.14 0 3.31 2.905 4.48 2.943 4.5z" />
    </svg>
  );
}

const NAV_LINKS = [
  { href: '#funkcionalnosti', label: 'Funkcionalnosti' },
  { href: '#prenos', label: 'Prenos aplikacije' },
  { href: '#povezave', label: 'Povezave' },
  { href: '#vprasalnik', label: 'Vprašalnik' },
];

const FEATURES = [
  {
    title: 'Evidenca delovnega časa',
    description:
      'Zaposleni v mobilni aplikaciji beležijo prihod, odhod, odmore, delo od doma in službene poti; napačen vnos popravijo prek zahtevka, ki ga potrdi vodja.',
  },
  {
    title: 'Razporejanje izmen',
    description:
      'Ročno urejanje urnika ali samodejno generiranje osnutka na podlagi razpoložljivosti, preferenc in delovnopravnih omejitev zaposlenih.',
  },
  {
    title: 'Upravljanje dopustov',
    description:
      'Nastavljivi tipi dopustov, evidenca stanja po zaposlenemu in delovni tok odobravanja zahtevkov.',
  },
  {
    title: 'Evidenca obiskov',
    description:
      'Kiosk aplikacija na tablici za prijavo in odjavo obiskovalcev na recepciji, s podpisom in pregledom trenutno prisotnih.',
  },
  {
    title: 'Dostop na osnovi uporabniških vlog',
    description:
      'Ločene pristojnosti za administratorja, kadrovsko službo, vodjo in zaposlenega na vsakem koraku.',
  },
  {
    title: 'Upravljanje več organizacij',
    description:
      'Nadzorni vmesnik za administratorja platforme za upravljanje vseh organizacij na skupni namestitvi.',
  },
];

const SUS_FLOWS = [
  {
    title: '1. Prijava in pregled urnika',
    app: 'Spletna aplikacija',
    account: 'manager@hecto.dev / hecto123',
    steps: [
      'Odpri spletno aplikacijo (gumb "Preizkusi spletno aplikacijo" zgoraj).',
      'Prijavi se z demo računom vodje (manager@hecto.dev / hecto123).',
      'V zgornji navigaciji klikni "Schedule".',
      'Preglej tedenski urnik; z gumboma "Prev" in "Next" se pomakni med tedni.',
    ],
  },
  {
    title: '2. Beleženje dogodka delovnega časa',
    app: 'Mobilna aplikacija',
    account: 'employee@hecto.dev / hecto123',
    steps: [
      'Namesti in odpri mobilno aplikacijo (glej razdelek "Prenos mobilne aplikacije" zgoraj).',
      'Prijavi se z demo računom zaposlenega (employee@hecto.dev / hecto123).',
      'Na zavihku "Today" tapni enega od gumbov, npr. "Arrival" (prihod).',
      'Po nekaj minutah tapni še "Break" ali "Departure", da zabeležiš dodaten dogodek.',
      'Preveri, da se oba dogodka pojavita na zavihku "History".',
    ],
  },
  {
    title: '3. Zahtevek za dopust in odobritev',
    app: 'Mobilna + spletna aplikacija',
    account: 'employee@hecto.dev nato manager@hecto.dev (geslo: hecto123)',
    steps: [
      'V mobilni aplikaciji, prijavljen kot zaposleni, odpri zavihek "Leaves".',
      'Izpolni obrazec: izberi tip dopusta (Leave Type), začetni in končni datum, po želji dodaj opombo.',
      'Potrdi z gumbom "Submit Request".',
      'Odjavi se in se prijavi v spletno aplikacijo z računom vodje (manager@hecto.dev).',
      'V navigaciji klikni "Leave", nato zavihek "Pending" — tam poišči ravnokar oddani zahtevek.',
      'Klikni "Approve", da ga odobriš.',
    ],
  },
  {
    title: '4. Samodejno razporejanje urnika',
    app: 'Spletna aplikacija',
    account: 'manager@hecto.dev / hecto123',
    steps: [
      'Prijavljen kot vodja v navigaciji klikni "Auto-Schedule".',
      'Nastavi polji "From" in "To" na obdobje enega tedna.',
      'Klikni "Regenerate draft" — reševalnik predlaga dodelitve izmen zaposlenim.',
      'Preglej predlagan osnutek po dnevih in zaposlenih; dodelitev lahko po potrebi ročno spremeniš.',
      'Ko si zadovoljen z osnutkom, klikni "Approve & publish".',
    ],
  },
  {
    title: '5. Prevzem odprte izmene',
    app: 'Mobilna aplikacija',
    account: 'employee@hecto.dev / hecto123',
    steps: [
      'V mobilni aplikaciji, prijavljen kot zaposleni, odpri zavihek "Shifts".',
      'Preklopi na seznam odprtih (nedodeljenih) izmen.',
      'Pri poljubni izmeni tapni "Claim".',
      'Preveri, da se izmena zdaj pojavi med tvojimi dodeljenimi izmenami.',
    ],
  },
];

function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-lg font-bold tracking-tight text-gray-900">
          Hecto<span className="text-brand-600">HR</span>
        </span>
        <nav className="hidden gap-6 text-sm font-medium text-gray-600 sm:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-brand-600">
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href={MANAGER_APP_URL}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Odpri aplikacijo
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        Upravljanje delovnega časa in kadrovskih procesov
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
        HectoHR v enem sistemu združuje evidenco delovnega časa, razporejanje izmen s samodejnim
        predlaganjem urnika in upravljanje dopustov — s spletno aplikacijo za vodje in kadrovsko
        službo ter mobilno aplikacijo za zaposlene.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <a
          href="#prenos"
          className="rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Prenesi mobilno aplikacijo
        </a>
        <a
          href={MANAGER_APP_URL}
          className="rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:border-brand-600 hover:text-brand-600"
        >
          Preizkusi spletno aplikacijo
        </a>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="funkcionalnosti" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-2xl font-bold text-gray-900">Funkcionalnosti</h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900">{feature.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Download() {
  const { androidApkUrl, iosDownloadUrl } = useAppLinks();

  return (
    <section id="prenos" className="border-y border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900">Prenos mobilne aplikacije</h2>
        <p className="mt-2 max-w-2xl text-gray-600">
          Zaposleni delo z evidenco časa, izmenami in dopusti opravljajo prek mobilne aplikacije.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          {androidApkUrl ? (
            <a
              href={androidApkUrl}
              className="flex items-center gap-2 rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <AndroidIcon className="h-5 w-5" />
              Prenesi za Android (.apk)
            </a>
          ) : (
            <span className="flex items-center gap-2 rounded-md bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-500">
              <AndroidIcon className="h-5 w-5" />
              Android različica: kmalu na voljo
            </span>
          )}
          {iosDownloadUrl ? (
            <a
              href={iosDownloadUrl}
              className="flex items-center gap-2 rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:border-brand-600 hover:text-brand-600"
            >
              <AppleIcon className="h-5 w-5" />
              Prenesi za iOS (TestFlight)
            </a>
          ) : (
            <span className="flex items-center gap-2 rounded-md bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-500">
              <AppleIcon className="h-5 w-5" />
              iOS različica: kmalu na voljo
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function Links() {
  return (
    <section id="povezave" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-2xl font-bold text-gray-900">Povezave</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        <li>
          <a href={MANAGER_APP_URL} className="font-semibold text-brand-600 hover:underline">
            Spletna aplikacija (vodje, kadrovska služba) →
          </a>
        </li>
        <li>
          <a href={ADMIN_APP_URL} className="font-semibold text-brand-600 hover:underline">
            Administratorska aplikacija →
          </a>
        </li>
        <li>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-600 hover:underline"
          >
            Izvorna koda na GitHubu →
          </a>
        </li>
        <li>
          <a
            href={`${REPO_URL}#readme`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-600 hover:underline"
          >
            Navodila za namestitev (README) →
          </a>
        </li>
      </ul>
    </section>
  );
}

function Survey() {
  return (
    <section id="vprasalnik" className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900">Sodeluj v evalvaciji uporabniške izkušnje</h2>
        <p className="mt-2 max-w-2xl text-gray-600">
          Del diplomskega dela je evalvacija uporabniške izkušnje s standardiziranim vprašalnikom
          System Usability Scale (SUS). Pred izpolnjevanjem po vrsti preizkusi spodnjih pet
          postopkov (skupaj približno 10–15 minut) — vsak pokriva en osrednji modul aplikacije.
        </p>
        <div className="mt-8 space-y-6">
          {SUS_FLOWS.map((flow) => (
            <div key={flow.title} className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="font-semibold text-gray-900">{flow.title}</h3>
                <span className="text-xs font-medium text-gray-500">
                  {flow.app} · {flow.account}
                </span>
              </div>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-gray-700">
                {flow.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-gray-600">
          Ko preizkusiš zgornjih pet postopkov, izpolni še kratek vprašalnik — vsaka trditev se
          oceni na lestvici od 1 (sploh se ne strinjam) do 5 (popolnoma se strinjam).
        </p>
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <iframe
            src={SUS_FORM_EMBED_URL}
            title="Vprašalnik SUS"
            width="100%"
            height={2540}
            scrolling="no"
            style={{ border: 0, display: 'block' }}
          >
            Nalaganje …
          </iframe>
        </div>
        <div className="mt-4">
          <a
            href={SUS_FORM_URL ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Se vprašalnik ne prikaže pravilno? Odpri ga v novem zavihku →
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto max-w-5xl px-6 py-10 text-sm text-gray-500">
      HectoHR — diplomsko delo, Fakulteta za računalništvo in informatiko, Univerza v Ljubljani.
    </footer>
  );
}

export function App() {
  return (
    <div className="min-h-full bg-white">
      <Nav />
      <Hero />
      <Features />
      <Download />
      <Links />
      <Survey />
      <Footer />
    </div>
  );
}

export default App;
