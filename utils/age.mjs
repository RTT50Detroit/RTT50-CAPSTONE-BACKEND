import { MAXIMUM_AGE, MINIMUM_AGE } from '../config/policy.mjs';

// Parses a strict YYYY-MM-DD string as a real calendar date; returns null if invalid.
export const parseDateOfBirth = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof value === 'string' ? value : '');
  if (!match) return null;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate = date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;

  return isRealDate ? date : null;
};

export const calculateAge = (dateOfBirth, today = new Date()) => {
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const hadBirthday = today.getUTCMonth() > dateOfBirth.getUTCMonth()
    || (today.getUTCMonth() === dateOfBirth.getUTCMonth()
      && today.getUTCDate() >= dateOfBirth.getUTCDate());
  if (!hadBirthday) age -= 1;
  return age;
};

// Returns { valid, age, reason } where reason is
// 'required' | 'invalid' | 'future' | 'unrealistic' | 'underage' when invalid.
export const validateDateOfBirth = (value, today = new Date()) => {
  if (!value) return { valid: false, reason: 'required' };

  const date = parseDateOfBirth(value);
  if (!date) return { valid: false, reason: 'invalid' };
  if (date > today) return { valid: false, reason: 'future' };

  const age = calculateAge(date, today);
  if (age > MAXIMUM_AGE) return { valid: false, age, reason: 'unrealistic' };
  if (age < MINIMUM_AGE) return { valid: false, age, reason: 'underage' };

  return { valid: true, age, date };
};
