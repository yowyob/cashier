"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TiersDraggableDialog } from "@/components/tiers/ui/draggable-dialog"
import { TiersClient, TiersProspect } from "@/types/tiers"
import { useTiersStore } from "@/lib/tiers/store"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingDown, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

const schema = z.object({
    motif: z.string().min(5, "Le motif est requis (5 car. min)"),
    potential: z.enum(['FAIBLE', 'MOYEN', 'ELEVE', 'STRATEGIQUE']),
    probability: z.number().min(0).max(100),
})

type FormValues = z.infer<typeof schema>

interface Props {
    client: TiersClient
}

export function DowngradeToProspectDialog({ client }: Props) {
    const [open, setOpen] = useState(false)
    const { addTier, updateTier } = useTiersStore()
    const router = useRouter()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            motif: "",
            potential: "FAIBLE",
            probability: 20,
        },
    })

    const onSubmit = async (values: FormValues) => {
        try {
            // 1. Create the new prospect from the client's data
            const newProspect: TiersProspect = {
                id: crypto.randomUUID(),
                type: "prospect",
                name: client.name,
                code: `PRO-${client.code}`,
                shortName: client.shortName,
                email: client.email,
                phoneNumber: client.phoneNumber,
                address: client.address,
                city: client.city,
                postalCode: client.postalCode,
                pays: client.pays,
                website: client.website,
                complement: client.complement,
                tradeRegistryNumber: client.tradeRegistryNumber,
                taxNumber: client.taxNumber,
                nui: client.nui,
                description: client.description,
                active: true,
                potential: values.potential,
                probability: values.probability,
                source: "RECOMMANDATION",
                notes: `Anciennement client. Motif de rétrogradation : ${values.motif}`,
                downgradeInfo: {
                    motif: values.motif,
                    date: new Date(),
                    ancienClientId: client.id,
                    ancienClientNom: client.name,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            await addTier(newProspect)

            // 2. Mark the original client as inactive (preserve history)
            await updateTier(client.id, {
                active: false,
                notes: `${client.notes || ""}\n[Rétrogradé en prospect le ${new Date().toLocaleDateString('fr-FR')} – Motif: ${values.motif}]`.trim(),
            })

            setOpen(false)
            // Redirect to the prospect created
            router.push(`/tiers/prospects/${newProspect.id}`)
        } catch (err) {
            console.error("Downgrade error", err)
        }
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
            >
                <TrendingDown className="mr-2 h-4 w-4" />
                Rétrograder en Prospect
            </Button>

            <TiersDraggableDialog
                isOpen={open}
                onClose={() => setOpen(false)}
                title="Rétrograder ce client en Prospect"
                width="w-[520px]"
            >
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">Attention – Action non réversible</p>
                        <p>Le client <strong>{client.name}</strong> sera désactivé et un nouveau prospect sera créé avec ses informations. L'historique de facturation reste conservé.</p>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="motif" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Motif de rétrogradation <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Ex: Inactivité prolongée, impayés récurrents, fermeture d'activité..."
                                        rows={3}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="potential" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Potentiel Prospect</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="FAIBLE">Faible</SelectItem>
                                            <SelectItem value="MOYEN">Moyen</SelectItem>
                                            <SelectItem value="ELEVE">Élevé</SelectItem>
                                            <SelectItem value="STRATEGIQUE">Stratégique</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="probability" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Probabilité de retour (%)</FormLabel>
                                    <FormControl>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            {...field}
                                            onChange={e => field.onChange(Number(e.target.value))}
                                        />
                                    </FormControl>
                                </FormItem>
                            )} />
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                                <TrendingDown className="mr-2 h-4 w-4" />
                                Confirmer la rétrogradation
                            </Button>
                        </div>
                    </form>
                </Form>
            </TiersDraggableDialog>
        </>
    )
}
