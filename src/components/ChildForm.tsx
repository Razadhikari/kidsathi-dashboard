"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { errorStyle, input, label, muted, primaryButton, secondaryButton, textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { type Child, type Classroom, ETHNICITIES, LOCAL_LEVEL_TYPES, type Option, PROVINCES } from "@/lib/types";

type Props = {
  child?: Child; // given → edit this child; missing → add a new one
  classrooms: Classroom[];
  onSaved: (child: Child) => void;
  onCancel?: () => void;
};

function toForm(c?: Child) {
  return {
    first_name: c?.first_name ?? "",
    last_name: c?.last_name ?? "",
    full_name_ne: c?.full_name_ne ?? "",
    preferred_name: c?.preferred_name ?? "",
    gender: c?.gender ?? "",
    contact_phone: c?.contact_phone?.replace(/^\+977/, "") ?? "",
    date_of_birth: c?.date_of_birth ?? "",
    date_of_birth_bs: c?.date_of_birth_bs ?? "",
    classroom: c?.classroom ?? "",
    enrolled_on: c?.enrolled_on ?? "",
    caste_ethnicity: c?.caste_ethnicity ?? "",
    mother_tongue: c?.mother_tongue ?? "",
    birth_registration_no: c?.birth_registration_no ?? "",
    permanent_province: c?.permanent_province ?? "",
    permanent_district: c?.permanent_district ?? "",
    permanent_local_level_type: c?.permanent_local_level_type ?? "",
    permanent_local_level: c?.permanent_local_level ?? "",
    permanent_ward: c?.permanent_ward?.toString() ?? "",
    permanent_tole: c?.permanent_tole ?? "",
    house_no: c?.house_no ?? "",
    city: c?.city ?? "",
    postal_code: c?.postal_code ?? "",
    current_address: c?.current_address ?? "",
    father_name_en: c?.father_name_en ?? "",
    father_name_ne: c?.father_name_ne ?? "",
    father_phone: "",
    mother_name_en: c?.mother_name_en ?? "",
    mother_name_ne: c?.mother_name_ne ?? "",
    mother_phone: "",
    allergies: c?.allergies ?? "",
    photo_consent: c?.photo_consent ?? false,
  };
}

type FormState = ReturnType<typeof toForm>;

function Section({ title, note }: { title: string; note?: string }) {
  return (
    <div className="md:col-span-3 border-t border-[#F0EBE1] pt-4 mt-2">
      <h3 className="text-lg font-bold">{title}</h3>
      {note && <p className={`${muted} text-sm`}>{note}</p>}
    </div>
  );
}

function Field({ text, children, wide }: { text: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`${label} ${wide ? "md:col-span-3" : ""}`}>
      {text}
      {children}
    </label>
  );
}

