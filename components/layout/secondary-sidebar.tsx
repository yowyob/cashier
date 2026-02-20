"use client";

import { MainNav } from "./main-nav";
import { cn } from "@/lib/utils";
import { useSecondarySidebar } from "@/hooks/useSidebar";
import { useNavigationStore } from "@/hooks/use-navigation-store";
import { modules } from "@/config/navigation";
import { Button } from "../ui/button";
import { PenSquare } from "lucide-react";
import { useCompose } from "@/hooks/use-compose-store";
import { CustomerForm } from "../customers/customer-form";
import { ProductForm } from "../products/product-form";
import { SupplierForm } from "../suppliers/supplier-form";

export function SecondarySidebar() {
  const { isCollapsed } = useSecondarySidebar();
  const { activeModule } = useNavigationStore();
  const { onOpen } = useCompose();

  const currentModuleData = modules[activeModule];

  const handleCompose = () => {
    switch (activeModule) {
      case 'ventes':
        onOpen({ title: 'Nouveau Client', content: <CustomerForm initialData={null} onSave={() => { }} onCancel={() => { }} /> });
        break;
      case 'stock':
        onOpen({ title: 'Nouvel Article', content: <ProductForm initialData={null} onSave={() => { }} /> });
        break;
      case 'personnel':
        console.log("Ouvrir dialogue nouvel utilisateur");
        break;
      default:
        console.log("Aucune action 'Nouveau' pour ce module.");
    }
  };

  if (isCollapsed) return null;

  return (
    <aside className="w-72 h-screen flex-shrink-0 bg-[#f6f8fc] flex flex-col pt-5 transition-all duration-300">
      <div className="px-4 mb-4">
        <Button onClick={handleCompose} className="w-full h-12 rounded-2xl bg-white hover:bg-gray-200/80 shadow-md text-gray-700 font-semibold border border-gray-200">
          <PenSquare className="mr-3 text-gray-600" />
          {currentModuleData.composeActionLabel}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        <MainNav links={currentModuleData.sidebarLinks} />
      </div>
    </aside>
  );
}