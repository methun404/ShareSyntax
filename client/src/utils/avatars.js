const svgUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`

export const AVATAR_CATEGORIES = [
  { id: 'male', name: '👨 Male Avatars' },
  { id: 'female', name: '👩 Female Avatars' },
  { id: 'bots', name: '🤖 Bots & Sci-Fi' },
  { id: 'fantasy', name: '🎭 Fun & Fantasy' },
]

export const PRESET_AVATARS = [
  // --- MALE AVATARS ---
  {
    id: 'male-dev-1',
    name: 'Male Dev Blue',
    category: 'male',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#0f172a"/><circle cx="50" cy="38" r="20" fill="#f8fafc"/><path d="M20 90 Q50 60 80 90 Z" fill="#3b82f6"/><path d="M30 35 Q50 15 70 35 Q50 25 30 35 Z" fill="#1e293b"/><circle cx="43" cy="38" r="2.5" fill="#0f172a"/><circle cx="57" cy="38" r="2.5" fill="#0f172a"/><path d="M44 48 Q50 52 56 48" stroke="#0f172a" stroke-width="2" fill="none"/></svg>')
  },
  {
    id: 'male-dev-2',
    name: 'Cool Male Glasses',
    category: 'male',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#18181b"/><circle cx="50" cy="40" r="20" fill="#f43f5e"/><path d="M22 92 Q50 62 78 92 Z" fill="#881337"/><rect x="35" y="34" width="30" height="10" rx="3" fill="#09090b"/><circle cx="42" cy="39" r="2" fill="#38bdf8"/><circle cx="58" cy="39" r="2" fill="#38bdf8"/><path d="M44 50 Q50 54 56 50" stroke="#ffffff" stroke-width="2" fill="none"/></svg>')
  },
  {
    id: 'male-dev-3',
    name: 'Bearded Dev',
    category: 'male',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#064e3b"/><circle cx="50" cy="38" r="20" fill="#fde047"/><path d="M30 45 Q50 65 70 45 L70 52 Q50 68 30 52 Z" fill="#78350f"/><path d="M20 90 Q50 62 80 90 Z" fill="#059669"/><circle cx="43" cy="36" r="2.5" fill="#1c1917"/><circle cx="57" cy="36" r="2.5" fill="#1c1917"/></svg>')
  },
  {
    id: 'male-dev-4',
    name: 'Gamer Male Hoodie',
    category: 'male',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#312e81"/><path d="M25 42 C25 20 75 20 75 42 L75 90 L25 90 Z" fill="#4338ca"/><circle cx="50" cy="45" r="18" fill="#ffedd5"/><rect x="35" y="42" width="12" height="8" rx="2" fill="#1e1b4b"/><rect x="53" y="42" width="12" height="8" rx="2" fill="#1e1b4b"/><path d="M43 57 Q50 61 57 57" stroke="#9a3412" stroke-width="2" fill="none"/></svg>')
  },
  {
    id: 'male-dev-5',
    name: 'Tech Lead Purple',
    category: 'male',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#2e1065"/><circle cx="50" cy="40" r="20" fill="#e9d5ff"/><path d="M20 90 Q50 60 80 90 Z" fill="#7e22ce"/><path d="M30 25 Q50 10 70 25 L65 32 Q50 20 35 32 Z" fill="#3b0764"/><circle cx="43" cy="38" r="2.5" fill="#3b0764"/><circle cx="57" cy="38" r="2.5" fill="#3b0764"/></svg>')
  },
  {
    id: 'male-dev-6',
    name: 'Cyber Samurai',
    category: 'male',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#172554"/><circle cx="50" cy="40" r="20" fill="#93c5fd"/><path d="M20 90 Q50 62 80 90 Z" fill="#1d4ed8"/><rect x="32" y="36" width="36" height="6" fill="#0284c7"/><circle cx="43" cy="39" r="2" fill="#ffffff"/><circle cx="57" cy="39" r="2" fill="#ffffff"/></svg>')
  },

  // --- FEMALE AVATARS ---
  {
    id: 'female-dev-1',
    name: 'Female Dev Pink',
    category: 'female',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#4c0519"/><path d="M25 35 Q50 10 75 35 L80 65 L20 65 Z" fill="#9f1239"/><circle cx="50" cy="40" r="18" fill="#ffe4e6"/><path d="M20 90 Q50 62 80 90 Z" fill="#e11d48"/><circle cx="43" cy="38" r="2.5" fill="#4c0519"/><circle cx="57" cy="38" r="2.5" fill="#4c0519"/><path d="M44 48 Q50 52 56 48" stroke="#4c0519" stroke-width="2" fill="none"/></svg>')
  },
  {
    id: 'female-dev-2',
    name: 'Cool Female Glasses',
    category: 'female',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#06281e"/><path d="M22 30 Q50 8 78 30 L82 70 L18 70 Z" fill="#047857"/><circle cx="50" cy="42" r="18" fill="#a7f3d0"/><path d="M20 92 Q50 64 80 92 Z" fill="#10b981"/><rect x="35" y="38" width="30" height="10" rx="3" fill="#064e3b"/><circle cx="42" cy="43" r="2" fill="#6ee7b7"/><circle cx="58" cy="43" r="2" fill="#6ee7b7"/></svg>')
  },
  {
    id: 'female-dev-3',
    name: 'Gamer Girl Headset',
    category: 'female',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#3b0764"/><path d="M24 32 Q50 12 76 32 L80 68 L20 68 Z" fill="#7e22ce"/><circle cx="50" cy="42" r="18" fill="#f5d0fe"/><path d="M20 90 Q50 62 80 90 Z" fill="#c084fc"/><path d="M26 40 C26 22 74 22 74 40" stroke="#f43f5e" stroke-width="5" fill="none"/><rect x="23" y="36" width="8" height="14" rx="3" fill="#f43f5e"/><rect x="69" y="36" width="8" height="14" rx="3" fill="#f43f5e"/></svg>')
  },
  {
    id: 'female-dev-4',
    name: 'Curly Hair Dev',
    category: 'female',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#451a03"/><circle cx="30" cy="30" r="12" fill="#78350f"/><circle cx="70" cy="30" r="12" fill="#78350f"/><circle cx="50" cy="22" r="14" fill="#78350f"/><circle cx="50" cy="40" r="18" fill="#fef3c7"/><path d="M20 90 Q50 62 80 90 Z" fill="#d97706"/><circle cx="43" cy="38" r="2.5" fill="#451a03"/><circle cx="57" cy="38" r="2.5" fill="#451a03"/></svg>')
  },
  {
    id: 'female-dev-5',
    name: 'Cyan Tech Lead',
    category: 'female',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#083344"/><path d="M25 35 Q50 10 75 35 L80 65 L20 65 Z" fill="#155e75"/><circle cx="50" cy="40" r="18" fill="#cff4fc"/><path d="M20 90 Q50 62 80 90 Z" fill="#06b6d4"/><circle cx="43" cy="38" r="2.5" fill="#083344"/><circle cx="57" cy="38" r="2.5" fill="#083344"/><path d="M44 48 Q50 52 56 48" stroke="#083344" stroke-width="2" fill="none"/></svg>')
  },
  {
    id: 'female-dev-6',
    name: 'Cyberpunk Girl',
    category: 'female',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#2a085c"/><path d="M20 30 Q50 5 80 30 L85 70 L15 70 Z" fill="#d946ef"/><circle cx="50" cy="42" r="18" fill="#fae8ff"/><path d="M20 92 Q50 64 80 92 Z" fill="#a855f7"/><rect x="35" y="38" width="30" height="8" rx="2" fill="#06b6d4"/><circle cx="43" cy="42" r="2" fill="#ffffff"/><circle cx="57" cy="42" r="2" fill="#ffffff"/></svg>')
  },

  // --- BOTS & SCI-FI ---
  {
    id: 'cyber-bot',
    name: 'Cyber Bot',
    category: 'bots',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#0d0d1f"/><circle cx="50" cy="50" r="38" fill="#1e1e38" stroke="#2e86de" stroke-width="3"/><rect x="30" y="38" width="40" height="24" rx="8" fill="#050510" stroke="#00e5ff" stroke-width="2"/><circle cx="42" cy="50" r="4" fill="#00e5ff"/><circle cx="58" cy="50" r="4" fill="#00e5ff"/><path d="M40 70 Q50 78 60 70" stroke="#2e86de" stroke-width="3" fill="none" stroke-linecap="round"/><line x1="50" y1="12" x2="50" y2="24" stroke="#00e5ff" stroke-width="3"/><circle cx="50" cy="10" r="4" fill="#00e5ff"/></svg>')
  },
  {
    id: 'neon-ninja',
    name: 'Neon Ninja',
    category: 'bots',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#0a0a14"/><circle cx="50" cy="50" r="38" fill="#151525"/><path d="M20 40 Q50 30 80 40 L80 65 Q50 55 20 65 Z" fill="#2e86de"/><rect x="28" y="46" width="44" height="12" rx="4" fill="#050510"/><ellipse cx="40" cy="52" rx="3" ry="2" fill="#ffffff"/><ellipse cx="60" cy="52" rx="3" ry="2" fill="#ffffff"/></svg>')
  },
  {
    id: 'astro-coder',
    name: 'Astro Coder',
    category: 'bots',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#090a18"/><circle cx="50" cy="50" r="40" fill="#121530"/><circle cx="50" cy="48" r="26" fill="none" stroke="#a29bfe" stroke-width="4"/><ellipse cx="50" cy="48" rx="20" ry="14" fill="#6c5ce7" opacity="0.8"/><circle cx="44" cy="44" r="3" fill="#ffffff"/></svg>')
  },
  {
    id: 'matrix-agent',
    name: 'Matrix Agent',
    category: 'bots',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#031c08"/><circle cx="50" cy="50" r="36" fill="#073010" stroke="#00b894" stroke-width="2"/><rect x="30" y="42" width="40" height="12" rx="4" fill="#000000"/><line x1="34" y1="48" x2="46" y2="48" stroke="#55efc4" stroke-width="3"/><line x1="54" y1="48" x2="66" y2="48" stroke="#55efc4" stroke-width="3"/></svg>')
  },
  {
    id: 'alien-coder',
    name: 'Alien Coder',
    category: 'bots',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#051b14"/><ellipse cx="50" cy="50" rx="30" ry="38" fill="#55efc4"/><ellipse cx="38" cy="45" rx="10" ry="14" fill="#050510" transform="rotate(-10 38 45)"/><ellipse cx="62" cy="45" rx="10" ry="14" fill="#050510" transform="rotate(10 62 45)"/><circle cx="40" cy="42" r="3" fill="#00b894"/><circle cx="60" cy="42" r="3" fill="#00b894"/><path d="M44 70 Q50 74 56 70" stroke="#00b894" stroke-width="2" fill="none"/></svg>')
  },

  // --- FUN & FANTASY ---
  {
    id: 'pixel-cat',
    name: 'Pixel Cat',
    category: 'fantasy',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#140a18"/><path d="M25 30 L40 50 L25 55 Z" fill="#ff7675"/><path d="M75 30 L60 50 L75 55 Z" fill="#ff7675"/><circle cx="50" cy="55" r="28" fill="#2d3436"/><ellipse cx="40" cy="52" rx="4" ry="6" fill="#fdcb6e"/><ellipse cx="60" cy="52" rx="4" ry="6" fill="#fdcb6e"/><polygon points="50,60 46,65 54,65" fill="#ff7675"/></svg>')
  },
  {
    id: 'code-wizard',
    name: 'Code Wizard',
    category: 'fantasy',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#06131e"/><path d="M50 15 L75 55 L25 55 Z" fill="#00b894"/><circle cx="50" cy="62" r="25" fill="#0984e3"/><circle cx="42" cy="60" r="4" fill="#55efc4"/><circle cx="58" cy="60" r="4" fill="#55efc4"/><path d="M45 70 Q50 74 55 70" stroke="#ffffff" stroke-width="2" fill="none"/></svg>')
  },
  {
    id: 'synth-wave',
    name: 'Synth Wave',
    category: 'fantasy',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#1a092b"/><circle cx="50" cy="45" r="25" fill="#e84393"/><rect x="20" y="55" width="60" height="30" rx="10" fill="#6c5ce7"/><line x1="25" y1="45" x2="75" y2="45" stroke="#fd79a8" stroke-width="3"/></svg>')
  },
  {
    id: 'quantum-spark',
    name: 'Quantum Spark',
    category: 'fantasy',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#1c1603"/><circle cx="50" cy="50" r="38" fill="#332906"/><polygon points="50,22 58,40 78,42 62,56 67,76 50,65 33,76 38,56 22,42 42,40" fill="#fdcb6e"/></svg>')
  },
  {
    id: 'fire-dev',
    name: 'Fire Dev',
    category: 'fantasy',
    url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#1e0805"/><path d="M50 20 C65 35 75 55 50 82 C25 55 35 35 50 20 Z" fill="#ff7675"/><path d="M50 40 C58 50 62 62 50 78 C38 62 42 50 50 40 Z" fill="#ffeaa7"/></svg>')
  }
]
