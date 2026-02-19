"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TiersClient } from "@/types/tiers"
import { MoreHorizontal, ArrowUpDown, Eye, Ban, CheckCircle, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTiersStore } from "@/lib/tiers/store"

const ActionCell = ({ client }: { client: TiersClient }) => {
    const { updateTier, openScheduler } = useTiersStore()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={`/tiers/clients/${client.id}`} className="flex items-center cursor-pointer">
                        <Eye className="mr-2 h-4 w-4" /> Voir détails
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openScheduler(client.id)} className="text-blue-600">
                    <Calendar className="mr-2 h-4 w-4" /> Planifier action
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {client.active ? (
                    <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => updateTier(client.id, { active: false })}>
                        <Ban className="mr-2 h-4 w-4" /> Désactiver
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem className="text-green-600 cursor-pointer" onClick={() => updateTier(client.id, { active: true })}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Activer
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

const segmentColors: Record<string, string> = {
    ENTREPRISE: 'bg-blue-100 text-blue-800',
    REVENDEUR: 'bg-purple-100 text-purple-800',
    PARTICULIER: 'bg-gray-100 text-gray-800',
}

export const clientColumns: ColumnDef<TiersClient>[] = [
    {
        accessorKey: "name",
        id: "name",
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Client <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const client = row.original
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-800 font-semibold text-sm">{client.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <Link href={`/tiers/clients/${client.id}`} className="font-medium hover:text-blue-600 hover:underline text-sm">{client.name}</Link>
                        {!client.active && <Badge variant="destructive" className="w-fit text-[10px] h-4 px-1">Inactif</Badge>}
                    </div>
                </div>
            )
        },
    },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phoneNumber", header: "Téléphone" },
    { accessorKey: "city", header: "Ville" },
    {
        accessorKey: "segment",
        header: "Segment",
        cell: ({ row }) => {
            const seg = row.original.segment
            if (!seg) return null
            return <Badge className={segmentColors[seg] || 'bg-gray-100 text-gray-800'}>{seg}</Badge>
        },
    },
    { id: "actions", cell: ({ row }) => <ActionCell client={row.original} /> },
]
