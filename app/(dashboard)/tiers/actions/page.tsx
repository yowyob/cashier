"use client"

import { useTiersStore } from "@/lib/tiers/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, XCircle, CalendarCheck, Plus } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { TiersAction } from "@/types/tiers"

const typeLabels: Record<string, string> = {
    RELANCE_PAIEMENT: 'Relance Paiement',
    DEMANDE_DEVIS: 'Demande Devis',
    RDV_CLIENT: 'Rendez-vous',
    RECLAMATION: 'Réclamation',
    COMMANDE: 'Commande',
    LIVRAISON: 'Livraison',
    AUTRE: 'Autre',
}

const statusConfig = {
    PENDING: { label: 'En attente', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    DONE: { label: 'Terminé', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    CANCELLED: { label: 'Annulé', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
}

export default function ActionsPage() {
    const { tiers, openScheduler, updateTier } = useTiersStore()

    const allActions: (TiersAction & { tierName: string; tierId: string })[] = tiers.flatMap(tier =>
        (tier.actions || []).map(action => ({ ...action, tierName: tier.name, tierId: tier.id }))
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const pending = allActions.filter(a => a.status === 'PENDING')
    const done = allActions.filter(a => a.status === 'DONE')

    const markDone = (tierId: string, actionId: string) => {
        const tier = tiers.find(t => t.id === tierId)
        if (!tier) return
        const updatedActions = (tier.actions || []).map(a => a.id === actionId ? { ...a, status: 'DONE' as const, completedAt: new Date() } : a)
        updateTier(tierId, { actions: updatedActions })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Actions Planifiées</h2>
                    <p className="text-sm text-gray-500">{pending.length} en attente · {done.length} terminées</p>
                </div>
                <Button onClick={() => openScheduler()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <Plus className="h-4 w-4" />
                    Nouvelle Action
                </Button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'En attente', count: pending.length, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Terminées', count: done.length, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Total', count: allActions.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map(stat => (
                    <div key={stat.label} className={`rounded-xl p-4 ${stat.bg} border border-gray-100`}>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Actions List */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">En attente</h3>
                {pending.length === 0 ? (
                    <div className="text-center py-12 rounded-xl border border-dashed border-gray-200">
                        <CalendarCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Aucune action en attente</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => openScheduler()}>
                            <Plus className="h-4 w-4 mr-1" /> Planifier une action
                        </Button>
                    </div>
                ) : pending.map(action => {
                    const config = statusConfig['PENDING']
                    const StatusIcon = config.icon
                    const isOverdue = new Date(action.date) < new Date()
                    return (
                        <div key={action.id} className={`flex items-start gap-4 p-4 rounded-xl border ${config.border} ${config.bg} transition-all`}>
                            <div className={`h-9 w-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm`}>
                                <StatusIcon className={`h-5 w-5 ${isOverdue ? 'text-red-600' : config.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-gray-900 text-sm">{action.title}</span>
                                    <Badge className="text-[10px] bg-blue-100 text-blue-800">{typeLabels[action.type] || action.type}</Badge>
                                    {isOverdue && <Badge variant="destructive" className="text-[10px]">En retard</Badge>}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{action.tierName} · {format(new Date(action.date), 'dd MMM yyyy', { locale: fr })}</p>
                                {action.object && <p className="text-xs text-gray-600 mt-1 truncate">{action.object}</p>}
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="shrink-0 text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => markDone(action.tierId, action.id)}
                            >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Terminer
                            </Button>
                        </div>
                    )
                })}

                {done.length > 0 && (
                    <>
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider pt-4">Terminées</h3>
                        {done.slice(0, 5).map(action => (
                            <div key={action.id} className="flex items-start gap-4 p-4 rounded-xl border border-green-100 bg-green-50/30 opacity-60">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-gray-700 text-sm line-through">{action.title}</p>
                                    <p className="text-xs text-gray-400">{action.tierName} · {format(new Date(action.date), 'dd MMM yyyy', { locale: fr })}</p>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    )
}
