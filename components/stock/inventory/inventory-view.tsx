"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Inventory, Warehouse, InventoryItem } from '@/types/stock';
import { Product } from '@/types/core';
import { NewInventoryDialog } from './new-inventory-dialog';
import { InventoryListPanel } from './inventory-list-panel';
import { InventoryDetailView } from './inventory-detail-view';
import { updateInventory, createInventory, getProducts, updateProduct, getInventories } from '@/lib/api';

interface InventoryViewProps {
    initialInventories: Inventory[];
    products: Product[];
    warehouses: Warehouse[];
}

export function InventoryView({ initialInventories, products, warehouses }: InventoryViewProps) {
    const [inventories, setInventories] = useState<Inventory[]>(initialInventories);
    const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
    const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

    const refreshInventories = useCallback(async () => {
        const data = await getInventories();
        setInventories(data);
    }, []);

    const handleCreateInventory = async (data: { warehouseId: string; type: Inventory['type'] }) => {
        const allProducts = await getProducts();
        const items = allProducts.map(p => ({
            productId: p.id,
            productCode: p.code,
            productName: p.name,
            theoreticalQty: p.stock,
            physicalQty: null,
        }));

        const newInventory: Omit<Inventory, 'id'> = {
            reference: `INV-${data.warehouseId}-${Date.now()}`,
            warehouseId: data.warehouseId,
            date: new Date().toISOString(),
            status: 'En cours',
            type: data.type,
            items: items,
        };

        try {
            const created = await createInventory(newInventory);
            await refreshInventories();
            setSelectedInventory(created);
            setIsNewDialogOpen(false);
        } catch (error) {
            console.error("Failed to create inventory", error);
        }
    };

    const handleSaveInventoryItems = async (inventoryId: string, items: InventoryItem[]) => {
        try {
            const updated = await updateInventory(inventoryId, { items });
            setSelectedInventory(updated);
            await refreshInventories();
        } catch (error) {
            console.error("Failed to save inventory items", error);
        }
    };

    const handleValidateInventory = async (inventory: Inventory) => {
        if (!window.confirm(`Voulez-vous vraiment valider l'inventaire ${inventory.reference} ? Cette action mettra à jour les stocks et est irréversible.`)) {
            return;
        }
        try {
            const stockUpdates = inventory.items
                .filter(item => item.physicalQty !== null && item.physicalQty !== item.theoreticalQty)
                .map(item => updateProduct(item.productId, { stock: item.physicalQty! }));

            await Promise.all(stockUpdates);
            const validated = await updateInventory(inventory.id, { status: 'Validé' });
            setSelectedInventory(validated);
            await refreshInventories();
            alert("Inventaire validé et stocks mis à jour !");
        } catch (error) {
            console.error("Failed to validate inventory", error);
        }
    };

    return (
        <div className="h-full flex gap-4">
            <Card className="w-1/3 flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className='text-base'>Liste des Inventaires</CardTitle>
                    <Button size="sm" onClick={() => setIsNewDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouveau</Button>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto p-2">
                    <InventoryListPanel
                        inventories={inventories}
                        selectedId={selectedInventory?.id || null}
                        onSelect={setSelectedInventory}
                    />
                </CardContent>
            </Card>

            <div className="w-2/3">
                {selectedInventory ? (
                    <InventoryDetailView
                        key={selectedInventory.id}
                        inventory={selectedInventory}
                        onSave={handleSaveInventoryItems}
                        onValidate={() => handleValidateInventory(selectedInventory)}
                        onDelete={() => { }}
                        onBack={() => setSelectedInventory(null)}
                    />
                ) : (
                    <Card className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <p>Sélectionnez un inventaire pour voir les détails</p>
                            <p className="text-sm">ou créez-en un nouveau.</p>
                        </div>
                    </Card>
                )}
            </div>

            <NewInventoryDialog
                isOpen={isNewDialogOpen}
                onClose={() => setIsNewDialogOpen(false)}
                warehouses={warehouses}
                onSubmit={handleCreateInventory}
            />
        </div>
    );
}