"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";

interface Document {
    id: string;
    file_path: string;
    file_name: string;
    file_type: string;
    upload_on: Date;
    uploader: {
        user_first_name: string;
    };
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchDocuments();
    }, []);

    async function fetchDocuments() {
        try {
            const response = await fetch("/api/admin/documents");
            if (response.ok) {
                const data = await response.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error("Failed to fetch documents:", error);
        } finally {
            setLoading(false);
        }
    }

    const filteredDocuments = documents.filter((doc) => {
        const text = `${doc.file_name} ${doc.file_type} ${doc.uploader.user_first_name}`.toLowerCase();
        const matchesSearch = !search || text.includes(search.toLowerCase());
        const matchesType = !typeFilter || doc.file_type.toLowerCase().includes(typeFilter.toLowerCase());
        return matchesSearch && matchesType;
    });

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
    const pagedDocuments = filteredDocuments.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => {
        setPage(1);
    }, [search, typeFilter]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
            </div>

            <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-2">Filters</h3>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-medium">
                        Search
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="File name, uploader..."
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Type
                        <input
                            type="text"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            placeholder="pdf, image..."
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                </div>
            </div>

            <div className="rounded-xl border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">File Name</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Uploaded By</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Upload Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedDocuments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No documents found
                                    </td>
                                </tr>
                            ) : (
                                pagedDocuments.map((doc) => (
                                    <tr key={doc.id} className="border-b hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">
                                            {doc.file_name}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {doc.file_type}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {doc.uploader.user_first_name}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {format(new Date(doc.upload_on), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <a
                                                href={doc.file_path}
                                                download
                                                className="inline-flex items-center gap-2 text-primary hover:underline"
                                            >
                                                <Download className="h-4 w-4" />
                                                Download
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
        </div>
    );
}
