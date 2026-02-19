"use client"

import { useTiersStore } from "@/lib/tiers/store"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Mail, Phone, MapPin, Globe, Calendar, Building2, CheckCircle2, Clock, Ban, CreditCard } from "lucide-react"
import { TiersClient } from "@/types/tiers"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import Link from "next/link"
import { AssignCompteDialog } from "@/components/tiers/assign-compte-dialog"

const statusConfig = {
    PENDING: { label: 'En attente', color: 'text-orange-600', bg: 'bg-orange-100' },
    DONE: { label: 'Terminé', color: 'text-green-600', bg: 'bg-green-100' },
    CANCELLED: { label: 'Annulé', color: 'text-red-600', bg: 'bg-red-100' },
}

export default function ClientDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { tiers, openScheduler, updateTier } = useTiersStore()

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
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                            <Badge className={client.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {client.active ? 'Actif' : 'Inactif'}
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{client.code} · {client.familleClient} · {client.city}</p>
                    </div>
                </div>
                <div className="flex gap-2">
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
                {!client.compteComptable && (
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
                {/* Contact & Address */}
                <div className="col-span-1 rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
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
                        {client.compteComptable && (
                            <div className="flex justify-between">
                                <span className="text-xs text-gray-500">Compte Comptable</span>
                                <span className="font-mono font-bold text-green-700">{client.compteComptable}</span>
                            </div>
                        )}
                        {client.segment && <div className="flex justify-between"><span>Segment</span><Badge className="bg-blue-100 text-blue-800 text-[10px]">{client.segment}</Badge></div>}
                        {client.formeJuridique && <div className="flex justify-between"><span>Forme Juridique</span><span className="font-medium text-gray-700">{client.formeJuridique}</span></div>}
                        {client.plafondCredit && <div className="flex justify-between"><span>Plafond Crédit</span><span className="font-medium text-gray-700">{client.plafondCredit.toLocaleString('fr-FR')} XAF</span></div>}
                        {client.financial?.solde !== undefined && <div className="flex justify-between"><span>Solde</span><span className={`font-medium ${client.financial.solde < 0 ? 'text-red-600' : 'text-gray-700'}`}>{client.financial.solde.toLocaleString('fr-FR')} XAF</span></div>}
                        <div className="flex justify-between"><span>TVA</span><span className="font-medium text-gray-700">{client.estAssujettiTVA ? 'Assujetti' : 'Non assujetti'}</span></div>
                    </div>
                </div>

                {/* Right Panel: Actions */}
                <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">Actions Planifiées ({(client.actions || []).length})</h2>
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
            </div>

            {/* Balance Status */}
            {client.balanceStatusData && client.balanceStatusData.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800">Relevé de Compte</h2>
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
