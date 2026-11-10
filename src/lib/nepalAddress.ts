import { getDistrictsByProvince, getMunicipalitiesByDistrict } from "@manavkhadka0/nepal-address";
import type { Option } from "@/lib/types";

// Our province values → the names the package uses.
const PACKAGE_PROVINCE: Record<string, string> = {
  koshi: "koshi",
  madhesh: "madhesh",
  bagmati: "bagmati",
  gandaki: "gandaki",
  lumbini: "lumbini",
  karnali: "karnali",
  sudurpashchim: "sudurpaschim",
};

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s-])\S/g, (m) => m.toUpperCase()).replace(/Metropolitian/g, "Metropolitan");

/** The package may return strings or objects; accept both. */
function asNames(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((x) => (typeof x === "string" ? x : ((x as { name?: string })?.name ?? "")))
    .filter(Boolean);
}

export function districtsOf(province: string): string[] {
  const key = PACKAGE_PROVINCE[province];
  if (!key) return [];
  try {
    const list = getDistrictsByProvince(key as Parameters<typeof getDistrictsByProvince>[0]);
    return asNames(list).map(titleCase).sort();
  } catch {
    return [];
  }
}

/** "Pokhara Metropolitan City" → "metropolitan", "Lekhnath Municipality" → "municipality", … */
export function typeOfLocalLevel(name: string): string {
  const n = name.toLowerCase();
  if (/sub[\s-]*metropolit/.test(n)) return "sub_metropolitan";
  if (/metropolit/.test(n)) return "metropolitan";
  if (/rural|gaun\s*palika/.test(n)) return "rural_municipality";
  if (/municipal|nagar\s*palika/.test(n)) return "municipality";
  return "";
}

const SUFFIX =
  /\s*(sub[\s-]*metropolit\w*\s+city|metropolit\w*\s+city|rural\s+municipality|municipality|gaun\s*palika|nagar\s*palika)\s*$/i;

/** Local levels of a district, optionally only of one type. value = short name ("Pokhara"). */
export function localLevelsOf(district: string, type: string): Option[] {
  if (!district) return [];
  try {
    const list = getMunicipalitiesByDistrict(
      district.toLowerCase() as Parameters<typeof getMunicipalitiesByDistrict>[0],
    );
    return asNames(list)
      .filter((name) => !type || typeOfLocalLevel(name) === type)
      .map((name) => ({ value: titleCase(name.replace(SUFFIX, "")), label: titleCase(name) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}
