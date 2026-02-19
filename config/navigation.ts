import {
  ShoppingCart,
  Users,
  Truck,
  FileText,
  UserCog,
  Settings,
  LayoutDashboard,
  BookOpen,
  PackagePlus,
  PackageSearch,
  Warehouse,
  FileClock,
  ShieldCheck,
  History,
  PenSquare,
  ArrowRightLeft,
  Replace,
  Users2,
  Briefcase,
  UserPlus,
  CalendarCheck,
  BarChart2,
  ClipboardCheck,
} from "lucide-react";

export type SidebarLink = {
  title: string;
  label?: string;
  icon: React.ElementType;
  href: string;
};

export type Module = {
  name: string;
  icon: React.ElementType;
  composeActionLabel: string;
  sidebarLinks: SidebarLink[];
};

export const moduleKeys = ["ventes", "tiers", "stock", "personnel", "parametres"] as const;
export type ModuleKey = typeof moduleKeys[number];

export const modules: Record<ModuleKey, Module> = {
  tiers: {
    name: "Tiers",
    icon: Users2,
    composeActionLabel: "Nouveau Tiers",
    sidebarLinks: [
      { title: "Tableau de Bord", icon: LayoutDashboard, href: "/tiers" },
      { title: "Clients", icon: Users, href: "/tiers/clients" },
      { title: "Fournisseurs", icon: Truck, href: "/tiers/fournisseurs" },
      { title: "Commerciaux", icon: Briefcase, href: "/tiers/commerciaux" },
      { title: "Prospects", icon: UserPlus, href: "/tiers/prospects" },
      { title: "Actions", icon: CalendarCheck, href: "/tiers/actions" },
      { title: "Complétude Comptable", icon: ClipboardCheck, href: "/tiers/completude" },
      { title: "Statistiques", icon: BarChart2, href: "/tiers/stats" },
    ],
  },
  ventes: {
    name: "Ventes",
    icon: ShoppingCart,
    composeActionLabel: "Nouveau",
    sidebarLinks: [
      { title: "Tableau de Bord", icon: LayoutDashboard, href: "/dashboard" },
      { title: "Saisie Commande", icon: PenSquare, href: "/sales/new-order" },
      { title: "Journal Commandes", icon: BookOpen, href: "/sales/order-journal" },
      { title: "Factures", icon: FileText, href: "/invoices" },
      { title: "Clients", icon: Users, href: "/customers" },
      { title: "Fournisseurs", icon: Truck, href: "/suppliers" },
    ],
  },
  stock: {
    name: "Stock",
    icon: Warehouse,
    composeActionLabel: "Nouvel Article",
    sidebarLinks: [
      { title: "État des Stocks", icon: PackageSearch, href: "/stock/status" },
      { title: "Mouvements", icon: PackagePlus, href: "/stock/entries" },
      { title: "Transferts", icon: ArrowRightLeft, href: "/stock/transfer" },
      { title: "Transformations", icon: Replace, href: "/stock/transformation" },
      { title: "Journal Mouvements", icon: FileClock, href: "/stock/journal" },
      { title: "Inventaire", icon: BookOpen, href: "/stock/inventory" },
      { title: "Articles", icon: ShoppingCart, href: "/products" },
    ],
  },
  personnel: {
    name: "Personnel",
    icon: UserCog,
    composeActionLabel: "Nouvel Utilisateur",
    sidebarLinks: [
      { title: "Utilisateurs", icon: Users, href: "/settings/users" },
      { title: "Profils & Droits", icon: ShieldCheck, href: "/settings/roles" },
      { title: "Piste d'audit", icon: History, href: "/settings/audits" },
    ],
  },
  parametres: {
    name: "Paramètres",
    icon: Settings,
    composeActionLabel: "Ajouter",
    sidebarLinks: [
      { title: "Société", icon: Settings, href: "/settings/company" },
      { title: "Exercices", icon: BookOpen, href: "/settings/fiscal-years" },
    ],
  },
};