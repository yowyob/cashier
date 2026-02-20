"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { format } from 'date-fns';
import { UnifiedMovement } from '@/app/(dashboard)/stock/journal/page';
import { Product } from '@/types/core';
import { StockMovement, Warehouse, WarehouseTransfer, ProductTransformation } from '@/types/stock';
import { ColumnDef } from '@tanstack/react-table';

interface JournalDetailViewProps {
    movement: UnifiedMovement;
    rawData: {
        stockMovements: StockMovement[];
        warehouseTransfers: WarehouseTransfer[];
        productTransformations: ProductTransformation[];
        warehouses: Warehouse[];
        products: Product[];
    };
    onBack: () => void;
}

const DetailTable = ({ items, productMap }: { items: any[], productMap: Map<string, Product> }) => {
    const detailedItems = items.map(item => {
        const product = productMap.get(item.productId);
        return { ...item, code: product?.code || 'N/A', name: product?.name || 'Inconnu' };
    });

    const columns: ColumnDef<any>[] = [
        { accessorKey: 'code', header: 'Code' },
        { accessorKey: 'name', header: 'Article', cell: ({ row }) => <div className="w-[300px] truncate">{row.original.name}</div> },
        { accessorKey: 'quantity', header: 'Quantité' },
        { accessorKey: 'costPrice', header: 'P.A. Unitaire', cell: ({ row }) => row.original.costPrice?.toLocaleString() },
    ];

    return <DataTable columns={columns} data={detailedItems} />;
};


export function JournalDetailView({ movement, rawData, onBack }: JournalDetailViewProps) {
    console.log('raw datas', rawData);
    const productMap = useMemo(() => new Map(rawData.products.map(p => [p.id, p])), [rawData.products]);
    const warehouseMap = useMemo(() => new Map(rawData.warehouses.map(w => [w.id, w.name])), [rawData.warehouses]);

    const renderDetails = () => {
        switch (movement.type) {
            case 'Entrée':
            case 'Sortie':
                const mov = rawData.stockMovements.find(m => m.id === movement.originalId);
                if (!mov) return <p>Détails non trouvés.</p>;
                return (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Articles du Mouvement</CardTitle></CardHeader>
                        <CardContent><DetailTable items={mov.items} productMap={productMap} /></CardContent>
                    </Card>
                );

            case 'Transfert':
                const trans = rawData.warehouseTransfers.find(t => t.id === movement.originalId);
                if (!trans) return <p>Détails non trouvés.</p>;
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Articles Transférés</CardTitle>
                            <CardDescription>
                                De <span className="font-semibold">{warehouseMap.get(trans.sourceWarehouseId)}</span> vers <span className="font-semibold">{warehouseMap.get(trans.destinationWarehouseId)}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent><DetailTable items={trans.items} productMap={productMap} /></CardContent>
                    </Card>
                );

            case 'Transformation':
                const transf = rawData.productTransformations.find(t => t.id === movement.originalId);
                if (!transf) return <p>Détails non trouvés.</p>;
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle className="text-base text-red-600">Produits Consommés</CardTitle></CardHeader>
                            <CardContent><DetailTable items={transf.inputItems} productMap={productMap} /></CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-base text-green-600">Produits Obtenus</CardTitle></CardHeader>
                            <CardContent><DetailTable items={transf.outputItems} productMap={productMap} /></CardContent>
                        </Card>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm h-full flex flex-col">
            <div className="p-2 border-b flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="ghost" size="icon"><Printer className="h-5 w-5" /></Button>
            </div>
            <div className="p-4 border-b">
                <h1 className="text-2xl font-semibold">{movement.reference}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span>{format(movement.date, 'dd MMMM yyyy à HH:mm')}</span>
                    <Badge>{movement.type}</Badge>
                    <span>Magasin: <span className="font-medium">{movement.warehouseName}</span></span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                {renderDetails()}
            </div>
        </div>
    );
}