// code paterne pour dto.

export const CODE_PATTERN_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/;
export const CODE_PATTERN_LOGIN = /^[a-zA-Z0-9_-]+$/;

export const CODE_PATTERN_2FA = /^(\d{6}|[a-f0-9]{8})$/;

