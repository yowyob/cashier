"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '@/types/core';
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/lib/api';
import { useCompose } from '@/hooks/use-compose-store';
import { ProductForm } from '@/components/products/product-form';
import { ProductListView } from '@/components/products/product-list-view';
import { ProductDetailView } from '@/components/products/product-detail-view';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const { onOpen, onClose } = useCompose();

  const fetchAndSetProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
      if (selectedProductId && !data.some(p => p.id === selectedProductId)) {
        setSelectedProductId(null);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    fetchAndSetProducts();
  }, [fetchAndSetProducts]);

  const handleSave = async (data: Product) => {
    const isNew = !data.id;
    try {
      if (isNew) {
        await createProduct(data);
        onClose();
      } else {
        await updateProduct(data.id, data);
      }
      await fetchAndSetProducts();
    } catch (error) {
      console.error("Failed to save product", error);
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      await fetchAndSetProducts();
      if (selectedProductId === productToDelete.id) {
        setSelectedProductId(null);
      }
    } catch (error) {
      console.error("Failed to delete product :", error);
    } finally {
      setProductToDelete(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) {
      try {
        await deleteProduct(id);
        handleBackToList();
        await fetchAndSetProducts();
      } catch (error) {
        console.error("Failed to delete product:", error);
      }
    }
  };

  const handleOpenCompose = () => {
    onOpen({
      title: "Nouvel Article",
      content: <ProductForm onSave={handleSave} initialData={null} />
    });
  };

  const handleBackToList = () => {
    setSelectedProductId(null);
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  if (selectedProductId && selectedProduct) {
    return (
      <ProductDetailView
        product={selectedProduct}
        onSave={handleSave}
        onDelete={handleDelete}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <>
      <ProductListView
        products={products}
        isLoading={isLoading}
        onSelectProduct={setSelectedProductId}
        onEditProduct={setSelectedProductId}
        onDeleteProduct={setProductToDelete}
        onAddNew={handleOpenCompose}
        onRefresh={fetchAndSetProducts}
      />
      {productToDelete && (
        <ConfirmationDialog
          isOpen={!!productToDelete}
          onClose={() => setProductToDelete(null)}
          onConfirm={confirmDelete}
          title={`Supprimer ${productToDelete?.name} ?`}
          description="Cette action est irréversible. Toutes les données associées à ce client seront perdues."
        />)}
    </>
  );
}