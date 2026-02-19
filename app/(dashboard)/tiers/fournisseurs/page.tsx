"use client"

import { useTiersStore } from "@/lib/tiers/store"
import { TiersDataTable } from "@/components/tiers/ui/data-table"
import { CreateTierDialog } from "@/components/tiers/forms/create-tier-dialog"
import { TiersFournisseur } from "@/types/tiers"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, Eye, Ban, CheckCircle, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function FournisseurActionCell({ f }: { f: TiersFournisseur }) {
    const { updateTier, openScheduler } = useTiersStore()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={`/tiers/fournisseurs/${f.id}`} className="flex items-center cursor-pointer">
                        <Eye className="mr-2 h-4 w-4" /> Voir détails
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openScheduler(f.id)} className="text-blue-600">
                    <Calendar className="mr-2 h-4 w-4" /> Planifier action
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {f.active ? (
                    <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => updateTier(f.id, { active: false })}>
                        <Ban className="mr-2 h-4 w-4" /> Désactiver
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem className="text-green-600 cursor-pointer" onClick={() => updateTier(f.id, { active: true })}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Activer
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

const columns: ColumnDef<TiersFournisseur>[] = [
    {
        accessorKey: "name", id: "name",
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Fournisseur <ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
        cell: ({ row }) => {
            const f = row.original
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-purple-100 text-purple-800 font-semibold text-sm">{f.name.charAt(0)}</AvatarFallback></Avatar>
                    <div>
                        <Link href={`/tiers/fournisseurs/${f.id}`} className="font-medium hover:text-blue-600 hover:underline text-sm">{f.name}</Link>
                        {!f.active && <Badge variant="destructive" className="w-fit text-[10px] h-4 px-1 ml-1">Inactif</Badge>}
                    </div>
                </div>
            )
        },
    },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phoneNumber", header: "Téléphone" },
    { accessorKey: "city", header: "Ville" },
    { accessorKey: "familleFournisseur", header: "Famille" },
    { id: "actions", cell: ({ row }) => <FournisseurActionCell f={row.original} /> },
]

export default function FournisseursPage() {
    const { tiers } = useTiersStore()
    const fournisseurs = tiers.filter((t): t is TiersFournisseur => t.type === 'fournisseur')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Fournisseurs</h2>
                    <p className="text-sm text-gray-500">Gérez votre base de fournisseurs.</p>
                </div>
                <CreateTierDialog type="fournisseur" label="Nouveau Fournisseur" />
            </div>
            <TiersDataTable columns={columns} data={fournisseurs} searchKey="name" searchPlaceholder="Rechercher par nom..." />
        </div>
    )
}
