/**
 * Utilidades compartidas de sanitización y validación de formularios.
 */

export const sanitizeLettersOnly = (val) =>
  String(val || '')
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '')
    .replace(/\s{2,}/g, ' ');

export const sanitizeDigitsOnly = (val, maxLen) => {
  const digits = String(val || '').replace(/\D/g, '');
  return typeof maxLen === 'number' ? digits.slice(0, maxLen) : digits;
};

export const sanitizePositiveNumberInput = (val) => {
  const clean = String(val || '').replace(/[-+eE]/g, '');
  return clean;
};

export const blockNegativeNumberKeyDown = (e) => {
  if (['-', 'e', 'E', '+'].includes(e.key)) {
    e.preventDefault();
  }
};

export const countLetters = (val) =>
  (String(val || '').match(/[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]/g) || []).length;

/**
 * Valida campos de texto exigiendo longitud mínima y letras reales (sin solo números/símbolos).
 * Retorna "" si es válido, o el mensaje de error en español.
 */
export const validateTextField = (
  val,
  { label, required = false, minLength = 3, lettersOnly = false, minLetters = 2 }
) => {
  const trimmed = String(val || '').trim();
  if (!trimmed) {
    return required ? `${label} es obligatorio.` : '';
  }
  if (lettersOnly && !/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(trimmed)) {
    return `${label} solo puede contener letras y espacios.`;
  }
  if (trimmed.length < minLength) {
    return `${label} debe tener al menos ${minLength} caracteres.`;
  }
  if (minLetters > 0 && countLetters(trimmed) < minLetters) {
    return `${label} debe contener texto válido con al menos ${minLetters} letras (no solo números).`;
  }
  return '';
};

/**
 * Valida números de teléfono bolivianos (7 u 8 dígitos iniciando en 2, 3, 4, 6 o 7).
 */
export const validateBoliviaPhone = (val, { label = 'El teléfono', required = false } = {}) => {
  const trimmed = String(val || '').trim();
  if (!trimmed) {
    return required ? `${label} es obligatorio.` : '';
  }
  if (!/^[23467][0-9]{6,7}$/.test(trimmed)) {
    return `${label} debe tener 7 u 8 dígitos válidos de Bolivia (ej. 4455667 o 70012345).`;
  }
  return '';
};
