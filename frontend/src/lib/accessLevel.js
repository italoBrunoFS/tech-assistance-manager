const ACCESS_LEVEL_BY_ROLE = {
  tecnico: 1,
  gerente: 2,
  admin: 3
};

export function toAccessLevel(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isInteger(value)) {
    return value >= 1 ? value : null;
  }

  const normalized = String(value).trim().toLowerCase();

  if (Object.prototype.hasOwnProperty.call(ACCESS_LEVEL_BY_ROLE, normalized)) {
    return ACCESS_LEVEL_BY_ROLE[normalized];
  }

  if (/^\d+$/.test(normalized)) {
    const parsed = Number(normalized);
    return parsed >= 1 ? parsed : null;
  }

  return null;
}

export function hasManagerAccess(value) {
  const level = toAccessLevel(value);
  return Number.isInteger(level) && level >= 2;
}

export function hasAdminAccess(value) {
  const level = toAccessLevel(value);
  return Number.isInteger(level) && level >= 3;
}

export function formatAccessLevel(value) {
  const level = toAccessLevel(value);
  return Number.isInteger(level) ? String(level) : '-';
}
