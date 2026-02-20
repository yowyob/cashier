"use client"

import { useTiersStore } from "@/lib/tiers/store"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Building2, CheckCircle2, Clock, ArrowRightLeft, Star } from "lucide-react"
import { TiersProspect, TiersClient } from "@/types/tiers"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Progress } from "@/components/ui/progress"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

const potentielColors: Record<string, string> = {
    FAIBLE: 'bg-gray-100 text-gray-800',
    MOYEN: 'bg-yellow-100 text-yellow-800',
    ELEVE: 'bg-orange-100 text-orange-800',
    STRATEGIQUE: 'bg-red-100 text-red-800',
}

const statusConfig = {
    PENDING: { label: 'En attente', color: 'text-orange-600', bg: 'bg-orange-100' },
    DONE: { label: 'Terminé', color: 'text-green-600', bg: 'bg-green-100' },
    CANCELLED: { label: 'Annulé', color: 'text-red-600', bg: 'bg-red-100' },
}

function ConvertToClientDialog({ prospect, onConvert }: { prospect: TiersProspect; onConvert: () => void }) {
    const [open, setOpen] = useState(false)
    const { addTier, deleteTier } = useTiersStore()

    const handleConvert = async () => {
        const newClient: TiersClient = {
            ...prospect,
            type: 'client',
            id: crypto.randomUUID(),
            accountingAccount: undefined,
            segment: 'ENTREPRISE',
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
        await addTier(newClient)
        await deleteTier(prospect.id)
        setOpen(false)
        onConvert()
    }

    return (
        <>
            <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                size="sm"
                onClick={() => setOpen(true)}
            >
                <ArrowRightLeft className="h-4 w-4" />
                Convertir en Client
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Convertir en Client ?</DialogTitle>
                        <DialogDescription>
                            Le prospect <strong>{prospect.name}</strong> sera converti en client. Ses informations, actions planifiées et historique seront conservés. Le prospect sera supprimé de la liste des prospects.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 mt-2">
                        <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="bg-orange-100 text-orange-800">{prospect.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-gray-900">{prospect.name}</p>
                            <p className="text-xs text-gray-500">{prospect.email} · {prospect.city}</p>
                        </div>
                        <ArrowRightLeft className="h-5 w-5 text-emerald-600 mx-2" />
                        <div className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-800">CLIENT</div>
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConvert}>Confirmer la conversion</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default function ProspectDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { tiers, openScheduler } = useTiersStore()
    const prospect = tiers.find(t => t.id === params.id && t.type === 'prospect') as TiersProspect | undefined

    if (!prospect) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-gray-500">Prospect introuvable ou déjà converti en client.</p>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push('/tiers/prospects')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux prospects
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/tiers/clients')}>
                        Voir les clients
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/tiers/prospects')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-14 w-14">
                        <AvatarFallback className="text-xl font-bold bg-orange-100 text-orange-800">{prospect.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-900">{prospect.name}</h1>
                            <Badge className="bg-orange-100 text-orange-800">Prospect</Badge>
                            {prospect.potential && <Badge className={potentielColors[prospect.potential]}>{prospect.potential}</Badge>}
                        </div>
                        <p className="text-sm text-gray-500">{prospect.code} · {prospect.contact} · {prospect.city}</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => openScheduler(prospect.id)}>
                        <Calendar className="mr-2 h-4 w-4" /> Planifier Action
                    </Button>
                    <ConvertToClientDialog
                        prospect={prospect}
                        onConvert={() => router.push('/tiers/clients')}
                    />
                </div>
            </div>

            {/* Probabilité de conversion */}
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-orange-800">Probabilité de conversion</span>
                    </div>
                    <span className="text-2xl font-bold text-orange-700">{prospect.probability || 0}%</span>
                </div>
                <Progress value={prospect.probability || 0} className="h-3" />
                <div className="flex justify-between text-xs text-orange-600 mt-1">
                    <span>0% Faible</span>
                    <span>50% Moyen</span>
                    <span>100% Certain</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Infos */}
                <div className="col-span-1 rounded-xl border border-gray-200 bg-white p-5 space-y-4 h-fit">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-orange-600" /> Informations
                    </h2>
                    <div className="space-y-3 text-sm">
                        {prospect.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4 text-gray-400 shrink-0" /><a href={`mailto:${prospect.email}`} className="hover:underline">{prospect.email}</a></div>}
                        {prospect.phoneNumber && <div className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4 text-gray-400 shrink-0" /><span>{prospect.phoneNumber}</span></div>}
                        {(prospect.address || prospect.city) && <div className="flex items-start gap-2 text-gray-600"><MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" /><span>{[prospect.address, prospect.city, prospect.pays].filter(Boolean).join(', ')}</span></div>}
                    </div>
                    <hr className="border-gray-100" />
                    <div className="space-y-2 text-xs text-gray-500">
                        {prospect.source && <div className="flex justify-between"><span>Source</span><Badge className="bg-orange-100 text-orange-800 text-[10px]">{prospect.source}</Badge></div>}
                        {prospect.familleProspect && <div className="flex justify-between"><span>Famille</span><span className="font-medium text-gray-700">{prospect.familleProspect}</span></div>}
                        {prospect.conversionDate && <div className="flex justify-between"><span>Date visée</span><span>{format(new Date(prospect.conversionDate), 'dd/MM/yyyy')}</span></div>}
                    </div>
                    {prospect.notes && (
                        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
                            <p className="font-medium mb-1">Notes</p>
                            <p>{prospect.notes}</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">Actions Planifiées ({(prospect.actions || []).length})</h2>
                        <Button size="sm" variant="outline" onClick={() => openScheduler(prospect.id)}>
                            <Calendar className="h-4 w-4 mr-1" /> Ajouter
                        </Button>
                    </div>
                    {(!prospect.actions || prospect.actions.length === 0) ? (
                        <div className="text-center py-10">
                            <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-sm text-gray-400">Aucune action planifiée pour ce prospect</p>
                            <Button variant="outline" size="sm" className="mt-3" onClick={() => openScheduler(prospect.id)}>Planifier une action de relance</Button>
                        </div>
                    ) : prospect.actions.map(action => {
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
            </div>
        </div>
    )
}
