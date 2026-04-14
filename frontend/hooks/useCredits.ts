'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { formatCredits } from '@/lib/credits'

interface UseCreditsReturn {
  balance: number
  totalUsed: number
  isLoading: boolean
  error: string | null
  deduct: (amount: number, reason: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useCredits(token: string | null): UseCreditsReturn {
  const [balance, setBalance] = useState(0)
  const [totalUsed, setTotalUsed] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasShownLowWarning, setHasShownLowWarning] = useState(false)

  const refresh = useCallback(async () => {
    if (!token) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await api.getCredits(token)
      setBalance(data.balance)
      setTotalUsed(data.total_used ?? 0)

      if (data.balance <= 10 && !hasShownLowWarning) {
        setHasShownLowWarning(true)
        toast.warning(`Low balance: ${formatCredits(data.balance)} remaining`, {
          description: 'Purchase more credits to keep creating.',
          duration: 6000,
          action: {
            label: 'Get Credits',
            onClick: () => { window.location.href = '/pricing' },
          },
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load credits'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [token, hasShownLowWarning])

  /**
   * Optimistically deduct credits from the local state.
   *
   * The actual deduction happens on the backend when the job is submitted.
   * Call refresh() after job completion to sync the authoritative balance.
   */
  const deduct = useCallback(
    async (amount: number, _reason: string): Promise<boolean> => {
      if (!token) return false

      if (balance < amount) {
        toast.error('Insufficient credits', {
          description: `You need ${formatCredits(amount)} but only have ${formatCredits(balance)}.`,
          action: {
            label: 'Get Credits',
            onClick: () => { window.location.href = '/pricing' },
          },
        })
        return false
      }

      // Optimistic local update — backend deducts when job is submitted
      setBalance((prev) => prev - amount)
      setTotalUsed((prev) => prev + amount)

      if (balance - amount <= 10) {
        toast.warning(`${formatCredits(balance - amount)} remaining`, {
          description: "You're running low on credits.",
        })
      }

      return true
    },
    [token, balance]
  )

  useEffect(() => {
    refresh()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  return { balance, totalUsed, isLoading, error, deduct, refresh }
}
