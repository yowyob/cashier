"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { OrderItem } from "@/types/sales";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, PlusCircle, Save, Printer, Eraser, Trash2, XCircle } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

const orderFormSchema = z.object({
  clientId: z.string().min(1, "Le client est requis."),
  invoiceDate: z.date().optional(),
  dueDate: z.date().optional(),
  items: z.array(z.object({
    id: z.string(), code: z.string(), name: z.string(), quantity: z.number().min(1),
    unitPrice: z.number().min(0), discount: z.number().min(0).max(100), total: z.number(),
  })),
  // Autres champs...
});

type OrderFormData = z.infer<typeof orderFormSchema>;

export function OrderForm() {
  const form = useForm<OrderFormData>({
    //... (même logique de formulaire qu'avant)
    defaultValues: { items: [], invoiceDate: new Date(), dueDate: new Date() }
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  const itemColumns: ColumnDef<OrderItem>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Libellé", cell: ({ row }) => <div className="w-[250px] truncate">{row.original.name}</div> },
    { accessorKey: "quantity", header: "Qté" },
    { accessorKey: "unitPrice", header: "P.U.", cell: ({ row }) => row.original.unitPrice.toFixed(2) },
    { accessorKey: "discount", header: "Remise (%)" },
    { accessorKey: "total", header: "Total", cell: ({ row }) => row.original.total.toFixed(2) },
    { id: "actions", cell: ({ row }) => <Button variant="ghost" size="icon" onClick={() => remove(row.index)}><XCircle className="h-4 w-4 text-destructive" /></Button> },
  ];

  return (
    <Form {...form}>
      {/* h-full et flex pour le conteneur principal */}
      <form onSubmit={form.handleSubmit(() => { })} className="h-full flex flex-col space-y-4">

        {/* Les cartes du haut sont fixes */}
        <div className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-base">En-tête Livraison</CardTitle></CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-x-4 gap-y-2">
              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Client *</FormLabel><Select onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="client-1">CLIENT COMPTANT MOKOLO</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Date Facture</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} size="sm" className="text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{field.value instanceof Date ? format(field.value, "dd-MM-yy") : <span>Date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover></FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Date échéance</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} size="sm" className="text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{field.value instanceof Date ? format(field.value, "dd-MM-yy") : <span>Date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover></FormItem>
              )} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-base">Critères de choix d'un article</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <FormItem><FormLabel>Réf. article</FormLabel><Input placeholder="Rechercher..." /></FormItem>
                <FormItem><FormLabel>Quantité</FormLabel><Input type="number" /></FormItem>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => remove(fields.length - 1)}><Trash2 className="mr-2 h-4 w-4" />Retirer</Button>
                <Button type="button" size="sm"><PlusCircle className="mr-2 h-4 w-4" />Ajouter</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Le tableau grandit pour remplir l'espace */}
        <div className="flex-grow">
          <Card className="h-full flex flex-col">
            <CardHeader className="p-4 flex-shrink-0"><CardTitle className="text-base">Lignes ou détail</CardTitle></CardHeader>
            <CardContent className="p-4 flex-grow">
              <DataTable columns={itemColumns} data={fields} />
            </CardContent>
          </Card>
        </div>

        {/* Le pied de page est fixe */}
        <Card className="flex-shrink-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="p-2 border rounded-md"><p className="text-xs text-muted-foreground">HT</p><p className="font-bold">0.00</p></div>
                <div className="p-2 border rounded-md"><p className="text-xs text-muted-foreground">Remise</p><p className="font-bold">0.00</p></div>
                <div className="p-2 border rounded-md"><p className="text-xs text-muted-foreground">TVA</p><p className="font-bold">0.00</p></div>
                <div className="p-2 border rounded-md bg-primary/10"><p className="text-xs text-primary">TTC</p><p className="font-bold text-primary">0.00</p></div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" type="button"><Eraser className="mr-2 h-4 w-4" />Effacer</Button>
                <Button variant="outline" type="button"><Printer className="mr-2 h-4 w-4" />Imprimer</Button>
                <Button type="submit"><Save className="mr-2 h-4 w-4" />Enregistrer</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}