"use client"

import { useState } from "react"
import { useTiersStore } from "@/lib/tiers/store"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    ArrowLeft, Mail, Phone, MapPin, Globe, Calendar, Building2,
    CheckCircle2, Clock, Ban, Truck, FileText, Package, ShoppingCart,
    CreditCard, Tag
} from "lucide-react"
import { TiersFournisseur, LABEL_MODE_PAIEMENT, LABEL_CATEGORIE_TRANSACTION } from "@/types/tiers"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { AssignCompteDialog } from "@/components/tiers/assign-compte-dialog"
import { EditTierDialog } from "@/components/tiers/forms/edit-tier-dialog"

const statusConfig = {
    PENDING: { label: 'En attente', color: 'text-orange-600', bg: 'bg-orange-100' },
    DONE: { label: 'Terminé', color: 'text-green-600', bg: 'bg-green-100' },
    CANCELLED: { label: 'Annulé', color: 'text-red-600', bg: 'bg-red-100' },
}

const factureStatutConfig: Record<string, { label: string; color: string; bg: string }> = {
    'brouillon': { label: 'Brouillon', color: 'text-gray-600', bg: 'bg-gray-100' },
    'envoée': { label: 'Envoyée', color: 'text-blue-600', bg: 'bg-blue-100' },
    'payée': { label: 'Payée', color: 'text-green-700', bg: 'bg-green-100' },
    'en retard': { label: 'En retard', color: 'text-red-700', bg: 'bg-red-100' },
    'annulée': { label: 'Annulée', color: 'text-gray-500', bg: 'bg-gray-100' },
}

