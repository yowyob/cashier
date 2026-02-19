"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TiersDraggableDialog } from "@/components/tiers/ui/draggable-dialog"
import { TierType, Tier } from "@/types/tiers"
import { useTiersStore } from "@/lib/tiers/store"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CreateTierDialogProps {
    type: TierType
    label?: string
}

const baseSchema = z.object({
    name: z.string().min(2, "Le nom est requis (min 2 caractères)"),
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    pays: z.enum(['CMR', 'CG', 'TC', 'GB', 'CI']).optional(),
})

export function CreateTierDialog({ type, label }: CreateTierDialogProps) {
    const [open, setOpen] = useState(false)
    const { addTier } = useTiersStore()

    const form = useForm<z.infer<typeof baseSchema>>({
        resolver: zodResolver(baseSchema),
        defaultValues: { name: "", email: "", phoneNumber: "", address: "", city: "" },
    })

    const typeLabels: Record<TierType, string> = {
        client: 'Client',
        fournisseur: 'Fournisseur',
        commercial: 'Commercial',
        prospect: 'Prospect',
    }

    const onSubmit = async (values: z.infer<typeof baseSchema>) => {
        try {
            const newTier = {
                ...values,
                id: crypto.randomUUID(),
                type,
                active: true,
                postalCode: "",
                createdAt: new Date(),
                updatedAt: new Date(),
                // Type-specific defaults
                ...(type === 'client' && { segment: 'ENTREPRISE' as const }),
                ...(type === 'fournisseur' && { modePaiement: 'VIREMENT' as const }),
                ...(type === 'commercial' && { commission: 5, typeCommercial: 'INTERNE' as const }),
                ...(type === 'prospect' && { potentiel: 'MOYEN' as const }),
            } as Tier
            await addTier(newTier)
            form.reset()
            setOpen(false)
        } catch (error) {
            console.error("Error creating tier", error)
        }
    }

    return (
        <>
            <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                {label || `Nouveau ${typeLabels[type]}`}
            </Button>

            <TiersDraggableDialog
                isOpen={open}
                onClose={() => setOpen(false)}
                title={`Nouveau ${typeLabels[type]}`}
                width="w-[550px]"
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nom / Raison Sociale <span className="text-red-500">*</span></FormLabel>
                                <FormControl><Input placeholder="Ex: Mon Entreprise S.A.R.L" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input placeholder="contact@exemple.cm" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Téléphone</FormLabel>
                                    <FormControl><Input placeholder="+237 6XX XXX XXX" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="city" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ville</FormLabel>
                                    <FormControl><Input placeholder="Douala" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="pays" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pays</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="CMR">Cameroun</SelectItem>
                                            <SelectItem value="CG">Congo</SelectItem>
                                            <SelectItem value="TC">Tchad</SelectItem>
                                            <SelectItem value="GB">Gabon</SelectItem>
                                            <SelectItem value="CI">Côte d'Ivoire</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Adresse</FormLabel>
                                <FormControl><Input placeholder="123 Rue de la République" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                                Créer le {typeLabels[type]}
                            </Button>
                        </div>
                    </form>
                </Form>
            </TiersDraggableDialog>
        </>
    )
}
