"use client"

import { useTiersStore } from "@/lib/tiers/store"
import { TiersDataTable } from "@/components/tiers/ui/data-table"
import { CreateTierDialog } from "@/components/tiers/forms/create-tier-dialog"
import { TiersProspect } from "@/types/tiers"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"

const potentielColors: Record<string, string> = {
    FAIBLE: 'bg-gray-100 text-gray-800',
    MOYEN: 'bg-yellow-100 text-yellow-800',
    ELEVE: 'bg-orange-100 text-orange-800',
    STRATEGIQUE: 'bg-red-100 text-red-800',
}

function ProspectActionCell({ p }: { p: TiersProspect }) {
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
                    <Link href={`/tiers/prospects/${p.id}`} className="flex items-center cursor-pointer">
                        <Eye className="mr-2 h-4 w-4" /> Voir détails
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openScheduler(p.id)} className="text-blue-600">
                    <Calendar className="mr-2 h-4 w-4" /> Planifier action
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

const columns: ColumnDef<TiersProspect>[] = [
    {
        accessorKey: "name", id: "name",
        header: "Prospect",
        cell: ({ row }) => {
            const p = row.original
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-orange-100 text-orange-800 font-semibold text-sm">{p.name.charAt(0)}</AvatarFallback></Avatar>
                    <div>
                        <Link href={`/tiers/prospects/${p.id}`} className="font-medium hover:text-blue-600 hover:underline text-sm">{p.name}</Link>
                        <p className="text-xs text-gray-400">{p.contact}</p>
                    </div>
                </div>
            )
        },
    },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phoneNumber", header: "Téléphone" },
    { accessorKey: "city", header: "Ville" },
    {
        accessorKey: "potentiel", header: "Potentiel", cell: ({ row }) => {
            const p = row.original.potentiel
            return p ? <Badge className={potentielColors[p] || 'bg-gray-100 text-gray-800'}>{p}</Badge> : null
        }
    },
    {
        accessorKey: "probabilite", header: "Probabilité", cell: ({ row }) => {
            const prob = row.original.probabilite
            if (!prob) return null
            return <div className="flex items-center gap-2 min-w-[80px]"><Progress value={prob} className="h-2" /><span className="text-xs text-gray-500">{prob}%</span></div>
        }
    },
    { id: "actions", cell: ({ row }) => <ProspectActionCell p={row.original} /> },
]

export default function ProspectsPage() {
    const { tiers } = useTiersStore()
    const prospects = tiers.filter((t): t is TiersProspect => t.type === 'prospect')
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Prospects</h2>
                    <p className="text-sm text-gray-500">Gérez vos prospects et leur progression.</p>
                </div>
                <CreateTierDialog type="prospect" label="Nouveau Prospect" />
            </div>
            <TiersDataTable columns={columns} data={prospects} searchKey="name" searchPlaceholder="Rechercher par nom..." />
        </div>
    )
}
