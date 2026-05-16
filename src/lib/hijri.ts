// Lightweight Hijri date conversion (Umm al-Qura approximation good enough for a UI chip).
// Source: Kazimierz M. Borkowski algorithm, simplified.

const HIJRI_MONTHS_EN = [
  "Muharram", "Safar", "Rabiʿ al-Awwal", "Rabiʿ al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Shaʿban",
  "Ramadan", "Shawwal", "Dhu al-Qiʿdah", "Dhu al-Hijjah",
];

const HIJRI_MONTHS_BN = [
  "মুহাররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি",
  "জুমাদাল আউয়াল", "জুমাদাস সানি", "রজব", "শা'বান",
  "রমজান", "শাওয়াল", "জিলকদ", "জিলহজ",
];

function gregorianToJulian(y: number, m: number, d: number): number {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524;
}

export function gregorianToHijri(date: Date): { year: number; month: number; day: number } {
  const jd = gregorianToJulian(date.getFullYear(), date.getMonth() + 1, date.getDate()) + 0.5;
  const l = Math.floor(jd) - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  let l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  l2 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l2) / 709);
  const day = l2 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

function toBnDigits(n: number | string): string {
  const map = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(n).replace(/\d/g, (d) => map[Number(d)]);
}

export function formatHijri(date: Date, lang: "en" | "bn"): string {
  const { year, month, day } = gregorianToHijri(date);
  if (lang === "bn") {
    return `${toBnDigits(day)} ${HIJRI_MONTHS_BN[month - 1]} ${toBnDigits(year)} হিজরি`;
  }
  return `${day} ${HIJRI_MONTHS_EN[month - 1]} ${year} AH`;
}
