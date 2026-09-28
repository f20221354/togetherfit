export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface PasswordCheck {
  valid: boolean;
  message?: string;
}

export function checkPassword(password: string): PasswordCheck {
  if (password.length < 8) {
    return { valid: false, message: "At least 8 characters" };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: "Include at least one letter and one number" };
  }
  return { valid: true };
}
