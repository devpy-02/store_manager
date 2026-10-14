import { NameUniquenessSettings, Product } from '../types';

export const DEFAULT_UNIQUENESS_SETTINGS: NameUniquenessSettings = {
  globalNameUniqueness: 'unique',
  globalNameCaseSensitivity: 'case_insensitive',
  globalNameSpaceSensitivity: 'space_sensitive',
  globalNameHalfSpaceSensitivity: 'halfspace_insensitive',
  globalNamePersianNormalization: true,
  globalNameNumberNormalization: true,

  globalCodeUniqueness: 'unique',
  globalCodeCaseSensitivity: 'case_insensitive',
  globalCodeSpaceSensitivity: 'space_sensitive',
  globalCodeHalfSpaceSensitivity: 'halfspace_insensitive',
  globalCodePersianNormalization: true,
  globalCodeNumberNormalization: true,
};

export function normalizeProductName(
  name: string,
  settings: NameUniquenessSettings,
  productOverride?: {
    nameCaseSensitivity?: 'case_insensitive' | 'case_sensitive' | null;
    nameSpaceSensitivity?: 'space_sensitive' | 'space_insensitive' | null;
    nameHalfSpaceSensitivity?: 'halfspace_insensitive' | 'halfspace_sensitive' | null;
    namePersianNormalization?: boolean | null;
    nameNumberNormalization?: boolean | null;
  }
): string {
  if (!name) return '';
  let str = name.trim();

  const caseInsensitive = productOverride?.nameCaseSensitivity
    ? productOverride.nameCaseSensitivity === 'case_insensitive'
    : settings.globalNameCaseSensitivity === 'case_insensitive';

  const spaceInsensitive = productOverride?.nameSpaceSensitivity
    ? productOverride.nameSpaceSensitivity === 'space_insensitive'
    : settings.globalNameSpaceSensitivity === 'space_insensitive';

  const halfSpaceInsensitive = productOverride?.nameHalfSpaceSensitivity
    ? productOverride.nameHalfSpaceSensitivity === 'halfspace_insensitive'
    : settings.globalNameHalfSpaceSensitivity === 'halfspace_insensitive';

  const persianNorm = productOverride?.namePersianNormalization !== null && productOverride?.namePersianNormalization !== undefined
    ? productOverride.namePersianNormalization
    : settings.globalNamePersianNormalization;

  const numberNorm = productOverride?.nameNumberNormalization !== null && productOverride?.nameNumberNormalization !== undefined
    ? productOverride.nameNumberNormalization
    : settings.globalNameNumberNormalization;

  if (persianNorm) {
    str = str
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/أ/g, 'ا')
      .replace(/إ/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و');
  }

  if (numberNorm) {
    str = str
      .replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString())
      .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
  }

  if (halfSpaceInsensitive) {
    str = str.replace(/\u200c/g, '');
  }

  if (spaceInsensitive) {
    str = str.replace(/\s+/g, '');
  } else {
    str = str.replace(/\s+/g, ' ');
  }

  if (caseInsensitive) {
    str = str.toLowerCase();
  }

  return str;
}

export function findDuplicateProduct(
  newName: string,
  existingProducts: Product[],
  settings: NameUniquenessSettings,
  currentProductId?: string,
  productOverride?: {
    allowDuplicateName?: boolean | null;
    nameCaseSensitivity?: 'case_insensitive' | 'case_sensitive' | null;
    nameSpaceSensitivity?: 'space_sensitive' | 'space_insensitive' | null;
    nameHalfSpaceSensitivity?: 'halfspace_insensitive' | 'halfspace_sensitive' | null;
    namePersianNormalization?: boolean | null;
    nameNumberNormalization?: boolean | null;
  }
): Product | null {
  // Check if global uniqueness or product override allows duplicate
  const effectiveAllowDuplicate = productOverride?.allowDuplicateName !== null && productOverride?.allowDuplicateName !== undefined
    ? productOverride.allowDuplicateName
    : settings.globalNameUniqueness === 'allow_duplicate';

  if (effectiveAllowDuplicate) {
    return null; // duplicates allowed for this product
  }

  const normalizedNew = normalizeProductName(newName, settings, productOverride);
  if (!normalizedNew) return null;

  for (const p of existingProducts) {
    if (p.deleted) continue;
    if (currentProductId && p.id === currentProductId) continue; // skip self

    // Check if conflicting product has allowDuplicateName true
    if (p.allowDuplicateName === true) continue;

    const normalizedExisting = normalizeProductName(p.name, settings, {
      nameCaseSensitivity: p.nameCaseSensitivity,
      nameSpaceSensitivity: p.nameSpaceSensitivity,
      nameHalfSpaceSensitivity: p.nameHalfSpaceSensitivity,
      namePersianNormalization: p.namePersianNormalization,
      nameNumberNormalization: p.nameNumberNormalization,
    });

    if (normalizedNew === normalizedExisting) {
      return p;
    }
  }

  return null;
}
