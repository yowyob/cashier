"use client"

import { useState } from "react"
import { useTiersStore } from "@/lib/tiers/store"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    ArrowLeft, Mail, Phone, MapPin, Globe, Calendar, Building2,
    CheckCircle2, Clock, Ban, CreditCard, Package, FileText,
    ShoppingCart, AlertCircle, Banknote, Tag, Truck, FileSpreadsheet
} from "lucide-react"
import { TiersClient, LABEL_MODE_PAIEMENT, LABEL_CATEGORIE_TRANSACTION, BonLivraison, Devis, PaiementTiers } from "@/types/tiers"
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

function SectionCard({ title, icon, children, actions }: { title: string; icon: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                    {icon} {title}
                </h2>
                {actions}
            </div>
            <div className="p-5">{children}</div>
        </div>
    )
}

export default function ClientDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { tiers, openScheduler, updateTier } = useTiersStore()
    const [activeActionsTab, setActiveActionsTab] = useState<'actions' | 'factures' | 'produits' | 'bons_livraison' | 'devis' | 'paiements'>('actions')

    const client = tiers.find(t => t.id === params.id && t.type === 'client') as TiersClient | undefined

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-gray-500">Client introuvable.</p>
                <Button variant="outline" onClick={() => router.push('/tiers/clients')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux clients
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/tiers/clients')} className="shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-14 w-14">
                        <AvatarFallback className="text-xl font-bold bg-blue-100 text-blue-800">{client.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                            <Badge className={client.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {client.active ? 'Actif' : 'Inactif'}
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{client.code} · {client.familleClient} · {client.city}</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <EditTierDialog tier={client} />
                    <Button variant="outline" size="sm" onClick={() => openScheduler(client.id)}>
                        <Calendar className="mr-2 h-4 w-4" /> Planifier Action
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => updateTier(client.id, { active: !client.active })}>
                        {client.active ? <><Ban className="mr-2 h-4 w-4" />Désactiver</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Activer</>}
                    </Button>
                </div>
            </div>

            {/* Alerts for missing data */}
            <div className="flex flex-wrap gap-2">
                {!client.accountingAccount && (
                    <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                        <span className="font-medium">⚠ Compte comptable non assigné</span>
                        <AssignCompteDialog tier={client} type="comptable" />
                    </div>
                )}
                {(!client.comptesBancaires || client.comptesBancaires.length === 0) && (
                    <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                        <span className="font-medium">⚠ Aucun compte bancaire</span>
                        <AssignCompteDialog tier={client} type="bancaire" />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Info Card */}
                <div className="col-span-1 space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-blue-600" /> Informations
                        </h2>
                        <div className="space-y-3 text-sm">
                            {client.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4 text-gray-400 shrink-0" /><a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a></div>}
                            {client.phoneNumber && <div className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4 text-gray-400 shrink-0" /><span>{client.phoneNumber}</span></div>}
                            {client.website && <div className="flex items-center gap-2 text-gray-600"><Globe className="h-4 w-4 text-gray-400 shrink-0" /><a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{client.website}</a></div>}
                            {(client.address || client.city) && <div className="flex items-start gap-2 text-gray-600"><MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" /><span>{[client.address, client.city, client.pays].filter(Boolean).join(', ')}</span></div>}
                        </div>
                        <hr className="border-gray-100" />
                        <div className="space-y-2 text-xs text-gray-500">
                            {client.accountingAccount && (
                                <div className="flex justify-between">
                                    <span>Compte Comptable</span>
                                    <span className="font-mono font-bold text-green-700">{client.accountingAccount}</span>
                                </div>
                            )}
                            {client.segment && <div className="flex justify-between"><span>Segment</span><Badge className="bg-blue-100 text-blue-800 text-[10px]">{client.segment}</Badge></div>}
                            {client.formeJuridique && <div className="flex justify-between"><span>Forme Juridique</span><span className="font-medium text-gray-700">{client.formeJuridique}</span></div>}
                            {client.tradeRegistryNumber && <div className="flex justify-between"><span>RC</span><span className="font-medium text-gray-700 text-right">{client.tradeRegistryNumber}</span></div>}
                            {client.taxNumber && <div className="flex justify-between"><span>N° Fiscal</span><span className="font-medium text-gray-700">{client.taxNumber}</span></div>}
                            {client.creditLimit !== undefined && <div className="flex justify-between"><span>Plafond Crédit</span><span className="font-medium text-gray-700">{client.creditLimit.toLocaleString('fr-FR')} XAF</span></div>}
                            {client.financial?.solde !== undefined && <div className="flex justify-between"><span>Solde</span><span className={`font-medium ${client.financial.solde < 0 ? 'text-red-600' : 'text-gray-700'}`}>{client.financial.solde.toLocaleString('fr-FR')} XAF</span></div>}
                            <div className="flex justify-between"><span>TVA</span><span className="font-medium text-gray-700">{client.vatSubject ? 'Assujetti' : 'Non assujetti'}</span></div>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    {client.modesPaiementClient && client.modesPaiementClient.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                                <CreditCard className="h-4 w-4 text-blue-600" /> Moyens de Règlement
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {client.modesPaiementClient.map(m => (
                                    <Badge key={m} className="bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                                        {LABEL_MODE_PAIEMENT[m]}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pricing Categories */}
                    {client.categoriesVente && client.categoriesVente.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                                <Tag className="h-4 w-4 text-indigo-600" /> Catégories de Vente
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {client.categoriesVente.map(c => (
                                    <Badge key={c} className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs">
                                        {LABEL_CATEGORIE_TRANSACTION[c]}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Tabs – Actions / Factures / Produits */}
                <div className="col-span-2 space-y-4">
                    {/* Tab bar */}
                    <div className="flex gap-1 border-b border-gray-200">
                        {([
                            { key: 'actions', label: `Actions (${(client.actions || []).length})`, icon: <Clock className="h-3.5 w-3.5" /> },
                            { key: 'devis', label: `Devis (${(client.devis || []).length})`, icon: <FileSpreadsheet className="h-3.5 w-3.5" /> },
                            { key: 'bons_livraison', label: `Bons Livr. (${(client.bonsLivraison || []).length})`, icon: <Truck className="h-3.5 w-3.5" /> },
                            { key: 'factures', label: `Factures (${(client.factures || []).length})`, icon: <FileText className="h-3.5 w-3.5" /> },
                            { key: 'paiements', label: `Paiements (${(client.paiements || []).length})`, icon: <Banknote className="h-3.5 w-3.5" /> },
                            { key: 'produits', label: `Produits`, icon: <ShoppingCart className="h-3.5 w-3.5" /> },
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveActionsTab(tab.key)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeActionsTab === tab.key
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Actions tab */}
                    {activeActionsTab === 'actions' && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-gray-800 text-sm">Actions Planifiées</h2>
                                <Button size="sm" variant="outline" onClick={() => openScheduler(client.id)}>
                                    <Calendar className="h-4 w-4 mr-1" /> Ajouter
                                </Button>
                            </div>
                            {(!client.actions || client.actions.length === 0) ? (
                                <div className="text-center py-10">
                                    <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Aucune action planifiée</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {client.actions.map(action => {
                                        const config = statusConfig[action.status]
                                        return (
                                            <div key={action.id} className={`flex items-start gap-3 p-3 rounded-lg border ${action.status === 'PENDING' ? 'border-orange-100 bg-orange-50/30' : 'border-gray-100 bg-gray-50/30'}`}>
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
                    )}

                    {/* Factures tab */}
                    {activeActionsTab === 'factures' && (
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-600" /> Factures
                                </h2>
                                <Button size="sm" variant="outline" onClick={() => openScheduler(client.id)}>
                                    <Calendar className="h-4 w-4 mr-1" /> Planifier Suivi
                                </Button>
                            </div>
                            {(!client.factures || client.factures.length === 0) ? (
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
                                            {client.factures.map(facture => {
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
                                                                    className="h-6 text-[11px] text-blue-600 hover:text-blue-700 px-2"
                                                                    onClick={() => openScheduler(client.id)}
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

                    {/* Devis tab */}
                    {activeActionsTab === 'devis' && (
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4 text-blue-600" /> Devis
                                </h2>
                            </div>
                            {(!client.devis || client.devis.length === 0) ? (
                                <div className="text-center py-10">
                                    <FileSpreadsheet className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Aucun devis enregistré</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {['N° Devis', 'Date Création', 'Validité', 'Statut', 'Montant TTC'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {client.devis.map(d => (
                                                <tr key={d.idDevis} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-mono text-gray-700 font-medium">{d.numeroDevis}</td>
                                                    <td className="px-4 py-3 text-gray-600">{format(new Date(d.dateCreation), 'dd/MM/yyyy')}</td>
                                                    <td className="px-4 py-3 text-gray-600">{format(new Date(d.dateValidite), 'dd/MM/yyyy')}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge className="bg-gray-100 text-gray-700 text-[10px]">{d.statut}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-gray-800">{d.montantTTC.toLocaleString('fr-FR')} {d.devise}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bons de Livraison Tab */}
                    {activeActionsTab === 'bons_livraison' && (
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-blue-600" /> Bons de Livraison
                                </h2>
                            </div>
                            {(!client.bonsLivraison || client.bonsLivraison.length === 0) ? (
                                <div className="text-center py-10">
                                    <Truck className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Aucun bon de livraison enregistré</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {['N° Bon Livr.', 'Date', 'Destinataire', 'Transporteur', 'Statut', 'Montant Total'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {client.bonsLivraison.map((bl: BonLivraison) => (
                                                <tr key={bl.idBonLivraison} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-mono text-gray-700 font-medium">{bl.numeroBonLivraison}</td>
                                                    <td className="px-4 py-3 text-gray-600">{format(new Date(bl.dateLivraison), 'dd/MM/yyyy')}</td>
                                                    <td className="px-4 py-3 text-gray-600">{bl.nomDestinataire}</td>
                                                    <td className="px-4 py-3 text-gray-600">{bl.transporteur || '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">{bl.statut}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-gray-800">{bl.totalAmount.toLocaleString('fr-FR')} {client.financial?.devise || 'XAF'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Paiements Tab */}
                    {activeActionsTab === 'paiements' && (
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                    <Banknote className="h-4 w-4 text-green-600" /> Paiements Réalisés
                                </h2>
                            </div>
                            {(!client.paiements || client.paiements.length === 0) ? (
                                <div className="text-center py-10">
                                    <Banknote className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Aucun paiement enregistré</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {['Date', 'Mode', 'Journal', 'Réf Facture', 'Mémo', 'Montant'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {client.paiements.map((p: PaiementTiers) => (
                                                <tr key={p.idPaiement} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-gray-600 font-medium">{format(new Date(p.date), 'dd/MM/yyyy')}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className="text-[10px] bg-white">{p.modePaiement}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">{p.journal}</td>
                                                    <td className="px-4 py-3 font-mono text-gray-500">{p.idFacture || '-'}</td>
                                                    <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate" title={p.memo}>{p.memo || '-'}</td>
                                                    <td className="px-4 py-3 font-semibold text-green-700">+{p.montant.toLocaleString('fr-FR')} XAF</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Produits tab */}
                    {activeActionsTab === 'produits' && (
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                    <Package className="h-4 w-4 text-blue-600" /> Historique des Produits
                                </h2>
                            </div>
                            {(!client.produitsHistorique || client.produitsHistorique.length === 0) ? (
                                <div className="text-center py-10">
                                    <Package className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Aucun produit enregistré</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {client.produitsHistorique.map(ph => (
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

            {/* Balance Status (existing) */}
            {client.balanceStatusData && client.balanceStatusData.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800 text-sm">Relevé de Compte</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                                <tr>{['Magasin', 'État', 'Numéro BL', 'Livré le', 'Règlement', 'Montant TTC'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {client.balanceStatusData.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-700">{row.magasin}</td>
                                        <td className="px-4 py-3"><Badge className="bg-green-100 text-green-800 text-[10px]">{row.etat}</Badge></td>
                                        <td className="px-4 py-3 font-mono text-gray-600">{row.blNo}</td>
                                        <td className="px-4 py-3 text-gray-600">{row.livreLe}</td>
                                        <td className="px-4 py-3 text-gray-600">{row.reglement}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800">{row.montantTTC.toLocaleString('fr-FR')} XAF</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
