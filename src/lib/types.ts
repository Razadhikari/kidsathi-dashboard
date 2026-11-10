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
  preferred_name: string;
  date_of_birth: string | null;
  date_of_birth_bs: string | null;
  gender: string;
  classroom: string | null;
  enrolled_on: string | null;
  allergies: string;
  photo_consent: boolean;
  is_active: boolean;
  guardians: Guardian[];
};

export type Classroom = { id: string; name: string; age_group: string; guides: string[] };

export const RELATIONS = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "grandparent", label: "Grandparent" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" },
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
