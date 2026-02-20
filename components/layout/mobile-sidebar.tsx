"use client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { MainNav } from "./main-nav";

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger>
        <Menu className="h-6 w-6" />
      </SheetTrigger>
      <SheetContent side={"left"}>
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>
            <MainNav links={[]} />
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}