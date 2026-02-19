"use client"

import { useTiersStore } from '@/lib/tiers/store'
import { Users, Truck, Briefcase, UserPlus, CheckCircle2, TrendingUp } from 'lucide-react'

export function TiersStats() {
    const { tiers, isLoading } = useTiersStore()

    const clientCount = tiers.filter(t => t.type === 'client').length
    const fournisseurCount = tiers.filter(t => t.type === 'fournisseur').length
    const commercialCount = tiers.filter(t => t.type === 'commercial').length
    const prospectCount = tiers.filter(t => t.type === 'prospect').length
    const activeCount = tiers.filter(t => t.active).length
    const allActionsCount = tiers.reduce((acc, t) => acc + (t.actions?.length || 0), 0)

    const stats = [
        { label: 'Clients', value: clientCount, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        { label: 'Fournisseurs', value: fournisseurCount, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
        { label: 'Commerciaux', value: commercialCount, icon: Briefcase, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
        { label: 'Prospects', value: prospectCount, icon: UserPlus, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
        { label: 'Actions', value: allActionsCount, icon: CheckCircle2, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
        { label: 'Actifs', value: activeCount, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
    ]

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 p-4 animate-pulse">
                        <div className="h-8 w-8 bg-gray-200 rounded-lg mb-3" />
                        <div className="h-6 w-12 bg-gray-200 rounded mb-1" />
                        <div className="h-4 w-16 bg-gray-100 rounded" />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((stat) => {
                const Icon = stat.icon
                return (
                    <div key={stat.label} className={`rounded-xl border ${stat.border} ${stat.bg} p-4 transition-all hover:shadow-md`}>
                        <div className={`h-9 w-9 rounded-lg bg-white flex items-center justify-center mb-3 shadow-sm`}>
                            <Icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                    </div>
                )
            })}
        </div>
    )
}
