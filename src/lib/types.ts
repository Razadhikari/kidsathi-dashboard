export type Guardian = {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  relation: string;
  is_primary: boolean;
  can_pickup: boolean;
};

export type Child = {
  id: string;
  first_name: string;
  last_name: string;
  full_name_ne: string;
  preferred_name: string;
  date_of_birth: string | null;
  date_of_birth_bs: string | null;
  gender: string;
  contact_phone: string;
  classroom: string | null;
  section: string;
  roll_no: string;
  iemis_code: string;
  enrolled_on: string | null;
  caste_ethnicity?: string; // only sent to school admins
  mother_tongue: string;
  birth_registration_no?: string; // only sent to school admins
  permanent_province: string;
  permanent_district: string;
  permanent_local_level_type: string;
  permanent_local_level: string;
  permanent_ward: number | null;
  permanent_tole: string;
  house_no: string;
  city: string;
  postal_code: string;
  current_address: string;
  father_name_en: string;
  father_name_ne: string;
  mother_name_en: string;
  mother_name_ne: string;
  allergies: string;
  photo_consent: boolean;
  is_active: boolean;
  guardians: Guardian[];
};

export type Classroom = { id: string; name: string; age_group: string; guides: string[] };

export type Option = { value: string; label: string };

export const RELATIONS: Option[] = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "grandparent", label: "Grandparent" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" },
];

export const PROVINCES: Option[] = [
  { value: "koshi", label: "Koshi" },
  { value: "madhesh", label: "Madhesh" },
  { value: "bagmati", label: "Bagmati" },
  { value: "gandaki", label: "Gandaki" },
  { value: "lumbini", label: "Lumbini" },
  { value: "karnali", label: "Karnali" },
  { value: "sudurpashchim", label: "Sudurpashchim" },
];

export const LOCAL_LEVEL_TYPES: Option[] = [
  { value: "metropolitan", label: "Metropolitan City (महानगरपालिका)" },
  { value: "sub_metropolitan", label: "Sub-Metropolitan City (उपमहानगरपालिका)" },
  { value: "municipality", label: "Municipality (नगरपालिका)" },
  { value: "rural_municipality", label: "Rural Municipality (गाउँपालिका)" },
];

export const ETHNICITIES: Option[] = [
  { value: "brahmin_chhetri", label: "Brahmin / Chhetri" },
  { value: "janajati", label: "Janajati / जनजाति" },
  { value: "dalit", label: "Dalit / दलित" },
  { value: "madhesi", label: "Madhesi / मधेसी" },
  { value: "muslim", label: "Muslim / मुस्लिम" },
  { value: "other", label: "Other / अन्य" },
];

export function fullName(c: Pick<Child, "first_name" | "last_name">) {
  return `${c.first_name} ${c.last_name}`.trim();
}

export function age(dateOfBirth: string | null): string {
  if (!dateOfBirth) return "–";
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;
  return months < 24 ? `${months} months` : `${Math.floor(months / 12)} y ${months % 12} m`;
}