export default function FournisseurDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { tiers, openScheduler, updateTier } = useTiersStore()
    const [activeTab, setActiveTab] = useState<'actions' | 'factures' | 'produits'>('actions')

    const fournisseur = tiers.find(t => t.id === params.id && t.type === 'fournisseur') as TiersFournisseur | undefined

    if (!fournisseur) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-gray-500">Fournisseur introuvable.</p>
                <Button variant="outline" onClick={() => router.push('/tiers/fournisseurs')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux fournisseurs
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/tiers/fournisseurs')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-14 w-14">
                        <AvatarFallback className="text-xl font-bold bg-purple-100 text-purple-800">{fournisseur.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-900">{fournisseur.name}</h1>
                            <Badge className={fournisseur.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {fournisseur.active ? 'Actif' : 'Inactif'}
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-800">Fournisseur</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{fournisseur.codeFournisseur || fournisseur.code} · {fournisseur.familleFournisseur} · {fournisseur.city}</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <EditTierDialog tier={fournisseur} />
                    <Button variant="outline" size="sm" onClick={() => openScheduler(fournisseur.id)}>
                        <Calendar className="mr-2 h-4 w-4" /> Planifier Action
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => updateTier(fournisseur.id, { active: !fournisseur.active })}>
                        {fournisseur.active ? <><Ban className="mr-2 h-4 w-4" />Désactiver</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Activer</>}
                    </Button>
                </div>
            </div>

            {/* Alerts */}
            <div className="flex flex-wrap gap-2">
                {!fournisseur.compteComptable && (
                    <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                        <span className="font-medium">⚠ Compte comptable non assigné</span>
                        <AssignCompteDialog tier={fournisseur} type="comptable" />
                    </div>
                )}
                {(!fournisseur.comptesBancaires || fournisseur.comptesBancaires.length === 0) && (
                    <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                        <span className="font-medium">⚠ Aucun compte bancaire</span>
                        <AssignCompteDialog tier={fournisseur} type="bancaire" />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Info + Banques */}
                <div className="col-span-1 space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-purple-600" /> Informations
                        </h2>
                        <div className="space-y-3 text-sm">
                            {fournisseur.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4 text-gray-400 shrink-0" /><a href={`mailto:${fournisseur.email}`} className="hover:underline">{fournisseur.email}</a></div>}
                            {fournisseur.phoneNumber && <div className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4 text-gray-400 shrink-0" /><span>{fournisseur.phoneNumber}</span></div>}
                            {fournisseur.website && <div className="flex items-center gap-2 text-gray-600"><Globe className="h-4 w-4 text-gray-400 shrink-0" /><a href={fournisseur.website} target="_blank" className="hover:underline truncate">{fournisseur.website}</a></div>}
                            {(fournisseur.address || fournisseur.city) && <div className="flex items-start gap-2 text-gray-600"><MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" /><span>{[fournisseur.address, fournisseur.city, fournisseur.pays].filter(Boolean).join(', ')}</span></div>}
                        </div>
                        <hr className="border-gray-100" />
                        <div className="space-y-2 text-xs text-gray-500">
                            {fournisseur.compteComptable && <div className="flex justify-between"><span>Compte Comptable</span><span className="font-mono font-bold text-gray-800">{fournisseur.compteComptable}</span></div>}
                            {fournisseur.formeJuridique && <div className="flex justify-between"><span>Forme Juridique</span><span className="font-medium text-gray-700">{fournisseur.formeJuridique}</span></div>}
                            {fournisseur.registreCommerce && <div className="flex justify-between"><span>RC</span><span className="font-medium text-gray-700">{fournisseur.registreCommerce}</span></div>}
                            {fournisseur.numeroFiscal && <div className="flex justify-between"><span>N° Fiscal</span><span className="font-medium text-gray-700">{fournisseur.numeroFiscal}</span></div>}
                            {fournisseur.delaiLivraison && <div className="flex justify-between"><span>Délai livraison</span><span className="font-medium text-gray-700">{fournisseur.delaiLivraison}</span></div>}
                            {fournisseur.conditionsPaiement && <div className="flex justify-between"><span>Conditions paiement</span><span className="font-medium text-gray-700 text-right">{fournisseur.conditionsPaiement}</span></div>}
                            {fournisseur.certification && <div className="flex justify-between"><span>Certification</span><span className="font-medium text-gray-700">{fournisseur.certification}</span></div>}
                        </div>
                    </div>

                    {/* Payment Methods */}
                    {fournisseur.modesPaiementFournisseur && fournisseur.modesPaiementFournisseur.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                                <CreditCard className="h-4 w-4 text-purple-600" /> Moyens de Règlement
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {fournisseur.modesPaiementFournisseur.map(m => (
                                    <Badge key={m} className="bg-purple-50 text-purple-700 border border-purple-200 text-xs">
                                        {LABEL_MODE_PAIEMENT[m]}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Purchase Categories */}
                    {fournisseur.categoriesAchat && fournisseur.categoriesAchat.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                                <Tag className="h-4 w-4 text-indigo-600" /> Catégories d'Achat
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {fournisseur.categoriesAchat.map(c => (
                                    <Badge key={c} className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs">
                                        {LABEL_CATEGORIE_TRANSACTION[c]}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Comptes Bancaires */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                                <Truck className="h-4 w-4 text-purple-600" /> Comptes Bancaires
                            </h2>
                            <AssignCompteDialog tier={fournisseur} type="bancaire" compact />
                        </div>
                        {(!fournisseur.comptesBancaires || fournisseur.comptesBancaires.length === 0) ? (
                            <p className="text-xs text-gray-400 text-center py-3">Aucun compte bancaire</p>
                        ) : fournisseur.comptesBancaires.map(cb => (
                            <div key={cb.id} className="rounded-lg bg-gray-50 p-3 text-xs space-y-1">
                                <p className="font-medium text-gray-800">{cb.banque}</p>
                                <p className="font-mono text-gray-600">{cb.iban}</p>
                                <p className="text-gray-400">BIC: {cb.bic}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Tabbed Panel */}
                <div className="col-span-2 space-y-4">
                    {/* Tab bar */}
                    <div className="flex gap-1 border-b border-gray-200">
                        {([
                            { key: 'actions', label: `Actions (${(fournisseur.actions || []).length})`, icon: <Clock className="h-3.5 w-3.5" /> },
                            { key: 'factures', label: `Factures (${(fournisseur.factures || []).length})`, icon: <FileText className="h-3.5 w-3.5" /> },
                            { key: 'produits', label: `Produits`, icon: <Package className="h-3.5 w-3.5" /> },
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.key
                                    ? 'border-purple-600 text-purple-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Actions tab */}
                    {activeTab === 'actions' && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-gray-800 text-sm">Actions Planifiées</h2>
                                <Button size="sm" variant="outline" onClick={() => openScheduler(fournisseur.id)}>
                                    <Calendar className="h-4 w-4 mr-1" /> Ajouter
                                </Button>
                            </div>
                            {(!fournisseur.actions || fournisseur.actions.length === 0) ? (
                                <div className="text-center py-10">
                                    <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Aucune action planifiée</p>
                                </div>
                            ) : fournisseur.actions.map(action => {
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

                    {/* Factures tab */}
                    {activeTab === 'factures' && (
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-purple-600" /> Factures Fournisseur
                                </h2>
                                <Button size="sm" variant="outline" onClick={() => openScheduler(fournisseur.id)}>
                                    <Calendar className="h-4 w-4 mr-1" /> Planifier Suivi
                                </Button>
                            </div>
                            {(!fournisseur.factures || fournisseur.factures.length === 0) ? (
                                <div className="text-center py-10">
                                    <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Aucune facture enregistrée</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {['N° Facture', 'Date', 'Montant TTC', 'Échéance', 'Statut', 'Suivi'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {fournisseur.factures.map(facture => {
                                                const sConf = factureStatutConfig[facture.statut] || factureStatutConfig['brouillon']
                                                return (
                                                    <tr key={facture.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-mono text-gray-700 font-medium">{facture.numero}</td>
                                                        <td className="px-4 py-3 text-gray-600">{format(new Date(facture.date), 'dd/MM/yyyy')}</td>
                                                        <td className="px-4 py-3 font-semibold text-gray-800">{facture.montantTTC.toLocaleString('fr-FR')} XAF</td>
                                                        <td className="px-4 py-3 text-gray-600">
                                                            {facture.echeance ? (
                                                                <span className={new Date(facture.echeance) < new Date() && facture.statut !== 'payée' ? 'text-red-600 font-medium' : ''}>
                                                                    {format(new Date(facture.echeance), 'dd/MM/yyyy')}
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Badge className={`${sConf.bg} ${sConf.color} text-[10px]`}>{sConf.label}</Badge>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {facture.actionSuivi ? (
                                                                <div className="flex items-center gap-1">
                                                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                                    <span className="text-gray-500">Planifié</span>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-6 text-[11px] text-purple-600 hover:text-purple-700 px-2"
                                                                    onClick={() => openScheduler(fournisseur.id)}
                                                                >
                                                                    <Calendar className="h-3 w-3 mr-1" /> Planifier
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Produits tab */}
                    {activeTab === 'produits' && (
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                    <Package className="h-4 w-4 text-purple-600" /> Historique des Achats
                                </h2>
                            </div>
                            {(!fournisseur.produitsHistorique || fournisseur.produitsHistorique.length === 0) ? (
                                <div className="text-center py-10">
                                    <Package className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Aucun produit enregistré</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {fournisseur.produitsHistorique.map(ph => (
                                        <div key={ph.id} className="px-5 py-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-medium text-gray-500">
                                                    {format(new Date(ph.date), 'dd MMM yyyy', { locale: fr })}
                                                    {ph.factureNumero && <span className="ml-2 font-mono text-gray-400">· {ph.factureNumero}</span>}
                                                </span>
                                                <span className="text-sm font-bold text-gray-800">{ph.montantTotal.toLocaleString('fr-FR')} XAF</span>
                                            </div>
                                            <div className="space-y-1">
                                                {ph.produits.map(p => (
                                                    <div key={p.id} className="flex items-center justify-between text-xs text-gray-600 py-1 border-b border-gray-50 last:border-0">
                                                        <div className="flex items-center gap-2">
                                                            <ShoppingCart className="h-3 w-3 text-gray-300 shrink-0" />
                                                            <span className="font-medium text-gray-700">{p.designation}</span>
                                                            <span className="text-gray-400 font-mono">{p.reference}</span>
                                                            {p.remise && <Badge className="bg-orange-50 text-orange-600 text-[9px]">-{p.remise}%</Badge>}
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <span className="text-gray-500">{p.quantite} {p.unite || 'pcs'}</span>
                                                            <span className="font-medium">{p.total.toLocaleString('fr-FR')} XAF</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
