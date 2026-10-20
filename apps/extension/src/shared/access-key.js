export const ACCESS_KEY_PATTERN = /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/;

export const NFE_MODEL = '55';
export const NFCE_MODEL = '65';
export const VALID_MODELS = Object.freeze([NFE_MODEL, NFCE_MODEL]);

export const VALID_UFS = Object.freeze([
  '11', '12', '13', '14', '15', '16', '17',
  '21', '22', '23', '24', '25', '26', '27', '28', '29',
  '31', '32', '33', '35',
  '41', '42', '43',
  '50', '51', '52', '53',
]);
