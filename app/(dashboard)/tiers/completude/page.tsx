"use client"

import { useTiersStore } from "@/lib/tiers/store"
import { Tier } from "@/types/tiers"
import { Building, CreditCard, CheckCircle2, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { AssignCompteDialog } from "@/components/tiers/assign-compte-dialog"

const typeConfig: Record<string, { color: string; bg: string; href: (id: string) => string }> = {
    client: { color: 'text-blue-800', bg: 'bg-blue-100', href: (id) => `/tiers/clients/${id}` },
    fournisseur: { color: 'text-purple-800', bg: 'bg-purple-100', href: (id) => `/tiers/fournisseurs/${id}` },
    commercial: { color: 'text-green-800', bg: 'bg-green-100', href: (id) => `/tiers/commerciaux/${id}` },
    prospect: { color: 'text-orange-800', bg: 'bg-orange-100', href: (id) => `/tiers/prospects/${id}` },
}

function TierRow({ tier }: { tier: Tier }) {
    const cfg = typeConfig[tier.type]
    const hasComptable = !!tier.accountingAccount
    const hasBancaire = !!(tier.comptesBancaires && tier.comptesBancaires.length > 0)

    return (
        <div className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 transition-colors">
            <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className={`font-semibold text-sm ${cfg.bg} ${cfg.color}`}>{tier.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <Link href={cfg.href(tier.id)} className="text-sm font-medium hover:text-blue-600 hover:underline truncate">{tier.name}</Link>
                    <Badge className={`text-[10px] ${cfg.bg} ${cfg.color}`}>{tier.type}</Badge>
                </div>
                <p className="text-xs text-gray-400">{tier.city || '—'} · {tier.phoneNumber || '—'}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                {/* Compte Comptable */}
                <div className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-gray-400" />
                    {hasComptable ? (
                        <span className="text-xs font-mono font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">{tier.accountingAccount}</span>
                    ) : (
                        <AssignCompteDialog tier={tier} type="comptable" />
                    )}
                </div>
                {/* Compte Bancaire */}
                <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                    {hasBancaire ? (
                        <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded font-medium">
                            {tier.comptesBancaires!.length} compte(s)
                        </span>
                    ) : (
                        <AssignCompteDialog tier={tier} type="bancaire" />
                    )}
                </div>
            </div>
        </div>
    )
}

function CompletionStats({ tiers }: { tiers: Tier[] }) {
    const withComptable = tiers.filter(t => t.accountingAccount).length
    const withBancaire = tiers.filter(t => t.comptesBancaires && t.comptesBancaires.length > 0).length
    const withBoth = tiers.filter(t => t.accountingAccount && t.comptesBancaires && t.comptesBancaires.length > 0).length
    const total = tiers.length

    const pct = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
                { label: 'Avec compte comptable', value: withComptable, total, color: 'text-blue-600', bg: 'bg-blue-50', icon: Building },
                { label: 'Sans compte comptable', value: total - withComptable, total, color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle },
                { label: 'Avec compte bancaire', value: withBancaire, total, color: 'text-green-600', bg: 'bg-green-50', icon: CreditCard },
                { label: 'Complètement configurés', value: withBoth, total, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
            ].map(stat => (
                <div key={stat.label} className={`rounded-xl border border-gray-100 ${stat.bg} p-4`}>
                    <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-white/60">
                        <div className="h-1.5 rounded-full bg-current opacity-60" style={{ width: `${pct(stat.value)}%`, color: stat.color.replace('text-', '') }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{pct(stat.value)}% du total</p>
                </div>
            ))}
        </div>
    )
}

export default function CompletudeComptablePage() {
    const { tiers } = useTiersStore()

    const sansComptable = tiers.filter(t => !t.accountingAccount)
    const sansBancaire = tiers.filter(t => !t.comptesBancaires || t.comptesBancaires.length === 0)
    const sansTous = tiers.filter(t => !t.accountingAccount && (!t.comptesBancaires || t.comptesBancaires.length === 0))
    const complets = tiers.filter(t => t.accountingAccount && t.comptesBancaires && t.comptesBancaires.length > 0)

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Complétude Comptable</h2>
                <p className="text-sm text-gray-500">Identifiez les tiers sans numéro comptable ou compte bancaire et complétez leurs informations.</p>
            </div>

            <CompletionStats tiers={tiers} />

            <Tabs defaultValue="sans-comptable">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                    <TabsTrigger value="sans-comptable" className="text-xs">
                        Sans N° Comptable
                        {sansComptable.length > 0 && <span className="ml-1.5 rounded-full bg-orange-500 text-white text-[10px] px-1.5">{sansComptable.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="sans-bancaire" className="text-xs">
                        Sans Compte Bancaire
                        {sansBancaire.length > 0 && <span className="ml-1.5 rounded-full bg-orange-500 text-white text-[10px] px-1.5">{sansBancaire.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="sans-tous" className="text-xs">
                        Aucun des deux
                        {sansTous.length > 0 && <span className="ml-1.5 rounded-full bg-red-500 text-white text-[10px] px-1.5">{sansTous.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="complets" className="text-xs">
                        Complets ✓
                    </TabsTrigger>
                </TabsList>

                {[
                    { key: 'sans-comptable', data: sansComptable, title: `${sansComptable.length} tiers sans numéro de compte comptable` },
                    { key: 'sans-bancaire', data: sansBancaire, title: `${sansBancaire.length} tiers sans compte bancaire` },
                    { key: 'sans-tous', data: sansTous, title: `${sansTous.length} tiers sans compte comptable NI bancaire` },
                    { key: 'complets', data: complets, title: `${complets.length} tiers complètement configurés` },
                ].map(tab => (
                    <TabsContent key={tab.key} value={tab.key} className="mt-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <div className="flex items-center gap-2 mb-4">
                                {tab.key === 'complets' ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                )}
                                <p className="text-sm font-semibold text-gray-700">{tab.title}</p>
                            </div>
                            {tab.data.length === 0 ? (
                                <div className="text-center py-10">
                                    <CheckCircle2 className="h-10 w-10 text-green-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">
                                        {tab.key === 'complets' ? 'Aucun tiers complètement configuré' : 'Tous les tiers sont configurés pour ce critère ! ✓'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-0">
                                    {tab.data.map(tier => (
                                        <TierRow key={tier.id} tier={tier} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}
