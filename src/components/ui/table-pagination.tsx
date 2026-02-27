"use client";

type TablePaginationProps = {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
};

export function TablePagination({ page, totalPages, onPageChange, className }: TablePaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className={`flex items-center justify-between border-t bg-muted/20 px-4 py-3 text-sm ${className || ""}`}>
            <span className="text-muted-foreground">Page {page} / {totalPages}</span>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center justify-center rounded-md border px-3 py-1 text-xs disabled:opacity-50"
                >
                    Prev
                </button>
                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center justify-center rounded-md border px-3 py-1 text-xs disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
