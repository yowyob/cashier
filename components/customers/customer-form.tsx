import { Client } from '@/types/core';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { Switch } from '../ui/switch';
import React, { useEffect } from 'react';

interface CustomerFormProps {
    initialData: Partial<Client> | null;
    onSave: (data: Client) => void;
    onCancel?: () => void;
    onDelete?: (id: string) => void;
}

export function CustomerForm({ initialData, onSave }: CustomerFormProps) {
    const form = useForm<Client>({
        defaultValues: initialData || { companyName: '', code: '', contactPerson: '', phone: '', email: '', isActive: true, isTaxable: true, balance: 0 },
    });

    useEffect(() => {
        form.reset(initialData || { companyName: '', code: '', contactPerson: '', phone: '', email: '', isActive: true, isTaxable: true, balance: 0 });
    }, [initialData, form]);

    const onSubmit = (data: Client) => {
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
                    <div className="flex items-center space-x-8 pt-4">
                        <FormField control={form.control} name="isTaxable" render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Assujeti à la TVA</FormLabel></FormItem>
                        )} />
                        <FormField control={form.control} name="isActive" render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Client Actif</FormLabel></FormItem>
                        )} />
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        <Save size={16} className="mr-2" />
                        <span>{form.formState.isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}</span>
                    </Button>
                </div>
            </form>
        </Form>
    );
}