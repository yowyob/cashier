"use client"

import { TiersStats } from "@/components/tiers/tier-stats"
import { useTiersStore } from "@/lib/tiers/store"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, Truck, Briefcase, UserPlus, CheckCircle2, ArrowRight, Calendar } from "lucide-react"

export default function TiersDashboardPage() {
    const { tiers, openScheduler } = useTiersStore()

    const recentTiers = [...tiers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

    const pendingActions = tiers.flatMap(t =>
        (t.actions || []).filter(a => a.status === 'PENDING').map(a => ({ ...a, tierName: t.name, tierId: t.id }))
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5)

    const modules = [
        { title: 'Clients', href: '/tiers/clients', icon: Users, color: 'bg-blue-600', description: `${tiers.filter(t => t.type === 'client').length} enregistrés` },
        { title: 'Fournisseurs', href: '/tiers/fournisseurs', icon: Truck, color: 'bg-purple-600', description: `${tiers.filter(t => t.type === 'fournisseur').length} enregistrés` },
        { title: 'Commerciaux', href: '/tiers/commerciaux', icon: Briefcase, color: 'bg-green-600', description: `${tiers.filter(t => t.type === 'commercial').length} enregistrés` },
        { title: 'Prospects', href: '/tiers/prospects', icon: UserPlus, color: 'bg-orange-600', description: `${tiers.filter(t => t.type === 'prospect').length} enregistrés` },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Gestion des Tiers</h2>
                    <p className="text-sm text-gray-500 mt-1">Gérez vos clients, fournisseurs, commerciaux et prospects</p>
                </div>
                <Button
                    onClick={() => openScheduler()}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                    <Calendar className="h-4 w-4" />
                    Planifier une Action
                </Button>
            </div>

            {/* Stats */}
            <TiersStats />

            {/* Quick Access Modules */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {modules.map((mod) => {
                    const Icon = mod.icon
                    return (
                        <Link key={mod.href} href={mod.href}
                            className="group flex flex-col p-5 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-blue-200 transition-all"
                        >
                            <div className={`h-10 w-10 rounded-xl ${mod.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="font-semibold text-gray-800">{mod.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">{mod.description}</p>
                            <div className="flex items-center gap-1 mt-3 text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Voir tout <ArrowRight className="h-3 w-3" />
                            </div>
                        </Link>
                    )
                })}
            </div>

            {/* Recent Tiers + Pending Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Tiers */}
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">Tiers Récents</h3>
                        <Link href="/tiers/clients" className="text-xs text-blue-600 hover:underline">Voir tout</Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {recentTiers.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">Aucun tiers enregistré</p>
                        ) : recentTiers.map(tier => (
                            <div key={tier.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${tier.type === 'client' ? 'bg-blue-500' :
                                        tier.type === 'fournisseur' ? 'bg-purple-500' :
                                            tier.type === 'commercial' ? 'bg-green-500' : 'bg-orange-500'
                                    }`}>
                                    {tier.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{tier.name}</p>
                                    <p className="text-xs text-gray-400">{tier.city} · {tier.type}</p>
                                </div>
                                <Link href={`/tiers/${tier.type === 'fournisseur' ? 'fournisseurs' : tier.type + 's'}/${tier.id}`}
                                    className="text-xs text-blue-600 hover:underline shrink-0">
                                    Voir
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pending Actions */}
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">Actions en Attente</h3>
                        <Link href="/tiers/actions" className="text-xs text-blue-600 hover:underline">Voir tout</Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {pendingActions.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">Aucune action en attente</p>
                        ) : pendingActions.map(action => (
                            <div key={action.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <CheckCircle2 className="h-4 w-4 text-orange-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{action.title}</p>
                                    <p className="text-xs text-gray-400">{action.tierName} · {new Date(action.date).toLocaleDateString('fr-FR')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
