"use client";

import React, { useState, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Order, OrderItem } from "@/types/sales";
import { Client, Product } from "@/types/core";
import { Calendar as CalendarIcon, PlusCircle, Save, Eraser, XCircle } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { StatCard } from "@/components/ui/stat-card";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { createOrder } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NewOrderFormProps {
    clients: Client[];
    products: Product[];
}

type FormValues = Omit<Order, 'id' | 'orderNumber' | 'client' | 'status' | 'paymentMethod' | 'netToPay'> & { clientId: string };

const getNextOrderNumber = () => `CMD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;

export function NewOrderForm({ clients, products }: NewOrderFormProps) {
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [quantity, setQuantity] = useState<number>(1);

    const clientOptions: ComboboxOption[] = clients.map(c => ({ value: c.id, label: `${c.code} - ${c.companyName}` }));
    const productOptions: ComboboxOption[] = products.filter(p => p.isActive).map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }));

    const form = useForm<FormValues>({
        defaultValues: {
            clientId: "",
            orderDate: new Date(),
            items: [],
            salesperson: "Administrateur",
            notes: "",
            totalHT: 0,
            totalDiscount: 0,
            totalNetHT: 0,
            precompte: 0,
            totalTVA: 0,
            totalTTC: 0
        },
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
    const watchedItems = useWatch({ control: form.control, name: "items" });

    const recalculateTotals = useCallback(() => {
        const totalHT = watchedItems.reduce((sum, item) => sum + item.total, 0);
        const client = clients.find(c => c.id === form.getValues('clientId'));
        const isTaxable = client?.isTaxable ?? false;
        const totalTVA = isTaxable ? totalHT * 0.1925 : 0;
        const totalTTC = totalHT + totalTVA;

        form.setValue('totalHT', totalHT);
        form.setValue('totalTVA', totalTVA);
        form.setValue('totalTTC', totalTTC);
        form.setValue('totalNetHT', totalHT);
    }, [watchedItems, clients, form]);

    React.useEffect(() => {
        recalculateTotals();
    }, [watchedItems, recalculateTotals]);

    const handleAddArticle = useCallback(() => {
        if (!selectedProductId || quantity <= 0) return;
        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;

        const newItem: OrderItem = {
            id: product.id,
            code: product.code,
            name: product.name,
            quantity: quantity,
            unitPrice: product.salePrice,
            discount: 0,
            total: quantity * product.salePrice,
        };

        append(newItem);
        setSelectedProductId("");
        setQuantity(1);
    }, [selectedProductId, quantity, products, append]);

    const onSubmit = async (data: FormValues) => {
        const client = clients.find(c => c.id === data.clientId);
        if (!client) {
            alert("Veuillez sélectionner un client.");
            return;
        }

        const newOrder: Omit<Order, 'id'> = {
            ...data,
            orderNumber: getNextOrderNumber(),
            client: { id: client.id, name: client.companyName, reference: client.code },
            status: 'Confirmed',
            paymentMethod: 'Credit',
            netToPay: data.totalTTC,
        };

        try {
            await createOrder(newOrder);
            alert(`Commande ${newOrder.orderNumber} enregistrée avec succès !`);
            form.reset();
        } catch (error) {
            console.error("Erreur lors de la création de la commande :", error);
            alert("Une erreur est survenue.");
        }
    };

    const { totalHT, totalTVA, totalTTC } = form.getValues();

    const itemColumns: ColumnDef<OrderItem>[] = [
        { accessorKey: "code", header: "Code" },
        { accessorKey: "name", header: "Libellé", cell: ({ row }) => <div className="w-[300px] truncate">{row.original.name}</div> },
        { accessorKey: "quantity", header: "Qté" },
        { accessorKey: "unitPrice", header: "P.U.", cell: ({ row }) => row.original.unitPrice.toLocaleString() },
        { accessorKey: "total", header: "Total", cell: ({ row }) => row.original.total.toLocaleString() },
        { id: "actions", cell: ({ row }) => (<Button variant="ghost" size="icon" onClick={() => remove(row.index)}><XCircle className="h-4 w-4 text-destructive" /></Button>) },
    ];

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <Card className="flex-1">
                        <CardHeader><CardTitle className="text-base">Ajouter un Article</CardTitle></CardHeader>
                        <CardContent className="space-y-0 px-4">
                            <FormItem><FormLabel>Article</FormLabel><Combobox options={productOptions} value={selectedProductId} onChange={setSelectedProductId} placeholder="Rechercher un article..." searchPlaceholder="Taper le nom ou le code..." /></FormItem>
                            <FormItem className="flex"><FormLabel>Quantité</FormLabel><Input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value)))} min={1} /></FormItem>
                            <div className="flex justify-end pt-2">
                                <Button type="button" onClick={handleAddArticle} disabled={!selectedProductId}><PlusCircle className="mr-2 h-4 w-4" />Ajouter</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex-[1.5]">
                        <CardHeader><CardTitle className="text-base">Informations Commande</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                            <FormField name="clientId" control={form.control} render={({ field }) => (<FormItem className="col-span-2"><FormLabel>Client*</FormLabel><Combobox options={clientOptions} value={field.value} onChange={field.onChange} placeholder="Sélectionner un client..." searchPlaceholder="Taper le nom ou le code..." /></FormItem>)} />
                            <FormField name="salesperson" render={({ field }) => (<FormItem><FormLabel>Vendeur</FormLabel><FormControl><Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Administrateur">Administrateur</SelectItem><SelectItem value="Vendeur 1">Vendeur 1</SelectItem><SelectItem value="Vendeur 2">Vendeur 2</SelectItem></SelectContent></Select></FormControl></FormItem>)} />
                            <FormField name="orderDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "dd MMM yyyy") : <span>Choisir</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover></FormItem>)} />
                        </CardContent>
                    </Card>

                    <div className="w-full lg:w-[280px] flex flex-col gap-4">
                        <Card>
                            <CardHeader><CardTitle className="text-base">Options & Actions</CardTitle></CardHeader>
                            <CardContent className="space-y-4 px-4">
                                <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><Input {...field} placeholder="Notes sur la commande..." /></FormItem>)} />
                                <div className="flex justify-between gap-2 pt-2">
                                    <Button variant="outline" type="button" className="w-1/2" onClick={() => form.reset()}><Eraser className="mr-1 h-4 w-4" />Effacer</Button>
                                    <Button type="submit" className="w-1/2" disabled={form.formState.isSubmitting || watchedItems.length === 0}><Save className="mr-1 h-4 w-4" />{form.formState.isSubmitting ? '...' : 'Enreg.'}</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card className="flex-grow flex flex-col min-h-0">
                    <CardHeader><CardTitle className="text-base">Détail de la Commande ({fields.length} articles)</CardTitle></CardHeader>
                    <CardContent className="py-0 flex-grow overflow-y-auto px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-0 pb-4">
                            <StatCard title="Total HT" value={totalHT.toLocaleString()} />
                            <StatCard title="Remise" value="0" />
                            <StatCard title="TVA" value={totalTVA.toLocaleString()} />
                            <StatCard title="Net À Payer" value={totalTTC.toLocaleString()} variant="primary" />
                        </div>
                        <DataTable columns={itemColumns} data={fields} />
                    </CardContent>
                </Card>
            </form>
        </Form>
    );
} 