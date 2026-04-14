export const CREDIT_COSTS = {
  text2video_5s_standard: 10,
  text2video_5s_pro: 18,
  text2video_10s_standard: 20,
  text2video_10s_pro: 35,
  image2video: 15,
  image2video_10s: 25,
  lipsync: 20,
  editor: 5,
} as const

export type CreditCostKey = keyof typeof CREDIT_COSTS

/**
 * Get credit cost for a given operation type, duration, and quality.
 */
export function getCreditCost(
  type: 'text2video' | 'image2video' | 'lipsync' | 'editor',
  duration?: 5 | 10,
  quality?: 'standard' | 'pro'
): number {
  switch (type) {
    case 'text2video': {
      const d = duration ?? 5
      const q = quality ?? 'standard'
      const key = `text2video_${d}s_${q}` as CreditCostKey
      return CREDIT_COSTS[key] ?? CREDIT_COSTS.text2video_5s_standard
    }
    case 'image2video': {
      const d = duration ?? 5
      return d === 10 ? CREDIT_COSTS.image2video_10s : CREDIT_COSTS.image2video
    }
    case 'lipsync':
      return CREDIT_COSTS.lipsync
    case 'editor':
      return CREDIT_COSTS.editor
    default:
      return 10
  }
}

/**
 * Format credit number with label.
 * e.g. 50 → "50 credits", 1234 → "1,234 credits"
 */
export function formatCredits(n: number): string {
  const formatted = n.toLocaleString('en-US')
  return `${formatted} ${n === 1 ? 'credit' : 'credits'}`
}

/**
 * Check if the user has enough credits.
 */
export function hasEnoughCredits(balance: number, cost: number): boolean {
  return balance >= cost
}

/**
 * Returns a severity level based on credit balance.
 */
export function getCreditStatus(balance: number): 'ok' | 'low' | 'critical' | 'empty' {
  if (balance === 0) return 'empty'
  if (balance <= 5) return 'critical'
  if (balance <= 15) return 'low'
  return 'ok'
}

/**
 * Credit packages available for purchase.
 */
export const CREDIT_PACKAGES = [
  { id: 'starter', credits: 100, price: 9, label: 'Starter Pack', popular: false },
  { id: 'creator', credits: 300, price: 24, label: 'Creator Pack', popular: true },
  { id: 'studio', credits: 700, price: 49, label: 'Studio Pack', popular: false },
  { id: 'pro', credits: 1500, price: 89, label: 'Pro Pack', popular: false },
] as const
