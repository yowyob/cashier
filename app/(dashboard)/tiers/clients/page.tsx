"use client"

import { useTiersStore } from "@/lib/tiers/store"
import { clientColumns } from "./columns"
import { TiersDataTable } from "@/components/tiers/ui/data-table"
import { CreateTierDialog } from "@/components/tiers/forms/create-tier-dialog"
import { TiersClient } from "@/types/tiers"

export default function ClientsPage() {
    const { tiers } = useTiersStore()
    const clients = tiers.filter((t): t is TiersClient => t.type === 'client')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Clients</h2>
                    <p className="text-sm text-gray-500">Gérez votre base de clients et leurs informations.</p>
                </div>
                <CreateTierDialog type="client" label="Nouveau Client" />
            </div>
            <TiersDataTable columns={clientColumns} data={clients} searchKey="name" searchPlaceholder="Rechercher par nom..." />
        </div>
    )
}
