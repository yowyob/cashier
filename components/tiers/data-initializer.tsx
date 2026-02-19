"use client"

import { useEffect } from 'react'
import { useTiersStore } from '@/lib/tiers/store'

export function TiersDataInitializer() {
    const { fetchTiers } = useTiersStore()

    useEffect(() => {
        fetchTiers()
    }, [fetchTiers])

    return null
}
