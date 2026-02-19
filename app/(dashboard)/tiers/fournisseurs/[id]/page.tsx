"use client"

import { useTiersStore } from "@/lib/tiers/store"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Mail, Phone, MapPin, Globe, Calendar, Building2, CheckCircle2, Clock, Ban, Truck } from "lucide-react"
import { TiersFournisseur } from "@/types/tiers"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { AssignCompteDialog } from "@/components/tiers/assign-compte-dialog"

const statusConfig = {
    PENDING: { label: 'En attente', color: 'text-orange-600', bg: 'bg-orange-100' },
    DONE: { label: 'Terminé', color: 'text-green-600', bg: 'bg-green-100' },
    CANCELLED: { label: 'Annulé', color: 'text-red-600', bg: 'bg-red-100' },
}

export default function FournisseurDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { tiers, openScheduler, updateTier } = useTiersStore()
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
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900">{fournisseur.name}</h1>
                            <Badge className={fournisseur.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {fournisseur.active ? 'Actif' : 'Inactif'}
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-800">Fournisseur</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{fournisseur.code} · {fournisseur.familleFournisseur} · {fournisseur.city}</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => openScheduler(fournisseur.id)}>
                        <Calendar className="mr-2 h-4 w-4" /> Planifier Action
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => updateTier(fournisseur.id, { active: !fournisseur.active })}>
                        {fournisseur.active ? <><Ban className="mr-2 h-4 w-4" />Désactiver</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Activer</>}
                    </Button>
                </div>
            </div>

            {/* Alerts for missing data */}
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
                {/* Infos */}
                <div className="col-span-1 space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
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
                            {fournisseur.modePaiement && <div className="flex justify-between"><span>Mode paiement</span><Badge className="bg-purple-100 text-purple-800 text-[10px]">{fournisseur.modePaiement}</Badge></div>}
                            {fournisseur.delaiLivraison && <div className="flex justify-between"><span>Délai livraison</span><span className="font-medium text-gray-700">{fournisseur.delaiLivraison}</span></div>}
                            {fournisseur.formeJuridique && <div className="flex justify-between"><span>Forme Juridique</span><span className="font-medium text-gray-700">{fournisseur.formeJuridique}</span></div>}
                        </div>
                    </div>

                    {/* Comptes Bancaires */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
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

                {/* Actions */}
                <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">Actions Planifiées ({(fournisseur.actions || []).length})</h2>
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
                                </div>
                                <Badge className={`${config.bg} ${config.color} text-[10px] shrink-0`}>{config.label}</Badge>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
