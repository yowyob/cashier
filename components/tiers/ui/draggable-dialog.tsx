"use client"

import { useRef, useState, useCallback } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DraggableDialogProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    width?: string
}

export function TiersDraggableDialog({ isOpen, onClose, title, children, width = "w-[600px]" }: DraggableDialogProps) {
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const dragStart = useRef<{ x: number; y: number } | null>(null)

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true)
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    }, [position])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !dragStart.current) return
        setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
    }, [isDragging])

    const handleMouseUp = useCallback(() => setIsDragging(false), [])

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
            {/* Dialog */}
            <div
                className={cn(
                    "fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden",
                    width,
                    "max-h-[85vh]"
                )}
                style={{
                    bottom: `${Math.max(20, 20 - position.y)}px`,
                    right: `${Math.max(20, 20 - position.x)}px`,
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    cursor: isDragging ? 'grabbing' : 'default'
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200 cursor-grab active:cursor-grabbing flex-shrink-0"
                    onMouseDown={handleMouseDown}
                >
                    <span className="text-sm font-semibold text-gray-800">{title}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                {/* Content */}
                <div className="overflow-y-auto flex-1 p-4">
                    {children}
                </div>
            </div>
        </>
    )
}
