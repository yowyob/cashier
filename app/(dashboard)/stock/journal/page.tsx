"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getStockMovements, getWarehouses, getWarehouseTransfers, getProductTransformations, getProducts } from "@/lib/api";
import { StockJournalView } from "@/components/stock/journal/stock-journal-view";
import { JournalDetailView } from "@/components/stock/journal/journal-detail-view";
import { Warehouse, StockMovement, WarehouseTransfer, ProductTransformation } from '@/types/stock';
import { Product } from '@/types/core';

export type UnifiedMovement = {
    id: string; // Unique ID for the row (e.g., 'sm-1', 'wt-2')
    originalId: string; // ID from the original database table
    date: Date;
    type: 'Entrée' | 'Sortie' | 'Transfert' | 'Transformation';
    reference: string;
    description: string;
    warehouseId: string;
    warehouseName: string;
};

export default function StockJournalPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [movements, setMovements] = useState<UnifiedMovement[]>([]);
    const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);

    // Store original data for detail view
    const [rawData, setRawData] = useState<{
        stockMovements: StockMovement[],
        warehouseTransfers: WarehouseTransfer[],
        productTransformations: ProductTransformation[],
        warehouses: Warehouse[],
        products: Product[]
    }>({ stockMovements: [], warehouseTransfers: [], productTransformations: [], warehouses: [], products: [] });

    const fetchAndSetData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [stockMovements, warehouses, transfers, transformations, products] = await Promise.all([
                getStockMovements(),
                getWarehouses(),
                getWarehouseTransfers(),
                getProductTransformations(),
                getProducts()
            ]);

            console.log('transfers:', transfers);
            console.log('transformations', transformations);

            setRawData({ stockMovements, warehouseTransfers: transfers, productTransformations: transformations, warehouses, products });

            const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

            const mappedMovements = stockMovements.map((m): UnifiedMovement => ({
                id: `sm-${m.id}`, originalId: m.id, date: new Date(m.date),
                type: m.type === 'entry' ? 'Entrée' : 'Sortie',
                reference: m.reference, description: m.notes || `Mouvement standard`,
                warehouseId: m.warehouseId, warehouseName: warehouseMap.get(m.warehouseId) || m.warehouseId
            }));

            const mappedTransfers = transfers.map((t): UnifiedMovement => ({
                id: `wt-${t.id}`, originalId: t.id, date: new Date(t.date),
                type: 'Transfert', reference: t.reference,
                description: `De ${warehouseMap.get(t.sourceWarehouseId)} à ${warehouseMap.get(t.destinationWarehouseId)}`,
                warehouseId: t.sourceWarehouseId, warehouseName: warehouseMap.get(t.sourceWarehouseId) || t.sourceWarehouseId
            }));

            const mappedTransformations = transformations.map((t): UnifiedMovement => ({
                id: `pt-${t.id}`, originalId: t.id, date: new Date(t.date),
                type: 'Transformation', reference: t.reference,
                description: t.description || `Transformation d'articles`,
                warehouseId: t.warehouseId, warehouseName: warehouseMap.get(t.warehouseId) || t.warehouseId
            }));

            const allMovements = [...mappedMovements, ...mappedTransfers, ...mappedTransformations]
                .sort((a, b) => b.date.getTime() - a.date.getTime());

            setMovements(allMovements);

        } catch (error) {
            console.error("Failed to fetch journal data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAndSetData();
    }, [fetchAndSetData]);

    const handleBackToList = () => {
        setSelectedMovementId(null);
    };

    const selectedMovement = useMemo(() =>
        movements.find(m => m.id === selectedMovementId),
        [movements, selectedMovementId]
    );

    if (selectedMovementId && selectedMovement) {
        return (
            <JournalDetailView
                movement={selectedMovement}
                rawData={rawData}
                onBack={handleBackToList}
            />
        );
    }

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex-shrink-0">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    Journal des Mouvements de Stock
                </h1>
                <p className="text-muted-foreground mt-1">
                    Consultez l'historique complet des entrées, sorties, transferts et transformations.
                </p>
            </div>
            <div className="flex-grow min-h-0">
                <StockJournalView
                    movements={movements}
                    warehouses={rawData.warehouses}
                    isLoading={isLoading}
                    onSelectMovement={setSelectedMovementId}
                    onRefresh={fetchAndSetData}
                />
            </div>
        </div>
    );
}