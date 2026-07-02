// Rules are checked in order — first match wins.
// Patterns are lowercased substrings matched against the lowercased description.
// income-only rules only apply to positive amounts.

interface Rule {
  patterns: string[];
  category: string;
  incomeOnly?: boolean;
}

const RULES: Rule[] = [
  // ── Income ───────────────────────────────────────────────────────────────
  { patterns: ["salary", "payroll", "payslip", "เงินเดือน", "เงินโอน เงินเดือน"], category: "Income", incomeOnly: true },
  { patterns: ["dividend", "interest", "เงินปันผล", "ดอกเบี้ย"], category: "Income", incomeOnly: true },
  { patterns: ["refund", "cashback", "คืนเงิน"], category: "Income", incomeOnly: true },

  // ── Food & drink — delivery first (more specific) ─────────────────────
  { patterns: ["grab food", "grabfood"], category: "Food & drink" },
  { patterns: ["foodpanda", "food panda"], category: "Food & drink" },
  { patterns: ["lineman", "line man"], category: "Food & drink" },
  { patterns: ["robinhood food"], category: "Food & drink" },

  // Fast food
  { patterns: ["mcdonald", "mcdonalds", "mcd ", "mcd-"], category: "Food & drink" },
  { patterns: ["kfc", "kentucky"], category: "Food & drink" },
  { patterns: ["pizza hut", "pizzahut", "domino"], category: "Food & drink" },
  { patterns: ["burger king", "burgerking"], category: "Food & drink" },
  { patterns: ["subway"], category: "Food & drink" },

  // Cafes & coffee
  { patterns: ["starbucks", "starbuck"], category: "Food & drink" },
  { patterns: ["café amazon", "cafe amazon", "cafeamazon"], category: "Food & drink" },
  { patterns: ["coffee", "café", "cafe"], category: "Food & drink" },
  { patterns: ["tea"], category: "Food & drink" },

  // Convenience & grocery
  { patterns: ["7-eleven", "7eleven", "7/11", "seven eleven"], category: "Food & drink" },
  { patterns: ["family mart", "familymart"], category: "Food & drink" },
  { patterns: ["lawson"], category: "Food & drink" },
  { patterns: ["tops market", "tops supermarket", "tops online"], category: "Food & drink" },
  { patterns: ["villa market"], category: "Food & drink" },
  { patterns: ["rimping"], category: "Food & drink" },
  { patterns: ["makro"], category: "Food & drink" },
  { patterns: ["central food hall", "food hall"], category: "Food & drink" },
  { patterns: ["big c", "bigc"], category: "Food & drink" },
  { patterns: ["lotus", "tesco lotus"], category: "Food & drink" },
  { patterns: ["gourmet market"], category: "Food & drink" },

  // Restaurants / generic
  { patterns: ["restaurant", "ร้านอาหาร"], category: "Food & drink" },
  { patterns: ["bakery"], category: "Food & drink" },
  { patterns: ["sushi"], category: "Food & drink" },
  { patterns: ["ramen", "noodle"], category: "Food & drink" },
  { patterns: ["bbq", "barbecue"], category: "Food & drink" },
  { patterns: ["bar "], category: "Food & drink" },

  // ── Transport ─────────────────────────────────────────────────────────
  { patterns: ["grab"], category: "Transport" }, // after grab food
  { patterns: ["bolt"], category: "Transport" },
  { patterns: ["indriver", "in driver"], category: "Transport" },
  { patterns: ["taxi", "แท็กซี่"], category: "Transport" },
  { patterns: ["bts", "sky train", "skytrain"], category: "Transport" },
  { patterns: ["mrt", "metro"], category: "Transport" },
  { patterns: ["airport link", "airportlink", "arl"], category: "Transport" },
  { patterns: ["ptt ", "pttpl", "bangchak", "esso", "shell", "caltex", "susco", "irpc fuel"], category: "Transport" },
  { patterns: ["fuel", "gasoline", "น้ำมัน"], category: "Transport" },
  { patterns: ["parking", "ที่จอดรถ"], category: "Transport" },
  { patterns: ["tollway", "expressway", "มอเตอร์เวย์"], category: "Transport" },
  { patterns: ["ferry", "boat", "เรือ"], category: "Transport" },
  { patterns: ["airline", "airways", "airasia", "thai airways", "nok air", "bangkok airways", "lion air"], category: "Transport" },

  // ── Bills & utilities ────────────────────────────────────────────────
  { patterns: ["true move", "truemove", "true corp", "truecorp"], category: "Bills & utilities" },
  { patterns: ["ais ", "advanced info"], category: "Bills & utilities" },
  { patterns: ["dtac", "dtac trinet"], category: "Bills & utilities" },
  { patterns: ["nt internet", "tot internet", "tot ", "cat telecom"], category: "Bills & utilities" },
  { patterns: ["3bb", "internet"], category: "Bills & utilities" },
  { patterns: ["electricity", "mea ", "pea ", "egat", "ไฟฟ้า"], category: "Bills & utilities" },
  { patterns: ["water", "mwa", "pwa", "ประปา"], category: "Bills & utilities" },
  { patterns: ["insurance", "ประกัน"], category: "Bills & utilities" },
  { patterns: ["rent", "ค่าเช่า"], category: "Bills & utilities" },
  { patterns: ["mortgage", "home loan", "กู้บ้าน"], category: "Bills & utilities" },
  { patterns: ["netflix"], category: "Bills & utilities" },
  { patterns: ["spotify"], category: "Bills & utilities" },
  { patterns: ["youtube premium"], category: "Bills & utilities" },
  { patterns: ["apple subscription", "apple one", "icloud"], category: "Bills & utilities" },
  { patterns: ["google one", "google storage"], category: "Bills & utilities" },
  { patterns: ["line tv", "viu", "hbo", "disney+", "disneyplus"], category: "Bills & utilities" },

  // ── Health ──────────────────────────────────────────────────────────
  { patterns: ["hospital", "โรงพยาบาล"], category: "Health" },
  { patterns: ["bumrungrad", "samitivej", "sikarin", "phyathai", "bangpakok", "bnh hospital", "rajavithi", "siriraj"], category: "Health" },
  { patterns: ["clinic", "คลินิก"], category: "Health" },
  { patterns: ["dental", "dentist", "ทันตกรรม"], category: "Health" },
  { patterns: ["pharmacy", "ร้านขายยา"], category: "Health" },
  { patterns: ["boots", "watson", "watsons"], category: "Health" },
  { patterns: ["doctor", "แพทย์"], category: "Health" },
  { patterns: ["gym", "fitness"], category: "Health" },

  // ── Entertainment ───────────────────────────────────────────────────
  { patterns: ["major cineplex", "major cinema", "sf cinema", "sfcinema", "cineplex"], category: "Entertainment" },
  { patterns: ["steam", "steamgames"], category: "Entertainment" },
  { patterns: ["playstation", "playstation network", "psn"], category: "Entertainment" },
  { patterns: ["xbox", "xbox game"], category: "Entertainment" },
  { patterns: ["apple arcade", "app store", "apple tv+"], category: "Entertainment" },
  { patterns: ["concert", "event", "ticket", "ticketmaster"], category: "Entertainment" },
  { patterns: ["massage", "spa", "นวด"], category: "Entertainment" },
  { patterns: ["karaoke", "คาราโอเกะ"], category: "Entertainment" },

  // ── Shopping ────────────────────────────────────────────────────────
  { patterns: ["shopee"], category: "Shopping" },
  { patterns: ["lazada"], category: "Shopping" },
  { patterns: ["amazon"], category: "Shopping" },
  { patterns: ["jd central", "jd.co.th"], category: "Shopping" },
  { patterns: ["ikea"], category: "Shopping" },
  { patterns: ["uniqlo"], category: "Shopping" },
  { patterns: ["h&m", "h & m", "zara"], category: "Shopping" },
  { patterns: ["central department", "centralworld", "central world"], category: "Shopping" },
  { patterns: ["siam paragon", "emquartier", "emporium", "emsphere"], category: "Shopping" },
  { patterns: ["terminal 21", "the mall", "seacon", "icon siam", "iconsiam"], category: "Shopping" },
  { patterns: ["robinson"], category: "Shopping" },
  { patterns: ["power buy", "powerbuy"], category: "Shopping" },
  { patterns: ["studio 7", "iphone", "apple store"], category: "Shopping" },
];

export function autoCategorize(
  description: string,
  amount: number,
  categoryMap: Map<string, string>, // lowercase name → id
): string | null {
  const lower = description.toLowerCase();

  for (const rule of RULES) {
    if (rule.incomeOnly && amount <= 0) continue;
    if (!rule.incomeOnly && amount > 0) continue; // skip expense rules for income

    if (rule.patterns.some((p) => lower.includes(p))) {
      const id = categoryMap.get(rule.category.toLowerCase());
      if (id) return id;
    }
  }

  // Fallback: positive amount with no rule → Income category
  if (amount > 0) {
    return categoryMap.get("income") ?? null;
  }

  return null;
}
