import { ApiError } from '@/api/client'

/**
 * Maps backend error codes (the `error` field in API responses, audited from
 * src/controllers/*.js) to actionable French messages. Never surface a raw
 * "Une erreur est survenue" — always say what happened and what to do next.
 */
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Votre session a expiré. Reconnectez-vous pour continuer.',
  FORBIDDEN: "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
  NOT_FOUND: "La ressource demandée n'existe pas ou plus.",
  VALIDATION_ERROR: 'Certains champs sont invalides. Vérifiez le formulaire et réessayez.',
  RATE_LIMIT_EXCEEDED: 'Trop de tentatives. Patientez quelques minutes avant de réessayer.',
  DATABASE_NOT_READY: 'Le service redémarre. Réessayez dans quelques secondes.',
  NETWORK_ERROR: 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.',

  MISSING_ACCOUNT_NUMBER: 'Le numéro de compte est requis.',
  ACCOUNT_NOT_FOUND: "Ce compte n'existe pas. Vérifiez le numéro saisi.",
  ACCOUNT_INACTIVE: 'Ce compte est suspendu et ne peut pas être utilisé pour cette opération.',
  AMOUNT_TOO_LOW: 'Le montant saisi est inférieur au minimum autorisé.',
  AMOUNT_EXCEEDS_LIMIT: 'Le montant saisi dépasse le plafond autorisé pour cette opération.',
  INVALID_AMOUNT: 'Le montant saisi est invalide. Indiquez un nombre positif.',
  EXCEEDS_WITHDRAWAL_LIMIT: 'Ce retrait dépasse le plafond de 500 000 XAF par opération.',
  INSUFFICIENT_FUNDS: 'Solde insuffisant pour cette opération (frais compris).',
  SAME_ACCOUNT: 'Le compte source et le compte destinataire doivent être différents.',
  MISSING_FIELDS: 'Le compte source et le compte destinataire sont requis.',
  SENDER_NOT_FOUND: "Le compte source n'existe pas.",
  RECIPIENT_NOT_FOUND: "Le compte destinataire n'existe pas. Vérifiez le numéro saisi.",
  SENDER_ACCOUNT_INACTIVE: 'Le compte source est suspendu.',
  RECIPIENT_ACCOUNT_INACTIVE: 'Le compte destinataire est suspendu.',

  PAYMENT_NOT_FOUND: 'Ce paiement est introuvable ou ne vous appartient pas.',
  PAYMENT_GATEWAY_ERROR: "Le service de paiement mobile money est momentanément indisponible. Réessayez dans un instant.",
  INVALID_PAYMENT_STATUS: 'Seuls les paiements terminés peuvent être remboursés.',
  MISSING_REFERENCE: 'La référence du paiement est requise.',

  MISSING_CALLBACK_URL: "L'URL de callback est requise.",
  GATEWAY_ERROR: 'Le service de paiement mobile money est momentanément indisponible.',
}

/** Returns an actionable French message for any error thrown by the API client. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code && ERROR_MESSAGES[error.code]) return ERROR_MESSAGES[error.code]
    if (error.message) return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Une erreur inattendue est survenue. Réessayez, et contactez le support si le problème persiste.'
}
