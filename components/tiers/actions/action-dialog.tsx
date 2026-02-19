"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Send, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TiersDraggableDialog } from "@/components/tiers/ui/draggable-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { TiersAction } from "@/types/tiers"
import { useTiersStore } from "@/lib/tiers/store"
import { TiersSearch } from "./tier-search"

const formSchema = z.object({
    title: z.string().min(2, "Le titre est requis"),
    type: z.enum(['RELANCE_PAIEMENT', 'DEMANDE_DEVIS', 'RDV_CLIENT', 'RECLAMATION', 'AUTRE', 'COMMANDE', 'LIVRAISON'] as const),
    object: z.string().min(2, "L'objet est requis"),
    followedBy: z.string().min(1, "Veuillez sélectionner un responsable"),
    notificationMethod: z.enum(['EMAIL', 'SMS', 'APP'] as const),
    date: z.date({ message: "Une date est requise" }),
    content: z.string().min(5, "Le contenu est requis"),
    effect: z.enum(['IMMEDIATE', 'DEFERRED'] as const),
    tierIds: z.array(z.string()).min(1, "Veuillez sélectionner au moins un tiers"),
})

export function TiersActionDialog() {
    const { currentUser, tiers, updateTier, isSchedulerOpen, schedulerTierId, closeScheduler } = useTiersStore()
    const employees = [
        { id: '1', name: 'Administrateur' },
        { id: '2', name: 'Commercial 1' },
        { id: '3', name: 'Secrétaire' },
    ]

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            type: "AUTRE",
            object: "",
            followedBy: currentUser?.id || "1",
            notificationMethod: "EMAIL",
            date: new Date(),
            content: "",
            effect: "IMMEDIATE",
            tierIds: schedulerTierId ? [schedulerTierId] : [],
        },
    })

    useEffect(() => {
        if (schedulerTierId) form.setValue('tierIds', [schedulerTierId])
    }, [schedulerTierId, form])

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const { tierIds, ...actionValues } = values
            for (const tierId of tierIds) {
                const newAction: TiersAction = {
                    id: crypto.randomUUID(),
                    ...actionValues,
                    status: 'PENDING',
                    createdAt: new Date(),
                }
                const targetTier = tiers.find(t => t.id === tierId)
                if (targetTier) {
                    const updatedActions = [newAction, ...(targetTier.actions || [])]
                    await updateTier(tierId, { actions: updatedActions })
                }
            }
            form.reset()
            closeScheduler()
        } catch (error) {
            console.error("Error saving action", error)
        }
    }

    if (!isSchedulerOpen) return null

    return (
        <TiersDraggableDialog isOpen={isSchedulerOpen} onClose={closeScheduler} title="Nouvelle Action / Tâche" width="w-[700px]">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="tierIds" render={({ field }) => (
                            <FormItem className="col-span-2">
                                <FormLabel className="text-xs text-muted-foreground">Tiers / Contacts (Multi-sélection)</FormLabel>
                                <FormControl>
                                    <TiersSearch tiers={tiers} selectedTierIds={field.value} onSelectTiers={field.onChange} multiSelect={!schedulerTierId} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Titre</FormLabel>
                                <FormControl><Input placeholder="Titre de l'action" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Type d'action</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="RELANCE_PAIEMENT">Relance Paiement</SelectItem>
                                        <SelectItem value="DEMANDE_DEVIS">Demande de Devis</SelectItem>
                                        <SelectItem value="RDV_CLIENT">Rendez-vous Client</SelectItem>
                                        <SelectItem value="RECLAMATION">Réclamation</SelectItem>
                                        <SelectItem value="COMMANDE">Commande</SelectItem>
                                        <SelectItem value="LIVRAISON">Livraison</SelectItem>
                                        <SelectItem value="AUTRE">Autre</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="text-xs text-muted-foreground">Date d'échéance</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>Date d'échéance</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="object" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Objet</FormLabel>
                                <FormControl><Input placeholder="Objet" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <FormField control={form.control} name="followedBy" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Suivi par</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="notificationMethod" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Notification</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Moyen" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="EMAIL">Email</SelectItem>
                                        <SelectItem value="SMS">SMS</SelectItem>
                                        <SelectItem value="APP">In-App</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="effect" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Effet</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Effet" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="IMMEDIATE">Immédiat</SelectItem>
                                        <SelectItem value="DEFERRED">Différé</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="content" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Contenu</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Contenu de l'action..." className="min-h-[120px] resize-none" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <div className="flex justify-between items-center pt-2 border-t">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <Paperclip className="h-4 w-4" />
                        </Button>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={closeScheduler}>Annuler</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                                <Send className="h-4 w-4" />
                                Planifier {form.watch('tierIds')?.length > 1 ? `(${form.watch('tierIds').length})` : ''}
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </TiersDraggableDialog>
    )
}
