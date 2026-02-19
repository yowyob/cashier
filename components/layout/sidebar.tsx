"use client";

import { MainNav } from "./main-nav";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { useNavigationStore } from "@/hooks/use-navigation-store";
import { modules } from "@/config/navigation";
import { Button } from "../ui/button";
import { PenSquare, ShoppingCart, Warehouse, UserCog, Settings, Users2, Calendar } from "lucide-react";
import { Separator } from "../ui/separator";
import { useCompose } from "@/hooks/use-compose-store";
import { CustomerForm } from "../customers/customer-form";
import { ProductForm } from "../products/product-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useTiersStore } from "@/lib/tiers/store";

const moduleIcons = {
  ventes: ShoppingCart,
  tiers: Users2,
  stock: Warehouse,
  personnel: UserCog,
  parametres: Settings
};

export function Sidebar() {
  const { isCollapsed, toggle } = useSidebar();
  const { activeModule, setActiveModule } = useNavigationStore();
  const { onOpen } = useCompose();
  const { openScheduler } = useTiersStore();

  const currentModuleData = modules[activeModule];

  const handleCompose = () => {
    switch (activeModule) {
      case 'tiers':
        openScheduler();
        break;
      case 'ventes':
        onOpen({ title: 'Nouveau Client', content: <CustomerForm initialData={null} onSave={() => { }} /> });
        break;
      case 'stock':
        onOpen({ title: 'Nouvel Article', content: <ProductForm initialData={null} onSave={() => { }} /> });
        break;
      default:
        console.log("Aucune action 'Nouveau' pour ce module.");
    }
  };

  return (
    <aside
      className={cn(
        "h-screen bg-[#f6f8fc] flex transition-all duration-300 ",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      <div className="w-15 flex-shrink-0 flex flex-col items-center py-4 border-r bg-white">
        <TooltipProvider delayDuration={0}>
          {Object.entries(modules).map(([key, module]) => {
            const Icon = module.icon;
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeModule === key ? "secondary" : "ghost"}
                    size="icon"
                    className="h-12 w-12 flex-col gap-3 text-xs"
                    onClick={() => setActiveModule(key as any)}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{module.name}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </TooltipProvider>
      </div>

      {!isCollapsed && (
        <div className="flex-1 flex flex-col pt-5">
          <div className="px-4 mb-4">
            <Button onClick={handleCompose} className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg font-semibold">
              <PenSquare className="mr-3" />
              {currentModuleData.composeActionLabel}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            <MainNav links={currentModuleData.sidebarLinks} />
          </div>
        </div>
      )}
    </aside>
  );
}