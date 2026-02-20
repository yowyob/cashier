"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Product } from "@/types/core";
import { Search, Plus, ShoppingBasket, Archive, Banknote, History } from "lucide-react";
import { ProductForm } from "./product-form";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/lib/api";
import { Skeleton } from "../ui/skeleton";

const PricingInfoView = ({ product }: { product: Product }) => (
    <div className="p-6"><h3 className="text-lg font-semibold mb-4 text-gray-900">Informations Prix</h3><p className="text-gray-600">Détails des prix pour {product.name}</p></div>
);
const StockInfoView = ({ product }: { product: Product }) => (
    <div className="p-6"><h3 className="text-lg font-semibold mb-4 text-gray-900">Informations Stock</h3><p className="text-gray-600">Détails du stock pour {product.name}</p></div>
);
const MovementHistoryView = ({ product }: { product: Product }) => (
    <div className="p-6"><h3 className="text-lg font-semibold mb-4 text-gray-900">Historique Mouvements</h3><p className="text-gray-600">Historique des mouvements de stock pour {product.name}</p></div>
);

export function ProductManagementView() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [activeView, setActiveView] = useState('profile');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAndSetProducts = async () => {
        setIsLoading(true);
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (error) {
            console.error("Failed to fetch products:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAndSetProducts();
    }, []);

    const filteredProducts = useMemo(() =>
        products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.code.toLowerCase().includes(searchTerm.toLowerCase())
        ), [products, searchTerm]
    );

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setIsCreating(false);
        setActiveView('profile');
    };

    const handleAddNew = () => {
        setIsCreating(true);
        setSelectedProduct(null);
        setActiveView('profile');
    };

    const handleCancelAction = () => {
        setIsCreating(false);
        if (products.length > 0) {
            setSelectedProduct(products[0]);
        }
    };

    const handleSaveProduct = async (data: Product) => {
        try {
            if (data.id) {
                await updateProduct(data.id, data);
            } else {
                await createProduct(data);
            }
            await fetchAndSetProducts();
            setIsCreating(false);
        } catch (error) {
            console.error("Failed to save product:", error);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) {
            try {
                await deleteProduct(id);
                await fetchAndSetProducts();
                setSelectedProduct(null);
            } catch (error) {
                console.error("Failed to delete product:", error);
            }
        }
    };

    const menuItems = [
        { id: 'profile', label: 'Profil Article', icon: ShoppingBasket },
        { id: 'pricing', label: 'Infos Prix', icon: Banknote },
        { id: 'stock', label: 'Infos Stock', icon: Archive },
        { id: 'history', label: 'Historique Mvt.', icon: History },
    ];

    const currentView = () => {
        if (isCreating) return <ProductForm initialData={null} onSave={handleSaveProduct} />;
        if (selectedProduct) {
            switch (activeView) {
                case 'profile': return <ProductForm initialData={selectedProduct} onSave={handleSaveProduct} />;
                case 'pricing': return <PricingInfoView product={selectedProduct} />;
                case 'stock': return <StockInfoView product={selectedProduct} />;
                case 'history': return <MovementHistoryView product={selectedProduct} />;
                default: return null;
            }
        }
        return (
            <div className="h-full flex items-center justify-center"><div className="text-center">
                <ShoppingBasket className="mx-auto h-12 w-12 text-gray-400 mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">Aucun article sélectionné</h3>
                <p className="text-gray-600">Sélectionnez un article dans la liste pour voir ses détails</p>
            </div></div>
        );
    }

    return (
        <div className="h-screen bg-gray-50 flex">
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <button onClick={handleAddNew} className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium">
                        <Plus size={18} /><span>Nouvel Article</span>
                    </button>
                </div>
                <nav className="flex-1 p-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeView === item.id;
                        const isDisabled = !selectedProduct && !isCreating;
                        return (
                            <button key={item.id} onClick={() => !isDisabled && setActiveView(item.id)} disabled={isDisabled} className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center space-x-3 transition-colors mb-1 ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : isDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}>
                                <Icon size={18} /><span className="font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Rechercher un article..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 space-y-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                    ) : (
                        filteredProducts.map((product) => (
                            <div key={product.id} onClick={() => handleSelectProduct(product)} className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${selectedProduct?.id === product.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-medium text-gray-900 truncate pr-2">{product.name}</h3>
                                    {!product.isActive && (<span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">Inactif</span>)}
                                </div>
                                <p className="text-sm text-gray-600">{product.code}</p>
                                <p className="text-xs text-gray-500 mt-1">{product.family}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="flex-1 bg-white">
                {currentView()}
            </div>
        </div>
    );
}