function Select({ value, onChange, options, empty }: {
  value: string; onChange: (v: string) => void; options: Option[]; empty: string;
}) {
  return (
    <select className={input} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{empty}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export default function ChildForm({ child, classrooms, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(child));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isNew = !child;

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function copyPermanentAddress() {
    const type = LOCAL_LEVEL_TYPES.find((t) => t.value === form.permanent_local_level_type)?.label.split(" (")[0];
    const parts = [
      form.house_no && `House ${form.house_no}`,
      form.permanent_tole,
      form.permanent_ward && `Ward ${form.permanent_ward}`,
      [form.permanent_local_level, type].filter(Boolean).join(" "),
      form.permanent_district,
      PROVINCES.find((p) => p.value === form.permanent_province)?.label,
    ];
    set("current_address", parts.filter(Boolean).join(", "));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const { father_phone, mother_phone, date_of_birth_bs, permanent_ward, ...rest } = form;
    const body: Record<string, unknown> = {
      ...rest,
      date_of_birth: rest.date_of_birth || null,
      enrolled_on: rest.enrolled_on || null,
      classroom: rest.classroom || null,
      permanent_ward: permanent_ward ? Number(permanent_ward) : null,
    };
    // If the BS birthday was typed or changed, the server calculates the AD date from it.
    if (date_of_birth_bs && date_of_birth_bs !== (child?.date_of_birth_bs ?? "")) {
      body.date_of_birth_bs = date_of_birth_bs;
      delete body.date_of_birth;
    }

    let saved: Child;
    try {
      saved = child
        ? await api<Child>(`/api/v1/children/${child.id}/`, { method: "PATCH", json: body })
        : await api<Child>("/api/v1/children/", { method: "POST", json: body });
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
      return;
    }

    // New child: link father and mother as parents (so they can log in to the app).
    if (isNew) {
      const parents = [
        { phone: father_phone, name: rest.father_name_en || rest.father_name_ne, relation: "father" },
        { phone: mother_phone, name: rest.mother_name_en || rest.mother_name_ne, relation: "mother" },
      ].filter((p) => p.phone.trim());
      for (const [i, p] of parents.entries()) {
        try {
          await api(`/api/v1/children/${saved.id}/guardians/`, {
            method: "POST",
            json: { phone_number: p.phone, full_name: p.name || "Parent", relation: p.relation, is_primary: i === 0 },
          });
        } catch (err) {
          window.alert(`The child was saved, but the ${p.relation} could not be added: ${errorText(err)}\n` +
            "You can add them on the child's page.");
        }
      }
    }
    setSaving(false);
    onSaved(saved);
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Section title="Student · विद्यार्थी" />
      <Field text="First name (English) *">
        <input className={input} required value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
      </Field>
      <Field text="Last name (English)">
        <input className={input} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
      </Field>
      <Field text="Full name in Nepali (देवनागरी)">
        <input className={input} placeholder="सचिन श्रेष्ठ" value={form.full_name_ne}
          onChange={(e) => set("full_name_ne", e.target.value)} />
      </Field>
      <Field text="Called (nickname)">
        <input className={input} value={form.preferred_name} onChange={(e) => set("preferred_name", e.target.value)} />
      </Field>
      <Field text="Gender / लिङ्ग">
        <Select value={form.gender} onChange={(v) => set("gender", v)} empty="Not specified" options={[
          { value: "female", label: "Female / महिला" },
          { value: "male", label: "Male / पुरुष" },
          { value: "other", label: "Other / अन्य" },
        ]} />
      </Field>
      <Field text="Contact number">
        <input className={input} placeholder="98XXXXXXXX" value={form.contact_phone}
          onChange={(e) => set("contact_phone", e.target.value)} />
      </Field>

      <Section title="Birthday · जन्म मिति" note="Fill in one of them. A BS date is converted to AD automatically." />
      <Field text="Date of birth (BS) · वि.सं.">
        <input className={input} placeholder="2079-05-14" value={form.date_of_birth_bs}
          onChange={(e) => set("date_of_birth_bs", e.target.value)} />
      </Field>
      <Field text="Date of birth (AD) · ई.सं.">
        <input className={input} type="date" value={form.date_of_birth}
          onChange={(e) => set("date_of_birth", e.target.value)} />
      </Field>
      <div />

      <Section title="School · विद्यालय" />
      <Field text="Class / कक्षा">
        <select className={input} value={form.classroom} onChange={(e) => set("classroom", e.target.value)}>
          <option value="">No classroom yet</option>
          {classrooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </Field>
      <Field text="Enrolled on">
        <input className={input} type="date" value={form.enrolled_on} onChange={(e) => set("enrolled_on", e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-semibold md:mt-6">
        <input type="checkbox" className="w-5 h-5" checked={form.photo_consent}
          onChange={(e) => set("photo_consent", e.target.checked)} />
        Parents agree to photos
      </label>

      <Section title="Background" note="Caste/ethnicity and the birth registration number are visible to school admins only." />
      <Field text="Caste / ethnicity · जात/जाति">
        <Select value={form.caste_ethnicity} onChange={(v) => set("caste_ethnicity", v)} options={ETHNICITIES}
          empty="Not specified" />
      </Field>
      <Field text="Mother tongue · मातृभाषा">
        <input className={input} placeholder="Nepali, Newari, Maithili…" value={form.mother_tongue}
          onChange={(e) => set("mother_tongue", e.target.value)} />
      </Field>
      <Field text="Birth registration no. · जन्मदर्ता नं.">
        <input className={input} placeholder="67-01-78-01234" value={form.birth_registration_no}
          onChange={(e) => set("birth_registration_no", e.target.value)} />
      </Field>

      <Section title="Permanent address · स्थायी ठेगाना" />
      <Field text="Province · प्रदेश">
        <Select value={form.permanent_province} onChange={(v) => set("permanent_province", v)} options={PROVINCES}
          empty="Choose province" />
      </Field>
      <Field text="District · जिल्ला">
        <input className={input} placeholder="Kaski" value={form.permanent_district}
          onChange={(e) => set("permanent_district", e.target.value)} />
      </Field>
      <Field text="Local level type">
        <Select value={form.permanent_local_level_type} onChange={(v) => set("permanent_local_level_type", v)}
          options={LOCAL_LEVEL_TYPES} empty="Choose type" />
      </Field>
      <Field text="Municipality name · पालिका">
        <input className={input} placeholder="Pokhara" value={form.permanent_local_level}
          onChange={(e) => set("permanent_local_level", e.target.value)} />
      </Field>
      <Field text="Ward no. · वडा नं.">
        <input className={input} type="number" min={1} max={35} value={form.permanent_ward}
          onChange={(e) => set("permanent_ward", e.target.value)} />
      </Field>
      <Field text="Tole / street · टोल">
        <input className={input} placeholder="Srijana Chowk" value={form.permanent_tole}
          onChange={(e) => set("permanent_tole", e.target.value)} />
      </Field>
      <Field text="House no. · घर नं.">
        <input className={input} value={form.house_no} onChange={(e) => set("house_no", e.target.value)} />
      </Field>
      <Field text="City · शहर">
        <input className={input} value={form.city} onChange={(e) => set("city", e.target.value)} />
      </Field>
      <Field text="Postal code">
        <input className={input} placeholder="33700" value={form.postal_code}
          onChange={(e) => set("postal_code", e.target.value)} />
      </Field>

      <Section title="Current address · अस्थायी ठेगाना" />
      <div className="md:col-span-3 flex flex-wrap gap-3 items-end">
        <label className={`${label} flex-1 min-w-64`}>
          Current / temporary address
          <input className={input} placeholder="Tole, municipality, district" value={form.current_address}
            onChange={(e) => set("current_address", e.target.value)} />
        </label>
        <button type="button" className={secondaryButton} onClick={copyPermanentAddress}>Same as permanent</button>
      </div>

      <Section
        title="Family · परिवार"
        note={isNew
          ? "Parents with a mobile number are linked automatically and can log in to the KidSathi app."
          : "Parents' phone numbers and app access are managed below on the child's page."}
      />
      <Field text="Father's name (English)">
        <input className={input} value={form.father_name_en} onChange={(e) => set("father_name_en", e.target.value)} />
      </Field>
      <Field text="बुबाको नाम (नेपाली)">
        <input className={input} value={form.father_name_ne} onChange={(e) => set("father_name_ne", e.target.value)} />
      </Field>
      {isNew ? (
        <Field text="Father's mobile">
          <input className={input} placeholder="98XXXXXXXX" value={form.father_phone}
            onChange={(e) => set("father_phone", e.target.value)} />
        </Field>
      ) : <div />}
      <Field text="Mother's name (English)">
        <input className={input} value={form.mother_name_en} onChange={(e) => set("mother_name_en", e.target.value)} />
      </Field>
      <Field text="आमाको नाम (नेपाली)">
        <input className={input} value={form.mother_name_ne} onChange={(e) => set("mother_name_ne", e.target.value)} />
      </Field>
      {isNew ? (
        <Field text="Mother's mobile">
          <input className={input} placeholder="98XXXXXXXX" value={form.mother_phone}
            onChange={(e) => set("mother_phone", e.target.value)} />
        </Field>
      ) : <div />}

      <Section title="Health" />
      <Field text="Allergies and health notes (staff and parents only)" wide>
        <textarea className={textarea} value={form.allergies} onChange={(e) => set("allergies", e.target.value)} />
      </Field>

      {error && <p className={`${errorStyle} md:col-span-3`}>{error}</p>}
      <div className="md:col-span-3 flex gap-3 border-t border-[#F0EBE1] pt-4">
        <button className={primaryButton} disabled={saving}>
          {saving ? "Saving…" : isNew ? "Add child" : "Save changes"}
        </button>
        {onCancel && (
          <button type="button" className={secondaryButton} onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  );
}
