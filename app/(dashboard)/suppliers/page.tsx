"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Supplier } from '@/types/core';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/lib/api';
import { useCompose } from '@/hooks/use-compose-store';
import { SupplierListView } from '@/components/suppliers/supplier-list-view';
import { SupplierDetailView } from '@/components/suppliers/supplier-detail-view';
import { SupplierForm } from '@/components/suppliers/supplier-form';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const { onOpen } = useCompose();

    const fetchAndSetSuppliers = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getSuppliers();
            setSuppliers(data);
        } catch (error) {
            console.error("Failed to fetch suppliers:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAndSetSuppliers();
    }, [fetchAndSetSuppliers]);

    const handleSave = async (data: Supplier) => {
        const isNew = !data.id;
        try {
            if (isNew) {
                await createSupplier(data);
            } else {
                await updateSupplier(data.id, data);
            }
            await fetchAndSetSuppliers();
            if (!isNew) {
                handleBackToList();
            }
        } catch (error) {
            console.error("Failed to save supplier", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) {
            try {
                await deleteSupplier(id);
                await fetchAndSetSuppliers();
                handleBackToList();
            } catch (error) {
                console.error("Failed to delete supplier:", error);
            }
        }
    };

    const handleOpenCompose = () => {
        onOpen({
            title: "Nouveau Fournisseur",
            content: <SupplierForm onSave={handleSave} initialData={null} />
        });
    };

    const handleBackToList = () => {
        setSelectedSupplierId(null);
    };

    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

    if (selectedSupplierId && selectedSupplier) {
        return (
            <SupplierDetailView
                supplier={selectedSupplier}
                onSave={handleSave}
                onDelete={handleDelete}
                onBack={handleBackToList}
            />
        );
    }

    return (
        <SupplierListView
            suppliers={suppliers}
            isLoading={isLoading}
            onSelectSupplier={setSelectedSupplierId}
            onEditSupplier={setSelectedSupplierId}
            onDeleteSupplier={(supplier) => handleDelete(supplier.id)}
            onAddNew={handleOpenCompose}
            onRefresh={fetchAndSetSuppliers}
        />
    );
}