// Canonical business type categories — matches the onboarding
// BusinessTypeStep plan (frontend/ app). Kept here as a local copy since
// client/ and frontend/ are separate Vite apps with no shared package;
// if a shared workspace package gets set up later, this and the
// frontend/ version should be merged into one source of truth.
//
// 'other' reveals a free-text input; store { type: slug, custom_type }
// so filtering/reporting later stays clean even for free-text entries.

export const businessTypeOptions = [
  { slug: 'food_packaged_goods', label: 'Food & packaged goods' },
  { slug: 'textiles_garments', label: 'Textiles & garments' },
  { slug: 'packaging_printing', label: 'Packaging & printing' },
  { slug: 'personal_home_care', label: 'Personal & home care' },
  { slug: 'general_manufacturing', label: 'General small-batch manufacturing' },
  { slug: 'other', label: 'Other' },
]