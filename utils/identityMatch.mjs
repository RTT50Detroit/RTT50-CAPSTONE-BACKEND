const normalizeName = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// A match needs the same first and last name; middle names and initials may differ.
export const namesMatch = (declared, reported) => {
  const a = normalizeName(declared).split(' ').filter(Boolean);
  const b = normalizeName(reported).split(' ').filter(Boolean);
  if (a.length < 2 || b.length < 2) return false;
  return a[0] === b[0] && a[a.length - 1] === b[b.length - 1];
};

const sameDay = (a, b) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

// Compares what the resume owner declared with what the member verified here and what the
// social provider reports. Returns the list of fields that do not match.
export const findIdentityMismatches = (declared, member) => {
  const mismatches = [];
  const reportedNames = (member.oauthAccounts || []).map((account) => account.reportedName).filter(Boolean);
  if (!reportedNames.some((name) => namesMatch(declared.name, name))) mismatches.push('name');
  if (!member.dateOfBirth || !sameDay(declared.dateOfBirth, member.dateOfBirth)) mismatches.push('dateOfBirth');
  if (String(member.gender || '').toLowerCase() !== declared.sex) mismatches.push('sex');
  return mismatches;
};
