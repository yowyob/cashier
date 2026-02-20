"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Supplier } from '@/types/core';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface SupplierFormProps {
    initialData: Partial<Supplier> | null;
    onSave: (data: Supplier) => void;
    onCancel?: () => void;
    onDelete?: (id: string) => void;
}

export function SupplierForm({ initialData, onSave }: SupplierFormProps) {
    const form = useForm<Supplier>({
        defaultValues: { ...initialData, isActive: initialData?.isActive ?? true, balance: initialData?.balance ?? 0 },
    });

    useEffect(() => {
        form.reset({ ...initialData, isActive: initialData?.isActive ?? true, balance: initialData?.balance ?? 0 });
    }, [initialData, form]);

    const onSubmit = (data: Supplier) => {
        onSave(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <FormField control={form.control} name="companyName" render={({ field }) => (
                        <FormItem><FormLabel>Raison sociale *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="code" render={({ field }) => (
                            <FormItem><FormLabel>Code *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="contactPerson" render={({ field }) => (
                            <FormItem><FormLabel>Contact</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="isActive" render={({ field }) => (
                        <FormItem className="flex items-center gap-2 pt-4"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Fournisseur Actif</FormLabel></FormItem>
                    )} />
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        <Save size={16} className="mr-2" />
                        {form.formState.isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}