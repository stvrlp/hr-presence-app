export const DEPARTMENT_CODE_RE = /^\d{10}$/;

export function isValidDepartmentCode(code: unknown): code is string {
  return typeof code === 'string' && DEPARTMENT_CODE_RE.test(code);
}
