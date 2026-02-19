"use client"

import { useState } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { X } from "lucide-react"
import { Tier } from "@/types/tiers"
import { cn } from "@/lib/utils"

const typeColors: Record<string, string> = {
    client: 'bg-blue-100 text-blue-800',
    fournisseur: 'bg-purple-100 text-purple-800',
    commercial: 'bg-green-100 text-green-800',
    prospect: 'bg-orange-100 text-orange-800',
}

interface TierSearchProps {
    tiers: Tier[]
    selectedTierIds: string[]
    onSelectTiers: (ids: string[]) => void
    multiSelect?: boolean
}

export function TiersSearch({ tiers, selectedTierIds, onSelectTiers, multiSelect = true }: TierSearchProps) {
    const [isOpen, setIsOpen] = useState(false)

    const selectedTiers = tiers.filter(t => selectedTierIds.includes(t.id))

    const handleSelect = (tierId: string) => {
        if (multiSelect) {
            if (selectedTierIds.includes(tierId)) {
                onSelectTiers(selectedTierIds.filter(id => id !== tierId))
            } else {
                onSelectTiers([...selectedTierIds, tierId])
            }
        } else {
            onSelectTiers([tierId])
            setIsOpen(false)
        }
    }

    const handleRemove = (tierId: string) => {
        onSelectTiers(selectedTierIds.filter(id => id !== tierId))
    }

    return (
        <div className="relative">
            <div
                className={cn(
                    "min-h-10 border rounded-md p-2 cursor-pointer flex flex-wrap gap-1 items-center",
                    isOpen ? "ring-2 ring-blue-500 border-blue-300" : "hover:border-gray-400"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedTiers.length === 0 && (
                    <span className="text-sm text-gray-400 px-1">Sélectionner un tiers...</span>
                )}
                {selectedTiers.map(tier => (
                    <Badge
                        key={tier.id}
                        className={cn("gap-1 pr-1 text-xs", typeColors[tier.type])}
                        onClick={(e) => { e.stopPropagation(); handleRemove(tier.id); }}
                    >
                        <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[9px]">{tier.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {tier.name}
                        <X className="h-3 w-3 cursor-pointer" />
                    </Badge>
                ))}
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border rounded-md shadow-lg">
                    <Command>
                        <CommandInput placeholder="Rechercher un tiers..." className="h-9" autoFocus />
                        <CommandList className="max-h-48">
                            <CommandEmpty>Aucun tiers trouvé.</CommandEmpty>
                            <CommandGroup>
                                {tiers.map(tier => (
                                    <CommandItem
                                        key={tier.id}
                                        value={`${tier.name} ${tier.type} ${tier.id}`}
                                        onSelect={() => handleSelect(tier.id)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Avatar className="h-6 w-6">
                                                <AvatarFallback className="text-[11px] bg-blue-100 text-blue-800">{tier.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium text-sm truncate">{tier.name}</span>
                                                <span className="text-xs text-gray-400 ml-2">{tier.city}</span>
                                            </div>
                                            <Badge className={cn("text-[10px] shrink-0", typeColors[tier.type])}>
                                                {tier.type}
                                            </Badge>
                                            {selectedTierIds.includes(tier.id) && (
                                                <span className="text-blue-600 text-xs">✓</span>
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </div>
            )}
        </div>
    )
}
