const ERROR_MESSAGES: Record<string, string> = {
  "User already registered": "Este e-mail já está cadastrado.",
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail antes de entrar.",
  "New password should be different from the old password.": "A nova senha deve ser diferente da atual.",
  "Auth session missing!": "Sessão expirada. Solicite um novo link de redefinição.",
};

export function translateAuthError(message: string): string {
  if (ERROR_MESSAGES[message]) return ERROR_MESSAGES[message];
  // Mensagem de usuário banido (lib/admin-actions.ts deleteMember) varia
  // conforme a versão da API ("User is banned", "User banned until ...").
  if (message.toLowerCase().includes("banned")) return "Essa conta foi removida.";
  return message;
}
