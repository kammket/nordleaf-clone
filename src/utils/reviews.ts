// Deterministic review generation for ~70 % of products
// Each product that qualifies gets 3-5 realistic German patient reviews

export interface ProductReview {
  author: string;
  date: string;          // ISO date string
  rating: number;        // 4 or 5
  title: string;
  body: string;
}

/* ── helpers ───────────────────────────────────────── */

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** seeded pseudo-random (xorshift-style, deterministic per seed) */
function seededRng(seed: number) {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;   // 0 – 0.9999
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/* ── data pools ───────────────────────────────────── */

const AUTHORS = [
  'Markus S.', 'Sabine K.', 'Thomas B.', 'Julia W.', 'Andreas M.',
  'Petra L.', 'Stefan R.', 'Monika H.', 'Klaus D.', 'Ingrid F.',
  'Michael G.', 'Karin P.', 'Uwe T.', 'Heike N.', 'Jürgen V.',
  'Claudia Z.', 'Frank A.', 'Birgit E.', 'Wolfgang C.', 'Susanne J.',
  'Ralf O.', 'Cornelia I.', 'Bernd U.', 'Martina Q.', 'Dieter X.',
  'Gabriele Y.', 'Peter H.', 'Silke M.', 'Manfred W.', 'Renate K.',
  'Christoph L.', 'Dagmar S.', 'Anja R.', 'Holger B.', 'Elke D.',
  'Torsten F.', 'Bettina G.', 'Max T.', 'Lisa V.', 'Kai N.',
];

/** Review templates per category – `{strain}`, `{brand}`, `{thc}`, `{effects}` are replaced */

const TEMPLATES: Record<string, Array<{ title: string; body: string }>> = {
  'Cannabisblüten': [
    {
      title: 'Endlich Schmerzlinderung',
      body: 'Nach Jahren mit chronischen Schmerzen hat mir {strain} wirklich geholfen. Die Wirkung setzt schnell ein und hält mehrere Stunden an. Die Qualität der Blüten ist erstklassig – schöne Trichome und angenehmer Geruch. {thc} THC ist genau die richtige Stärke für mich.',
    },
    {
      title: 'Sehr gute Qualität',
      body: 'Die Blüten von {brand} sind hervorragend verarbeitet. {strain} hat ein angenehmes Aroma und die Wirkung ist genau wie beschrieben: {effects}. Bin begeistert von der gleichbleibenden Qualität und werde definitiv nachbestellen.',
    },
    {
      title: 'Top Sorte für den Abend',
      body: 'Ich nutze {strain} hauptsächlich abends gegen meine Schlafprobleme. Die {effects} Wirkung hilft mir wunderbar beim Einschlafen. Die Lieferung war schnell und diskret. Kann ich nur empfehlen.',
    },
    {
      title: 'Hilft bei meiner Angststörung',
      body: 'Mein Arzt hat mir {strain} gegen meine Angststörung verschrieben. Nach einigen Wochen kann ich sagen: Es wirkt. Die {effects} Wirkung gibt mir Ruhe ohne mich komplett auszuknocken. {brand} liefert hier ein sehr gutes Produkt.',
    },
    {
      title: 'Beste Sorte bisher',
      body: '{strain} von {brand} ist die beste Cannabissorte, die ich bisher probieren durfte. Mit {thc} THC hat sie genau die richtige Potenz. Die Blüten sind wunderschön und das Terpenprofil ist fantastisch. Nordleaf liefert wie immer schnell und zuverlässig.',
    },
    {
      title: 'Super bei chronischen Schmerzen',
      body: 'Ich habe schon viele Sorten probiert, aber {strain} wirkt bei meinen Rückenschmerzen am besten. Der THC-Gehalt von {thc} ist perfekt dosierbar. Gutes Preis-Leistungs-Verhältnis bei Nordleaf.',
    },
    {
      title: 'Zuverlässige Wirkung',
      body: 'Seit drei Monaten nutze ich {strain} regelmäßig. Die Wirkung ist konsistent und vorhersehbar – genau das, was man als Patient braucht. {effects} – genau so wirkt es auch. Danke an {brand} für dieses tolle Produkt.',
    },
    {
      title: 'Angenehmes Terpenprofil',
      body: 'Der Geschmack von {strain} ist wirklich angenehm. Die Blüten sind gut getrocknet und das Aroma ist intensiv. Die Wirkung tritt schnell ein und hilft mir bei meiner Migräne. Sehr zufrieden!',
    },
    {
      title: 'Perfekt für tagsüber',
      body: 'Endlich eine Sorte, die ich auch tagsüber nehmen kann, ohne komplett müde zu werden. {strain} hat eine schöne {effects} Wirkung. Bei {thc} THC kann man gut die Dosis anpassen.',
    },
    {
      title: 'Schnelle Lieferung, super Ware',
      body: 'Bestellung am Dienstag, Donnerstag war das Paket da. {strain} von {brand} ist wie immer top. Die Blüten sind perfekt – von der Feuchtigkeit bis zur Konsistenz stimmt alles. Mein Dauerfavorit.',
    },
  ],

  'Cannabisextrakte': [
    {
      title: 'Perfekte Dosierung möglich',
      body: 'Mit diesem Extrakt von {brand} kann ich meine Dosis viel genauer einstellen als mit Blüten. Die Tropfenform ist super praktisch. {thc} THC – genau richtig für meine Bedürfnisse. Nehme es morgens und abends.',
    },
    {
      title: 'Rauchfreie Alternative',
      body: 'Als Nichtraucher war mir die orale Einnahme immer lieber. Dieser Cannabisextrakt ist perfekt – einfach ein paar Tropfen unter die Zunge und nach 20 Minuten spüre ich die Wirkung. Die Qualität von {brand} ist ausgezeichnet.',
    },
    {
      title: 'Langanhaltende Wirkung',
      body: 'Was mich besonders überzeugt: Die Wirkung hält deutlich länger an als bei Blüten. {strain} gibt mir über Stunden eine gleichmäßige Schmerzlinderung. Ideal für den Alltag.',
    },
    {
      title: 'Sehr zufrieden',
      body: 'Benutze diesen Extrakt jetzt seit 6 Wochen gegen meine Nervenschmerzen. Die Dosierung ist kinderleicht und die Wirkung ist zuverlässig. {brand} hat hier ein erstklassiges Produkt entwickelt.',
    },
    {
      title: 'Diskreter geht es nicht',
      body: 'Die Tropfen sind vor allem unterwegs super praktisch. Kein Geruch, keine Aufmerksamkeit – einfach ein paar Tropfen und fertig. Die medizinische Wirkung ist dabei genauso gut wie bei Blüten.',
    },
  ],

  'THC Vapes': [
    {
      title: 'Sofortige Wirkung',
      body: 'Wenn es schnell gehen muss, greife ich zum Vape. Die Wirkung setzt innerhalb von Sekunden ein, perfekt bei akuten Schmerzattacken. Die Kartusche hält erstaunlich lang und der Geschmack ist angenehm.',
    },
    {
      title: 'Diskret und praktisch',
      body: 'Für unterwegs ist der Vape unschlagbar. Klein, diskret und sofort einsatzbereit. Die Dampfentwicklung ist minimal und die Wirkung kommt sofort. Sehr gute Qualität.',
    },
    {
      title: 'Modernes Medikament',
      body: 'Der THC Vape ist eine wirklich moderne Art der Medikamenteneinnahme. Sauber, dosierbar und effektiv. Ich benutze ihn ergänzend zu meinen Blüten für unterwegs. Top Produkt.',
    },
    {
      title: 'Ideal für Durchbruchschmerzen',
      body: 'Bei plötzlichen Schmerzspitzen ist der Vape mein Go-To. Innerhalb von 1-2 Minuten spüre ich Erleichterung. Die Handhabung ist intuitiv und die Qualität des Extrakts ist hervorragend.',
    },
    {
      title: 'Positiv überrascht',
      body: 'War anfangs skeptisch, aber der Vape hat mich überzeugt. Sauberer Dampf, guter Geschmack und zuverlässige Wirkung. Werde ihn auf jeden Fall nachbestellen.',
    },
  ],

  'THC Shots': [
    {
      title: 'Praktisch und lecker',
      body: 'Die THC Shots sind super praktisch – einfach trinken und fertig. Der Geschmack ist deutlich besser als erwartet. Die Wirkung setzt nach ca. 30 Minuten ein und hält schön lange an.',
    },
    {
      title: 'Genau dosiert',
      body: 'Was mir besonders gefällt: Jeder Shot enthält exakt die gleiche Dosis. Kein Abwiegen, kein Schätzen – einfach trinken. Perfekt für Patienten wie mich, die es unkompliziert mögen.',
    },
    {
      title: 'Alternativ zu Tropfen',
      body: 'Die Shots sind eine tolle Alternative zu Tropfen. Schmecken besser und die Wirkung ist vergleichbar. Ich nehme sie gerne abends. Schnelle Lieferung bei Nordleaf wie immer.',
    },
    {
      title: 'Ideal für unterwegs',
      body: 'Die kleinen Ampullen passen in jede Tasche. Kein auffälliges Equipment nötig – einfach öffnen, trinken, fertig. Die langanhaltende Wirkung ist perfekt für längere Tage.',
    },
  ],

  'Kapseln & Edibles': [
    {
      title: 'Einfache Einnahme',
      body: 'Kapseln sind für mich die angenehmste Einnahmeform. Kein Geschmack, kein Geruch – einfach mit Wasser schlucken. Die Wirkung setzt zwar etwas später ein, hält dafür aber sehr lange an.',
    },
    {
      title: 'Gleichmäßige Wirkung',
      body: 'Im Vergleich zu Blüten ist die Wirkung der Kapseln viel gleichmäßiger. Keine Spitzen, kein schnelles Nachlassen – sondern eine konstante, angenehme Linderung über Stunden.',
    },
    {
      title: 'Perfekt für den Alltag',
      body: 'Morgens eine Kapsel – und ich komme gut durch den Tag. Die Dosierung ist exakt und die Wirkung vorhersehbar. Genau das, was ich als Patient brauche. {brand} liefert hier ein tolles Produkt.',
    },
    {
      title: 'Kein Cannabis-Geruch',
      body: 'Der größte Vorteil der Kapseln: absolut kein Geruch. Im Büro, auf Reisen, beim Familienbesuch – niemand merkt etwas. Die Wirkung ist dennoch sehr gut und zuverlässig.',
    },
    {
      title: 'Langanhaltend und sanft',
      body: 'Die Wirkung der Kapseln ist sanfter als bei Blüten, aber dafür deutlich langanhaltender. Für meine chronischen Beschwerden ist das ideal. Sehr zufrieden mit der Qualität.',
    },
  ],
};

/* ── main generator ───────────────────────────────── */

export function hasReviews(slug: string): boolean {
  const h = hashStr(slug);
  return h % 10 < 7;          // ~70 % of products
}

export function generateReviews(product: {
  slug: string;
  strain: string;
  brand: string;
  thc: string;
  category: string;
  effects: string[];
}): ProductReview[] | null {
  if (!hasReviews(product.slug)) return null;

  const seed = hashStr(product.slug + '_reviews');
  const rng = seededRng(seed);

  // 3-5 reviews
  const count = 3 + Math.floor(rng() * 3);          // 3, 4 or 5

  const pool = TEMPLATES[product.category] || TEMPLATES['Cannabisblüten'];
  const used = new Set<number>();
  const reviews: ProductReview[] = [];

  for (let i = 0; i < count; i++) {
    // pick a unique template index
    let idx: number;
    let safety = 0;
    do { idx = Math.floor(rng() * pool.length); safety++; } while (used.has(idx) && safety < 20);
    used.add(idx);
    const tpl = pool[idx];

    const effectsStr = product.effects.slice(0, 3).join(', ').toLowerCase();

    const body = tpl.body
      .replace(/{strain}/g, product.strain || product.brand)
      .replace(/{brand}/g, product.brand)
      .replace(/{thc}/g, product.thc)
      .replace(/{effects}/g, effectsStr);

    const title = tpl.title
      .replace(/{strain}/g, product.strain || product.brand)
      .replace(/{brand}/g, product.brand);

    // rating: 4 or 5 (biased toward 5)
    const rating = rng() < 0.65 ? 5 : 4;

    // deterministic date in 2025-06 → 2026-02  (recent, but stable)
    const monthOffset = Math.floor(rng() * 9);        // 0-8
    const day = 1 + Math.floor(rng() * 27);            // 1-28
    const month = 6 + monthOffset;                      // 6-14
    const year = month > 12 ? 2026 : 2025;
    const realMonth = month > 12 ? month - 12 : month;
    const dateStr = `${year}-${String(realMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // pick unique author
    const author = pick(AUTHORS, rng);

    reviews.push({ author, date: dateStr, rating, title, body });
  }

  return reviews;
}
