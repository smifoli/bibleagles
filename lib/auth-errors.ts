const ERROR_MESSAGES: Record<string, string> = {
  "User already registered": "Este e-mail já está cadastrado.",
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail antes de entrar.",
};

export function translateAuthError(message: string): string {
  return ERROR_MESSAGES[message] ?? message;
}
