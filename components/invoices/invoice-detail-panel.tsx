import { Invoice, OrderItem, Payment } from "@/types/sales";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileText, HandCoins, Ban, Printer } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface InvoiceDetailPanelProps {
  invoice: Invoice;
  onPrint: () => void;
}

export function InvoiceDetailPanel({ invoice, onPrint }: InvoiceDetailPanelProps) {
  const paymentForm = useForm<{ date: Date, amount: number, method: string }>({ defaultValues: { date: new Date(), amount: invoice.balanceDue, method: "Espèce" } });
  const cancelForm = useForm<{ reason: string }>();

  const itemColumns: ColumnDef<OrderItem>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Libellé", cell: ({ row }) => <div className="w-[200px] truncate">{row.original.name}</div> },
    { accessorKey: "quantity", header: "Qté" },
    { accessorKey: "unitPrice", header: "P.U." },
    { accessorKey: "total", header: "Total" },
  ];

  const paymentColumns: ColumnDef<Payment>[] = [
    { accessorKey: "date", header: "Date", cell: ({ row }) => format(row.original.date, "dd/MM/yyyy") },
    { accessorKey: "amount", header: "Montant", cell: ({ row }) => row.original.amount.toLocaleString() },
    { accessorKey: "method", header: "Méthode" },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row flex-shrink-0 justify-between items-start mb-2">
        <div>
          <CardTitle>Facture N° {invoice.invoiceNumber}</CardTitle>
          <CardDescription>
            Client: {invoice.client.name} - Date: {format(new Date(invoice.orderDate), "dd MMMM yyyy")}
          </CardDescription>
        </div>
        <div className="flex justify-end no-print">
          <Button variant="outline" onClick={onPrint}><Printer className="mr-2 h-4 w-4" />Imprimer la facture</Button>
        </div>
      </CardHeader>
      <div className="flex-shrink-0 grid grid-cols-4 gap-2 px-4">
        <StatCard title="Total HT" value={invoice.totalHT.toLocaleString()} />
        <StatCard title="Total TVA" value={invoice.totalTVA.toLocaleString()} />
        <StatCard title="Total TTC" value={invoice.totalTTC.toLocaleString()} />
        <StatCard title="Solde Dû" value={invoice.balanceDue.toLocaleString()} variant={invoice.balanceDue > 0 ? "destructive" : "default"} />
      </div>
      <Tabs defaultValue="details" className="flex-grow flex flex-col min-h-0">
        <TabsList className="mx-6 flex-shrink-0">
          <TabsTrigger value="details"><FileText className="mr-2 h-4 w-4" />Détails</TabsTrigger>
          <TabsTrigger value="payment" disabled={invoice.status === "A" || invoice.status === "P"}><HandCoins className="mr-2 h-4 w-4" />Règlement</TabsTrigger>
          <TabsTrigger value="cancel" disabled={invoice.status === "A"}><Ban className="mr-2 h-4 w-4" />Annulation</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="flex-grow p-6 pt-4 flex flex-col gap-4 overflow-y-auto">
          <div className="flex-grow min-h-0">
            <DataTable columns={itemColumns} data={invoice.items} />
          </div>
        </TabsContent>

        <TabsContent value="payment" className="flex-grow p-6 pt-4 flex flex-col gap-4 overflow-y-auto">
          <div className="flex-shrink-0 grid grid-cols-3 gap-4">
            <StatCard title="Total Facturé" value={invoice.totalTTC.toLocaleString()} />
            <StatCard title="Déjà Payé" value={invoice.totalPaid.toLocaleString()} />
            <StatCard title="Solde Restant" value={invoice.balanceDue.toLocaleString()} variant="destructive" />
          </div>
          {invoice.payments.length > 0 && <div className="flex-shrink-0"><DataTable columns={paymentColumns} data={invoice.payments} /></div>}
          <Separator className="flex-shrink-0" />
          <Form {...paymentForm}>
            <form className="flex-shrink-0 space-y-4">
              <CardTitle className="text-lg">Nouveau règlement</CardTitle>
              <div className="grid grid-cols-3 gap-4">
                <FormField name="amount" render={({ field }) => (<FormItem><FormLabel>Montant</FormLabel><Input type="number" {...field} /></FormItem>)} />
                <FormField name="method" render={({ field }) => (<FormItem><FormLabel>Méthode</FormLabel><Select onValueChange={field.onChange} defaultValue="Espèce"><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Espèce">Espèce</SelectItem><SelectItem value="Chèque">Chèque</SelectItem><SelectItem value="Virement">Virement</SelectItem></SelectContent></Select></FormItem>)} />
                <FormField name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className="font-normal text-left"><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "dd MMM yyyy") : <span>Choisir</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover></FormItem>)} />
              </div>
              <div className="flex justify-end pt-2">
                <Button>Enregistrer le paiement</Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="cancel" className="p-6 pt-4">
          <Form {...cancelForm}>
            <form className="space-y-4">
              <CardTitle className="text-destructive">Annuler la facture</CardTitle>
              <CardDescription className="text-destructive">Cette action est irréversible. La facture sera marquée comme annulée.</CardDescription>
              <FormField name="reason" render={({ field }) => (<FormItem><FormLabel>Motif (obligatoire)</FormLabel><Textarea {...field} rows={4} /></FormItem>)} />
              <div className="flex justify-end pt-2">
                <Button variant="destructive">Confirmer l'annulation</Button>
              </div>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </Card>
  );
}