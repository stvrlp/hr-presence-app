export const EXCLUDED_EMPLOYEE_CODES = ['EXTERNAL', 'ΜΤΚΛΤ_ΕΡΓ', '99998', '99999', '000024'] as const;

const EXCLUDED_EMPLOYEE_CODE_SET = new Set<string>(EXCLUDED_EMPLOYEE_CODES);

export function isExcludedEmployeeCode(code: unknown): code is string {
  return typeof code === 'string' && EXCLUDED_EMPLOYEE_CODE_SET.has(code);
}
