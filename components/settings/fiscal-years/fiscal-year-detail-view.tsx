"use client";

import React, { useMemo } from 'react';
import { FiscalYear } from '@/types/settings';
import { Order } from '@/types/sales';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Lock, Unlock, CheckCircle, Printer } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

interface FiscalYearDetailViewProps {
    year: FiscalYear;
    allOrders: Order[];
    onStatusChange: (year: FiscalYear, newStatus: FiscalYear['status']) => void;
}

export function FiscalYearDetailView({ year, allOrders, onStatusChange }: FiscalYearDetailViewProps) {

    const yearStats = useMemo(() => {
        const startDate = parseISO(year.startDate as string);
        const endDate = parseISO(year.endDate as string);

        const ordersInYear = allOrders.filter(order => {
            const orderDate = order.orderDate;
            return orderDate >= startDate && orderDate <= endDate;
        });

        const totalRevenue = ordersInYear.reduce((sum, order) => sum + order.netToPay, 0);
        const invoiceCount = ordersInYear.length;

        const topProducts = ordersInYear
            .flatMap(order => order.items)
            .reduce((acc, item) => {
                acc[item.name] = (acc[item.name] || 0) + item.quantity;
                return acc;
            }, {} as Record<string, number>);

        const sortedTopProducts = Object.entries(topProducts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity }));

        return {
            totalRevenue,
            invoiceCount,
            topProducts: sortedTopProducts,
        };
    }, [year, allOrders]);

    const topProductsColumns: ColumnDef<{ name: string; quantity: number }>[] = [
        { accessorKey: 'name', header: 'Produit' },
        { accessorKey: 'quantity', header: 'Quantité Vendue' },
    ];

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{year.name}</CardTitle>
                        <CardDescription>
                            Du {format(new Date(year.startDate), 'dd/MM/yyyy')} au {format(new Date(year.endDate), 'dd/MM/yyyy')}
                            <Badge className="ml-2" variant={year.status === 'Clôturé' ? 'destructive' : year.status === 'En cours' ? 'success' : 'default'}>
                                {year.status}
                            </Badge>
                        </CardDescription>
                    </div>
                    <div>
                        {year.status === 'Ouvert' && <Button size="sm" onClick={() => onStatusChange(year, 'En cours')}><Unlock className="h-4 w-4 mr-2" />Activer l'exercice</Button>}
                        {year.status === 'En cours' && <Button size="sm" variant="destructive" onClick={() => onStatusChange(year, 'Clôturé')}><Lock className="h-4 w-4 mr-2" />Clôturer l'exercice</Button>}
                        {year.status === 'Clôturé' && <span className="text-sm text-muted-foreground flex items-center h-9"><CheckCircle className="h-4 w-4 mr-2 text-green-500" />Terminé</span>}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title="Chiffre d'Affaires" value={`${yearStats.totalRevenue.toLocaleString('fr-FR')} XAF`} variant="primary" />
                    <StatCard title="Nombre de Commandes" value={yearStats.invoiceCount.toLocaleString('fr-FR')} />
                    <StatCard title="Marge Brute (Estimée)" value="N/A" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2">Top 5 Produits Vendus</h3>
                    <DataTable columns={topProductsColumns} data={yearStats.topProducts} />
                </div>
            </CardContent>
            <CardFooter className="justify-end border-t pt-4">
                <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Imprimer le bilan</Button>
            </CardFooter>
        </Card>
    );
}