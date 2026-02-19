"use client"

import { useTiersStore } from "@/lib/tiers/store"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Mail, Phone, MapPin, Globe, Calendar, Building2, CheckCircle2, Clock, TrendingUp, DollarSign } from "lucide-react"
import { TiersCommercial } from "@/types/tiers"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { AssignCompteDialog } from "@/components/tiers/assign-compte-dialog"

const statusConfig = {
    PENDING: { label: 'En attente', color: 'text-orange-600', bg: 'bg-orange-100' },
    DONE: { label: 'Terminé', color: 'text-green-600', bg: 'bg-green-100' },
    CANCELLED: { label: 'Annulé', color: 'text-red-600', bg: 'bg-red-100' },
}

const typeCommercialColors: Record<string, string> = {
    INTERNE: 'bg-green-100 text-green-800',
    EXTERNE: 'bg-blue-100 text-blue-800',
    INDEPENDANT: 'bg-orange-100 text-orange-800',
}

export default function CommercialDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { tiers, openScheduler } = useTiersStore()
    const commercial = tiers.find(t => t.id === params.id && t.type === 'commercial') as TiersCommercial | undefined

    if (!commercial) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-gray-500">Commercial introuvable.</p>
                <Button variant="outline" onClick={() => router.push('/tiers/commerciaux')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux commerciaux
                </Button>
            </div>
        )
    }

    const totalCommissions = (commercial.paiements || []).filter(p => p.statut === 'payé').reduce((s, p) => s + p.montant, 0)
    const totalAffaires = (commercial.affaires || []).reduce((s, a) => s + a.montant, 0)
    const affairesGagnees = (commercial.affaires || []).filter(a => a.status === 'gagnée')

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/tiers/commerciaux')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-14 w-14">
                        <AvatarFallback className="text-xl font-bold bg-green-100 text-green-800">{commercial.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-900">{commercial.name}</h1>
                            <Badge className={commercial.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {commercial.active ? 'Actif' : 'Inactif'}
                            </Badge>
                            {commercial.typeCommercial && <Badge className={typeCommercialColors[commercial.typeCommercial]}>{commercial.typeCommercial}</Badge>}
                        </div>
                        <p className="text-sm text-gray-500">{commercial.matricule} · {commercial.city} · {commercial.zonesCouvertes}</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => openScheduler(commercial.id)}>
                    <Calendar className="mr-2 h-4 w-4" /> Planifier Action
                </Button>
            </div>

            {/* Alerts */}
            <div className="flex flex-wrap gap-2">
                {!commercial.compteComptable && (
                    <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                        <span className="font-medium">⚠ Compte comptable non assigné</span>
                        <AssignCompteDialog tier={commercial} type="comptable" />
                    </div>
                )}
                {(!commercial.comptesBancaires || commercial.comptesBancaires.length === 0) && (
                    <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                        <span className="font-medium">⚠ Aucun compte bancaire (RIB pour commissions)</span>
                        <AssignCompteDialog tier={commercial} type="bancaire" />
                    </div>
                )}
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Commission', value: `${commercial.commission || 0}%`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Affaires traitées', value: (commercial.affaires || []).length, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Affaires gagnées', value: affairesGagnees.length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Commissions payées', value: `${totalCommissions.toLocaleString('fr-FR')} XAF`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map(stat => (
                    <div key={stat.label} className={`rounded-xl border border-gray-100 ${stat.bg} p-4`}>
                        <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
                        <p className="text-lg font-bold text-gray-800">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Infos + Comptes Bancaires */}
                <div className="col-span-1 space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                        <h2 className="font-semibold text-gray-800"><Building2 className="h-4 w-4 inline mr-2 text-green-600" />Informations</h2>
                        <div className="space-y-3 text-sm">
                            {commercial.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4 text-gray-400 shrink-0" /><a href={`mailto:${commercial.email}`} className="hover:underline">{commercial.email}</a></div>}
                            {commercial.phoneNumber && <div className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4 text-gray-400 shrink-0" /><span>{commercial.phoneNumber}</span></div>}
                            {(commercial.address || commercial.city) && <div className="flex items-start gap-2 text-gray-600"><MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" /><span>{[commercial.address, commercial.city].filter(Boolean).join(', ')}</span></div>}
                        </div>
                        <hr />
                        <div className="space-y-2 text-xs text-gray-500">
                            {commercial.compteComptable && <div className="flex justify-between"><span>Compte Comptable</span><span className="font-mono font-bold text-gray-800">{commercial.compteComptable}</span></div>}
                            {commercial.dateDebutContrat && <div className="flex justify-between"><span>Début contrat</span><span>{format(new Date(commercial.dateDebutContrat), 'dd/MM/yyyy')}</span></div>}
                            {commercial.dateFinContrat && <div className="flex justify-between"><span>Fin contrat</span><span>{format(new Date(commercial.dateFinContrat), 'dd/MM/yyyy')}</span></div>}
                            {commercial.zonesCouvertes && <div className="flex justify-between"><span>Zone</span><Badge className="bg-green-100 text-green-800 text-[10px]">{commercial.zonesCouvertes}</Badge></div>}
                        </div>
                    </div>
                    {/* Comptes Bancaires (RIB pour paiement commissions) */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800 text-sm">RIB / Comptes Bancaires</h2>
                            <AssignCompteDialog tier={commercial} type="bancaire" compact />
                        </div>
                        {(!commercial.comptesBancaires || commercial.comptesBancaires.length === 0) ? (
                            <p className="text-xs text-gray-400 text-center py-2">Aucun RIB enregistré</p>
                        ) : commercial.comptesBancaires.map(cb => (
                            <div key={cb.id} className="rounded-lg bg-gray-50 p-3 text-xs space-y-1">
                                <p className="font-medium text-gray-800">{cb.banque}</p>
                                <p className="font-mono text-gray-600">{cb.iban}</p>
                                <p className="text-gray-400">BIC: {cb.bic}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Affaires + Paiements commissions */}
                <div className="col-span-2 space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h2 className="font-semibold text-gray-800 mb-3">Affaires <span className="text-gray-400 font-normal text-sm">({(commercial.affaires || []).length})</span></h2>
                        {(!commercial.affaires || commercial.affaires.length === 0) ? (
                            <p className="text-sm text-gray-400 text-center py-6">Aucune affaire</p>
                        ) : commercial.affaires.map(affaire => (
                            <div key={affaire.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{affaire.titre}</p>
                                    <p className="text-xs text-gray-400">{format(new Date(affaire.date), 'dd MMM yyyy', { locale: fr })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-800">{affaire.montant.toLocaleString('fr-FR')} XAF</p>
                                    <Badge className={affaire.status === 'gagnée' ? 'bg-green-100 text-green-800' : affaire.status === 'en_cours' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}>
                                        {affaire.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h2 className="font-semibold text-gray-800 mb-3">Paiements Commissions <span className="text-gray-400 font-normal text-sm">({(commercial.paiements || []).length})</span></h2>
                        {(!commercial.paiements || commercial.paiements.length === 0) ? (
                            <p className="text-sm text-gray-400 text-center py-4">Aucun paiement</p>
                        ) : commercial.paiements.map(p => (
                            <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{p.reference}</p>
                                    <p className="text-xs text-gray-400">{format(new Date(p.date), 'dd MMM yyyy', { locale: fr })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-800">{p.montant.toLocaleString('fr-FR')} XAF</p>
                                    <Badge className={p.statut === 'payé' ? 'bg-green-100 text-green-800' : p.statut === 'en_attente' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}>{p.statut}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
