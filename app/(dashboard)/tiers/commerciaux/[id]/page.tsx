"use client"

import { useState } from "react"
import { useTiersStore } from "@/lib/tiers/store"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    ArrowLeft, Mail, Phone, MapPin, Calendar, Building2,
    CheckCircle2, Clock, TrendingUp, DollarSign, FileText,
    Banknote, AlertCircle, Eye, RefreshCw
} from "lucide-react"
import { TiersCommercial, CommissionFacture } from "@/types/tiers"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { AssignCompteDialog } from "@/components/tiers/assign-compte-dialog"
import { EditTierDialog } from "@/components/tiers/forms/edit-tier-dialog"

const statusConfig = {
    PENDING: { label: 'En attente', color: 'text-orange-600', bg: 'bg-orange-100' },
    DONE: { label: 'Terminé', color: 'text-green-600', bg: 'bg-green-100' },
    CANCELLED: { label: 'Annulé', color: 'text-red-600', bg: 'bg-red-100' },
}

const commStatutConfig = {
    en_attente: { label: 'En attente', color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
    payé: { label: 'Payé', color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
    annulé: { label: 'Annulé', color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' },
}

const typeCommercialColors: Record<string, string> = {
    INTERNE: 'bg-green-100 text-green-800',
    EXTERNE: 'bg-blue-100 text-blue-800',
    INDEPENDANT: 'bg-orange-100 text-orange-800',
}

export default function CommercialDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { tiers, openScheduler, updateTier } = useTiersStore()
    const [activeTab, setActiveTab] = useState<'commissions' | 'affaires' | 'paiements' | 'actions'>('commissions')

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

    const commissionFactures = commercial.commissionFactures || []
    const totalDu = commissionFactures.reduce((s, f) => s + (f.statut !== 'annulé' ? f.montantCommission : 0), 0)
    const totalPaye = commissionFactures.filter(f => f.statut === 'payé').reduce((s, f) => s + f.montantCommission, 0)
    const totalRestant = totalDu - totalPaye
    const affairesGagnees = (commercial.affaires || []).filter(a => a.status === 'gagnée')

    // Update commission facture status
    const updateCommissionStatut = async (cfId: string, newStatut: CommissionFacture['statut']) => {
        const updatedCFs = commissionFactures.map(cf =>
            cf.id === cfId
                ? { ...cf, statut: newStatut, ...(newStatut === 'payé' ? { datePaiement: new Date() } : {}) }
                : cf
        )
        await updateTier(commercial.id, { commissionFactures: updatedCFs } as any)
    }

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
                        <p className="text-sm text-gray-500">{commercial.matricule} · {commercial.city} · Zone : {commercial.zonesCouvertes}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <EditTierDialog tier={commercial} />
                    <Button variant="outline" size="sm" onClick={() => openScheduler(commercial.id)}>
                        <Calendar className="mr-2 h-4 w-4" /> Planifier Action
                    </Button>
                </div>
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
                        <span className="font-medium">⚠ Aucun RIB (requis pour virer les commissions)</span>
                        <AssignCompteDialog tier={commercial} type="bancaire" />
                    </div>
                )}
                {totalRestant > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">{totalRestant.toLocaleString('fr-FR')} XAF de commissions non versées</span>
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Commission', value: `${commercial.commission || 0}%`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Affaires gagnées', value: `${affairesGagnees.length}/${(commercial.affaires || []).length}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Commission totale due', value: `${totalDu.toLocaleString('fr-FR')} XAF`, icon: Banknote, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Total versé', value: `${totalPaye.toLocaleString('fr-FR')} XAF`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Reste à verser', value: `${totalRestant.toLocaleString('fr-FR')} XAF`, icon: Clock, color: totalRestant > 0 ? 'text-red-600' : 'text-gray-400', bg: totalRestant > 0 ? 'bg-red-50' : 'bg-gray-50' },
                ].map(stat => (
                    <div key={stat.label} className={`rounded-xl border border-gray-100 ${stat.bg} p-4`}>
                        <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
                        <p className="text-base font-bold text-gray-800 leading-tight">{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left info column */}
                <div className="col-span-1 space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                        <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-green-600" /> Informations
                        </h2>
                        <div className="space-y-3 text-sm">
                            {commercial.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4 text-gray-400 shrink-0" /><a href={`mailto:${commercial.email}`} className="hover:underline truncate">{commercial.email}</a></div>}
                            {commercial.phoneNumber && <div className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4 text-gray-400 shrink-0" />{commercial.phoneNumber}</div>}
                            {(commercial.address || commercial.city) && <div className="flex items-start gap-2 text-gray-600"><MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />{[commercial.address, commercial.city].filter(Boolean).join(', ')}</div>}
                        </div>
                        <hr className="border-gray-100" />
                        <div className="space-y-1.5 text-xs text-gray-500">
                            {commercial.compteComptable && <div className="flex justify-between"><span>Compte comptable</span><span className="font-mono font-bold text-gray-700">{commercial.compteComptable}</span></div>}
                            {commercial.dateDebutContrat && <div className="flex justify-between"><span>Début contrat</span><span>{format(new Date(commercial.dateDebutContrat), 'dd/MM/yyyy')}</span></div>}
                            {commercial.dateFinContrat && <div className="flex justify-between"><span>Fin contrat</span><span>{format(new Date(commercial.dateFinContrat), 'dd/MM/yyyy')}</span></div>}
                            {commercial.zonesCouvertes && <div className="flex justify-between"><span>Zone</span><Badge className="bg-green-100 text-green-800 text-[10px]">{commercial.zonesCouvertes}</Badge></div>}
                        </div>
                    </div>

                    {/* RIB */}
                    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800 text-sm">RIB / Compte virement</h2>
                            <AssignCompteDialog tier={commercial} type="bancaire" compact />
                        </div>
                        {(!commercial.comptesBancaires || commercial.comptesBancaires.length === 0) ? (
                            <p className="text-xs text-gray-400 text-center py-2">Aucun RIB</p>
                        ) : commercial.comptesBancaires.map(cb => (
                            <div key={cb.id} className="rounded-lg bg-gray-50 p-3 text-xs space-y-1">
                                <p className="font-medium text-gray-800">{cb.banque}</p>
                                <p className="font-mono text-gray-600">{cb.iban}</p>
                                <p className="text-gray-400">BIC: {cb.bic}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Tabs */}
                <div className="col-span-2 space-y-4">
                    {/* Tab bar */}
                    <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
                        {([
                            { key: 'commissions', label: `Commissions (${commissionFactures.length})`, icon: <Banknote className="h-3.5 w-3.5" /> },
                            { key: 'affaires', label: `Affaires (${(commercial.affaires || []).length})`, icon: <TrendingUp className="h-3.5 w-3.5" /> },
                            { key: 'paiements', label: `Paiements (${(commercial.paiements || []).length})`, icon: <DollarSign className="h-3.5 w-3.5" /> },
                            { key: 'actions', label: `Actions (${(commercial.actions || []).length})`, icon: <Clock className="h-3.5 w-3.5" /> },
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${activeTab === tab.key
                                    ? 'border-green-600 text-green-700'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ─── TAB: COMMISSIONS ─── */}
                    {activeTab === 'commissions' && (
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-green-600" /> Factures & Suivi Commission
                                </h2>
                                <div className="flex gap-3 text-xs text-gray-500">
                                    <span className="text-green-700 font-semibold">Payé: {totalPaye.toLocaleString('fr-FR')} XAF</span>
                                    <span>·</span>
                                    <span className="text-red-600 font-semibold">Restant: {totalRestant.toLocaleString('fr-FR')} XAF</span>
                                </div>
                            </div>
                            {commissionFactures.length === 0 ? (
                                <div className="text-center py-12">
                                    <Banknote className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Aucune commission enregistrée</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {['Facture', 'Client', 'Date', 'Montant Fact.', `Taux (${commercial.commission}%)`, 'Commission Due', 'Statut', 'Actions'].map(h => (
                                                    <th key={h} className="px-3 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {commissionFactures.map(cf => {
                                                const sConf = commStatutConfig[cf.statut]
                                                return (
                                                    <tr key={cf.id} className="hover:bg-gray-50">
                                                        <td className="px-3 py-3 font-mono text-gray-700 font-medium whitespace-nowrap">{cf.factureNumero}</td>
                                                        <td className="px-3 py-3 text-gray-700">{cf.clientNom}</td>
                                                        <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{format(new Date(cf.dateFact), 'dd/MM/yyyy')}</td>
                                                        <td className="px-3 py-3 font-medium text-gray-700 whitespace-nowrap">{cf.montantFacture.toLocaleString('fr-FR')} XAF</td>
                                                        <td className="px-3 py-3 text-center">
                                                            <Badge className="bg-green-100 text-green-800">{cf.tauxCommission}%</Badge>
                                                        </td>
                                                        <td className="px-3 py-3 font-bold text-gray-900 whitespace-nowrap">{cf.montantCommission.toLocaleString('fr-FR')} XAF</td>
                                                        <td className="px-3 py-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`h-1.5 w-1.5 rounded-full ${sConf.dot}`} />
                                                                <span className={`font-medium ${sConf.color}`}>{sConf.label}</span>
                                                            </div>
                                                            {cf.datePaiement && (
                                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                                    {format(new Date(cf.datePaiement), 'dd/MM/yyyy')}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <div className="flex flex-col gap-1">
                                                                {cf.statut === 'en_attente' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-6 text-[11px] text-green-700 hover:bg-green-50 px-2 w-full justify-start"
                                                                        onClick={() => updateCommissionStatut(cf.id, 'payé')}
                                                                    >
                                                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Marquer payé
                                                                    </Button>
                                                                )}
                                                                {cf.statut === 'en_attente' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-6 text-[11px] text-red-600 hover:bg-red-50 px-2 w-full justify-start"
                                                                        onClick={() => updateCommissionStatut(cf.id, 'annulé')}
                                                                    >
                                                                        <AlertCircle className="h-3 w-3 mr-1" /> Annuler
                                                                    </Button>
                                                                )}
                                                                {cf.statut === 'payé' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-6 text-[11px] text-orange-600 hover:bg-orange-50 px-2 w-full justify-start"
                                                                        onClick={() => updateCommissionStatut(cf.id, 'en_attente')}
                                                                    >
                                                                        <RefreshCw className="h-3 w-3 mr-1" /> Corriger
                                                                    </Button>
                                                                )}
                                                                {/* Action de suivi */}
                                                                {cf.actionSuivi ? (
                                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                                                        {cf.actionSuivi.statut === 'DONE'
                                                                            ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                                            : <Clock className="h-3 w-3 text-orange-400" />}
                                                                        <span>Suivi planifié</span>
                                                                    </div>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-6 text-[11px] text-blue-600 hover:bg-blue-50 px-2 w-full justify-start"
                                                                        onClick={() => openScheduler(commercial.id)}
                                                                    >
                                                                        <Calendar className="h-3 w-3 mr-1" /> Planifier suivi
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                        <tfoot className="bg-gray-50 border-t border-gray-200">
                                            <tr>
                                                <td colSpan={5} className="px-3 py-3 text-xs font-semibold text-gray-600 text-right">Totaux :</td>
                                                <td className="px-3 py-3 text-sm font-bold text-gray-900">
                                                    {totalDu.toLocaleString('fr-FR')} XAF
                                                </td>
                                                <td colSpan={2} className="px-3 py-3 text-xs text-gray-500">
                                                    <span className="text-green-700 font-semibold">{totalPaye.toLocaleString('fr-FR')} XAF payé</span>
                                                    {' · '}
                                                    <span className={`font-semibold ${totalRestant > 0 ? 'text-red-600' : 'text-gray-400'}`}>{totalRestant.toLocaleString('fr-FR')} XAF restant</span>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── TAB: AFFAIRES ─── */}
                    {activeTab === 'affaires' && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <h2 className="font-semibold text-gray-800 text-sm mb-4">Affaires</h2>
                            {(!commercial.affaires || commercial.affaires.length === 0) ? (
                                <p className="text-sm text-gray-400 text-center py-8">Aucune affaire</p>
                            ) : commercial.affaires.map(affaire => (
                                <div key={affaire.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
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
                    )}

                    {/* ─── TAB: PAIEMENTS ─── */}
                    {activeTab === 'paiements' && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <h2 className="font-semibold text-gray-800 text-sm mb-4">Paiements Commissions</h2>
                            {(!commercial.paiements || commercial.paiements.length === 0) ? (
                                <p className="text-sm text-gray-400 text-center py-8">Aucun paiement</p>
                            ) : commercial.paiements.map(p => (
                                <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{p.reference}</p>
                                        <p className="text-xs text-gray-400">{format(new Date(p.date), 'dd MMM yyyy', { locale: fr })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-800">{p.montant.toLocaleString('fr-FR')} XAF</p>
                                        <Badge className={p.statut === 'payé' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>{p.statut}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ─── TAB: ACTIONS ─── */}
                    {activeTab === 'actions' && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-gray-800 text-sm">Actions Planifiées</h2>
                                <Button size="sm" variant="outline" onClick={() => openScheduler(commercial.id)}>
                                    <Calendar className="h-4 w-4 mr-1" /> Ajouter
                                </Button>
                            </div>
                            {(!commercial.actions || commercial.actions.length === 0) ? (
                                <div className="text-center py-10">
                                    <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Aucune action planifiée</p>
                                    <Button variant="link" size="sm" className="mt-2" onClick={() => openScheduler(commercial.id)}>
                                        Planifier la première action →
                                    </Button>
                                </div>
                            ) : commercial.actions.map(action => {
                                const config = statusConfig[action.status]
                                return (
                                    <div key={action.id} className={`flex items-start gap-3 p-3 rounded-lg border mb-2 ${action.status === 'PENDING' ? 'border-orange-100 bg-orange-50/30' : 'border-gray-100 bg-gray-50/30'}`}>
                                        {action.status === 'PENDING' ? <Clock className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" /> : <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-800">{action.title}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{action.type} · {format(new Date(action.date), 'dd MMM yyyy', { locale: fr })}</p>
                                            {action.content && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{action.content}</p>}
                                        </div>
                                        <Badge className={`${config.bg} ${config.color} text-[10px] shrink-0`}>{config.label}</Badge>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
