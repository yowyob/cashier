"use client"

import { useTiersStore } from "@/lib/tiers/store"
import { TiersClient, TiersFournisseur, TiersCommercial, TiersProspect } from "@/types/tiers"
import { Users, Truck, Briefcase, UserPlus, TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle, BarChart3, Activity, Award, Building, CreditCard } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

function StatCard({ label, value, sub, icon: Icon, color, bg }: any) {
    return (
        <div className={`rounded-xl border border-gray-100 ${bg} p-5`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
                    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                </div>
                <div className={`h-11 w-11 rounded-xl bg-white flex items-center justify-center shadow-sm`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                </div>
            </div>
        </div>
    )
}

function SectionTitle({ icon: Icon, title, color }: any) {
    return (
        <div className={`flex items-center gap-2 mb-4`}>
            <Icon className={`h-5 w-5 ${color}`} />
            <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        </div>
    )
}

export default function TiersStatsPage() {
    const { tiers } = useTiersStore()

    const clients = tiers.filter((t): t is TiersClient => t.type === 'client')
    const fournisseurs = tiers.filter((t): t is TiersFournisseur => t.type === 'fournisseur')
    const commerciaux = tiers.filter((t): t is TiersCommercial => t.type === 'commercial')
    const prospects = tiers.filter((t): t is TiersProspect => t.type === 'prospect')

    // === ACTIONS ===
    const allActions = tiers.flatMap(t => t.actions || [])
    const pendingActions = allActions.filter(a => a.status === 'PENDING')
    const doneActions = allActions.filter(a => a.status === 'DONE')
    const overdueActions = pendingActions.filter(a => new Date(a.date) < new Date())

    // === COMPLETUDE ===
    const withComptable = tiers.filter(t => t.accountingAccount)
    const withBancaire = tiers.filter(t => t.comptesBancaires && t.comptesBancaires.length > 0)

    // === CLIENTS ===
    const clientsActifs = clients.filter(c => c.active)
    const clientsInactifs = clients.filter(c => !c.active)
    const segmentCounts = clients.reduce((acc, c) => {
        if (c.segment) acc[c.segment] = (acc[c.segment] || 0) + 1
        return acc
    }, {} as Record<string, number>)
    const totalSoldeClients = clients.reduce((acc, c) => acc + (c.financial?.solde || 0), 0)

    // === PROSPECTS ===
    const prospectsEleves = prospects.filter(p => p.potential === 'ELEVE' || p.potential === 'STRATEGIQUE')
    const avgProbabilite = prospects.length > 0
        ? Math.round(prospects.reduce((acc, p) => acc + (p.probability || 0), 0) / prospects.length)
        : 0
    const sourceCounts = prospects.reduce((acc, p) => {
        if (p.source) acc[p.source] = (acc[p.source] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    // === COMMERCIAUX ===
    const avgCommission = commerciaux.length > 0
        ? (commerciaux.reduce((acc, c) => acc + (c.commission || 0), 0) / commerciaux.length).toFixed(1)
        : 0
    const totalAffaires = commerciaux.flatMap(c => c.affaires || [])
    const affairesGagnees = totalAffaires.filter(a => a.status === 'gagnée')
    const tauxConversion = totalAffaires.length > 0
        ? Math.round((affairesGagnees.length / totalAffaires.length) * 100)
        : 0

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Statistiques Tiers</h2>
                <p className="text-sm text-gray-500">Vue complète de votre base de tiers et de leur activité.</p>
            </div>

            {/* === VUE GLOBALE === */}
            <section>
                <SectionTitle icon={BarChart3} title="Vue Globale" color="text-gray-600" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Tiers" value={tiers.length} sub={`${tiers.filter(t => t.active).length} actifs`} icon={Activity} color="text-gray-700" bg="bg-gray-50" />
                    <StatCard label="Clients" value={clients.length} sub={`${clientsActifs.length} actifs`} icon={Users} color="text-blue-600" bg="bg-blue-50" />
                    <StatCard label="Fournisseurs" value={fournisseurs.length} sub={`${fournisseurs.filter(f => f.active).length} actifs`} icon={Truck} color="text-purple-600" bg="bg-purple-50" />
                    <StatCard label="Commerciaux" value={commerciaux.length} sub={`Commission moy. ${avgCommission}%`} icon={Briefcase} color="text-green-600" bg="bg-green-50" />
                </div>
            </section>

            {/* === CLIENTS === */}
            <section>
                <SectionTitle icon={Users} title="Clients" color="text-blue-600" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <StatCard label="Actifs" value={clientsActifs.length} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
                    <StatCard label="Inactifs" value={clientsInactifs.length} icon={TrendingDown} color="text-red-500" bg="bg-red-50" />
                    <StatCard label="Taux d'activité" value={`${clients.length > 0 ? Math.round((clientsActifs.length / clients.length) * 100) : 0}%`} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50" />
                    <StatCard
                        label="Solde cumulé"
                        value={`${(totalSoldeClients / 1000).toFixed(0)}K XAF`}
                        sub={totalSoldeClients < 0 ? '⚠ Encours négatif' : 'Encours global'}
                        icon={TrendingUp}
                        color={totalSoldeClients < 0 ? 'text-red-600' : 'text-blue-600'}
                        bg={totalSoldeClients < 0 ? 'bg-red-50' : 'bg-blue-50'}
                    />
                </div>
                {Object.keys(segmentCounts).length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-medium text-gray-700 mb-3">Répartition par segment</p>
                        <div className="flex gap-4 flex-wrap">
                            {Object.entries(segmentCounts).map(([seg, count]) => (
                                <div key={seg} className="flex items-center gap-2">
                                    <Badge className="bg-blue-100 text-blue-800">{seg}</Badge>
                                    <span className="text-lg font-bold text-gray-900">{count}</span>
                                    <span className="text-xs text-gray-400">({clients.length > 0 ? Math.round((count / clients.length) * 100) : 0}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* === PROSPECTS === */}
            <section>
                <SectionTitle icon={UserPlus} title="Prospects & Pipeline" color="text-orange-600" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <StatCard label="Total prospects" value={prospects.length} sub={`${prospectsEleves.length} à fort potential`} icon={UserPlus} color="text-orange-600" bg="bg-orange-50" />
                    <StatCard label="Probabilité moy." value={`${avgProbabilite}%`} icon={TrendingUp} color="text-orange-600" bg="bg-orange-50" />
                    <StatCard label="Forte priorité" value={prospectsEleves.length} sub="ELEVE + STRATEGIQUE" icon={Award} color="text-red-600" bg="bg-red-50" />
                    <StatCard label="Prêts à convertir" value={prospects.filter(p => (p.probability || 0) >= 70).length} sub="Probabilité ≥ 70%" icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
                </div>
                {Object.keys(sourceCounts).length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-medium text-gray-700 mb-3">Sources d'acquisition</p>
                        <div className="flex gap-4 flex-wrap">
                            {Object.entries(sourceCounts).map(([source, count]) => (
                                <div key={source} className="flex items-center gap-2">
                                    <Badge className="bg-orange-100 text-orange-800">{source}</Badge>
                                    <span className="text-lg font-bold text-gray-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pipeline visuel */}
                {prospects.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-5 mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-4">Pipeline de conversion</p>
                        <div className="space-y-2">
                            {[
                                { label: 'STRATEGIQUE', color: 'bg-red-500', data: prospects.filter(p => p.potential === 'STRATEGIQUE') },
                                { label: 'ELEVE', color: 'bg-orange-500', data: prospects.filter(p => p.potential === 'ELEVE') },
                                { label: 'MOYEN', color: 'bg-yellow-500', data: prospects.filter(p => p.potential === 'MOYEN') },
                                { label: 'FAIBLE', color: 'bg-gray-400', data: prospects.filter(p => p.potential === 'FAIBLE') },
                            ].map(({ label, color, data }) => (
                                <div key={label} className="flex items-center gap-3">
                                    <span className="text-xs w-24 text-gray-500">{label}</span>
                                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-6 ${color} rounded-full flex items-center px-2 transition-all`}
                                            style={{ width: `${prospects.length > 0 ? Math.max((data.length / prospects.length) * 100, data.length > 0 ? 5 : 0) : 0}%` }}>
                                            {data.length > 0 && <span className="text-white text-xs font-medium">{data.length}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 w-48 overflow-hidden">
                                        {data.slice(0, 3).map(p => (
                                            <Link key={p.id} href={`/tiers/prospects/${p.id}`} className="text-[10px] text-blue-600 hover:underline truncate">{p.name.split(' ')[0]}</Link>
                                        ))}
                                        {data.length > 3 && <span className="text-[10px] text-gray-400">+{data.length - 3}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* === COMMERCIAUX === */}
            <section>
                <SectionTitle icon={Briefcase} title="Commerciaux & Performance" color="text-green-600" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <StatCard label="Total affaires" value={totalAffaires.length} icon={Activity} color="text-blue-600" bg="bg-blue-50" />
                    <StatCard label="Affaires gagnées" value={affairesGagnees.length} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
                    <StatCard label="Taux de réussite" value={`${tauxConversion}%`} icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50" />
                    <StatCard label="Commission moy." value={`${avgCommission}%`} icon={Award} color="text-purple-600" bg="bg-purple-50" />
                </div>
                {commerciaux.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-medium text-gray-700 mb-3">Classement Commerciaux</p>
                        <div className="space-y-2">
                            {[...commerciaux]
                                .sort((a, b) => (b.affaires?.filter(af => af.status === 'gagnée').length || 0) - (a.affaires?.filter(af => af.status === 'gagnée').length || 0))
                                .map((c, idx) => {
                                    const gained = (c.affaires || []).filter(a => a.status === 'gagnée').length
                                    const total = (c.affaires || []).length
                                    return (
                                        <div key={c.id} className="flex items-center gap-3">
                                            <span className={`text-xs font-bold w-5 ${idx === 0 ? 'text-yellow-600' : idx === 1 ? 'text-gray-500' : 'text-orange-600'}`}>#{idx + 1}</span>
                                            <Link href={`/tiers/commerciaux/${c.id}`} className="text-sm font-medium hover:text-blue-600 flex-1">{c.name}</Link>
                                            <span className="text-xs text-gray-500">{gained}/{total} gagnées</span>
                                            <Badge className="bg-green-100 text-green-800 text-[10px]">{c.commission}%</Badge>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                )}
            </section>

            {/* === ACTIONS === */}
            <section>
                <SectionTitle icon={Clock} title="Actions & Suivi" color="text-red-600" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total actions" value={allActions.length} icon={Activity} color="text-gray-600" bg="bg-gray-50" />
                    <StatCard label="En attente" value={pendingActions.length} icon={Clock} color="text-orange-600" bg="bg-orange-50" />
                    <StatCard label="Terminées" value={doneActions.length} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
                    <StatCard label="En retard !" value={overdueActions.length} sub={overdueActions.length > 0 ? '⚠ À traiter en priorité' : '✓ Aucun retard'} icon={AlertTriangle} color={overdueActions.length > 0 ? 'text-red-600' : 'text-green-600'} bg={overdueActions.length > 0 ? 'bg-red-50' : 'bg-green-50'} />
                </div>
            </section>

            {/* === COMPLETUDE === */}
            <section>
                <SectionTitle icon={Building} title="Complétude des Données" color="text-blue-600" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Avec cpte comptable" value={withComptable.length} sub={`${tiers.length - withComptable.length} manquants`} icon={Building} color="text-blue-600" bg="bg-blue-50" />
                    <StatCard label="Sans cpte comptable" value={tiers.length - withComptable.length} icon={AlertTriangle} color="text-orange-600" bg="bg-orange-50" />
                    <StatCard label="Avec compte bancaire" value={withBancaire.length} sub={`${tiers.length - withBancaire.length} manquants`} icon={CreditCard} color="text-green-600" bg="bg-green-50" />
                    <StatCard label="Sans compte bancaire" value={tiers.length - withBancaire.length} icon={AlertTriangle} color="text-orange-600" bg="bg-orange-50" />
                </div>
                {(tiers.length - withComptable.length > 0 || tiers.length - withBancaire.length > 0) && (
                    <div className="mt-3">
                        <Link href="/tiers/completude" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                            → Aller à la page Complétude Comptable pour assigner les comptes manquants
                        </Link>
                    </div>
                )}
            </section>
        </div>
    )
}
