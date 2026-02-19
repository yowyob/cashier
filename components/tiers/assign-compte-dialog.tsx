"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useTiersStore } from "@/lib/tiers/store"
import { Tier, CompteBancaire } from "@/types/tiers"
import { Plus, Building, CreditCard } from "lucide-react"

const comptableSchema = z.object({
    compteComptable: z.string().min(3, "Le numéro de compte doit avoir au moins 3 caractères").regex(/^[0-9]/, "Doit commencer par un chiffre (ex: 411001, 401002)"),
})

const bancaireSchema = z.object({
    banque: z.string().min(2, "Nom de la banque requis"),
    iban: z.string().min(10, "IBAN requis (min 10 caractères)"),
    bic: z.string().min(4, "BIC requis (min 4 caractères)").max(11),
})

interface AssignCompteDialogProps {
    tier: Tier
    type: 'comptable' | 'bancaire'
    compact?: boolean
}

export function AssignCompteDialog({ tier, type, compact = false }: AssignCompteDialogProps) {
    const [open, setOpen] = useState(false)
    const { updateTier } = useTiersStore()

    const comptableForm = useForm<z.infer<typeof comptableSchema>>({
        resolver: zodResolver(comptableSchema),
        defaultValues: { compteComptable: tier.compteComptable || '' },
    })

    const bancaireForm = useForm<z.infer<typeof bancaireSchema>>({
        resolver: zodResolver(bancaireSchema),
        defaultValues: { banque: '', iban: '', bic: '' },
    })

    const handleAssignComptable = async (values: z.infer<typeof comptableSchema>) => {
        await updateTier(tier.id, { compteComptable: values.compteComptable })
        setOpen(false)
    }

    const handleAssignBancaire = async (values: z.infer<typeof bancaireSchema>) => {
        const newAccount: CompteBancaire = {
            id: crypto.randomUUID(),
            banque: values.banque,
            iban: values.iban.replace(/\s/g, ''),
            bic: values.bic.toUpperCase(),
        }
        const currentAccounts = tier.comptesBancaires || []
        await updateTier(tier.id, { comptesBancaires: [...currentAccounts, newAccount] })
        bancaireForm.reset()
        setOpen(false)
    }

    const isComptable = type === 'comptable'
    const Icon = isComptable ? Building : CreditCard
    const buttonLabel = isComptable
        ? (tier.compteComptable ? 'Modifier compte' : 'Assigner')
        : 'Ajouter compte'

    const suggestedAccount = isComptable
        ? tier.type === 'client' ? '411' : tier.type === 'fournisseur' ? '401' : tier.type === 'commercial' ? '421' : '469'
        : ''

    return (
        <>
            <Button
                variant={compact ? "ghost" : "outline"}
                size="sm"
                className={compact ? "h-6 w-6 p-0 text-gray-500" : "h-7 px-2 py-0 text-xs border-orange-300 text-orange-700 hover:bg-orange-100"}
                onClick={(e) => { e.stopPropagation(); setOpen(true) }}
            >
                {compact ? <Plus className="h-3 w-3" /> : buttonLabel}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md" onClick={e => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-blue-600" />
                            {isComptable ? `Assigner Compte Comptable — ${tier.name}` : `Ajouter Compte Bancaire — ${tier.name}`}
                        </DialogTitle>
                    </DialogHeader>

                    {isComptable ? (
                        <Form {...comptableForm}>
                            <form onSubmit={comptableForm.handleSubmit(handleAssignComptable)} className="space-y-4">
                                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                                    <p className="font-medium mb-1">Format OHADA :</p>
                                    <p>• Client → <code className="bg-blue-100 px-1 rounded">411XXX</code> (Clients)</p>
                                    <p>• Fournisseur → <code className="bg-blue-100 px-1 rounded">401XXX</code> (Fournisseurs)</p>
                                    <p>• Commercial → <code className="bg-blue-100 px-1 rounded">421XXX</code> (Personnel)</p>
                                </div>
                                <FormField
                                    control={comptableForm.control}
                                    name="compteComptable"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Numéro de Compte Comptable</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={`${suggestedAccount}001`}
                                                    className="font-mono text-lg"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Assigner</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    ) : (
                        <Form {...bancaireForm}>
                            <form onSubmit={bancaireForm.handleSubmit(handleAssignBancaire)} className="space-y-4">
                                <FormField
                                    control={bancaireForm.control}
                                    name="banque"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nom de la banque</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Afriland First Bank, BICEC, SCB..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={bancaireForm.control}
                                    name="iban"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>IBAN / Numéro de compte</FormLabel>
                                            <FormControl>
                                                <Input placeholder="CM21 XXXX XXXX XXXX XXXX" className="font-mono" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={bancaireForm.control}
                                    name="bic"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Code BIC / SWIFT</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: CCECMCMXXXX" className="font-mono" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Ajouter</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
