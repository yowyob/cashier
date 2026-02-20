"use client"

import { useTiersStore } from "@/lib/tiers/store"
import { TiersDataTable } from "@/components/tiers/ui/data-table"
import { CreateTierDialog } from "@/components/tiers/forms/create-tier-dialog"
import { TiersCommercial } from "@/types/tiers"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const typeColors: Record<string, string> = {
    INTERNE: 'bg-green-100 text-green-800',
    EXTERNE: 'bg-blue-100 text-blue-800',
    INDEPENDANT: 'bg-orange-100 text-orange-800',
}

function CommercialActionCell({ c }: { c: TiersCommercial }) {
    const { openScheduler } = useTiersStore()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={`/tiers/commerciaux/${c.id}`} className="flex items-center cursor-pointer">
                        <Eye className="mr-2 h-4 w-4" /> Voir détails
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openScheduler(c.id)} className="text-blue-600">
                    <Calendar className="mr-2 h-4 w-4" /> Planifier action
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

const columns: ColumnDef<TiersCommercial>[] = [
    {
        accessorKey: "name", id: "name",
        header: "Commercial",
        cell: ({ row }) => {
            const c = row.original
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-green-100 text-green-800 font-semibold text-sm">{c.name.charAt(0)}</AvatarFallback></Avatar>
                    <div>
                        <Link href={`/tiers/commerciaux/${c.id}`} className="font-medium hover:text-blue-600 hover:underline text-sm">{c.name}</Link>
                        <p className="text-xs text-gray-400">{c.matricule}</p>
                    </div>
                </div>
            )
        },
    },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phoneNumber", header: "Téléphone" },
    { accessorKey: "city", header: "Ville" },
    {
        accessorKey: "agentType", header: "Type", cell: ({ row }) => {
            const t = row.original.agentType
            return t ? <Badge className={typeColors[t] || 'bg-gray-100 text-gray-800'}>{t}</Badge> : null
        }
    },
    { accessorKey: "commission", header: "Commission (%)", cell: ({ row }) => row.original.commission ? `${row.original.commission}%` : '-' },
    { id: "actions", cell: ({ row }) => <CommercialActionCell c={row.original} /> },
]

export default function CommerciauxPage() {
    const { tiers } = useTiersStore()
    const commerciaux = tiers.filter((t): t is TiersCommercial => t.type === 'commercial')
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Commerciaux</h2>
                    <p className="text-sm text-gray-500">Gérez vos commerciaux et leurs performances.</p>
                </div>
                <CreateTierDialog type="commercial" label="Nouveau Commercial" />
            </div>
            <TiersDataTable columns={columns} data={commerciaux} searchKey="name" searchPlaceholder="Rechercher par nom..." />
        </div>
    )
}
