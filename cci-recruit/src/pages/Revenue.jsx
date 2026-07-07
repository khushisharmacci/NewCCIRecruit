import { useState } from "react";
import { can } from "@/lib/roles";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatINR, formatINRLabel } from "@/utils/currency";
import ExportButton from "@/components/ExportButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, DollarSign, Pencil, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const COLORS = ["hsl(224,76%,48%)", "hsl(160,60%,45%)", "hsl(38,92%,50%)", "hsl(280,65%,60%)", "hsl(340,75%,55%)"];
const types = ["Placement Fee", "Retainer", "Contract", "Consulting", "Other"];
const statuses = ["Pending", "Received", "Overdue"];
const statusColor = { Pending: "bg-amber-500/15 text-amber-300", Received: "bg-emerald-500/15 text-emerald-300", Overdue: "bg-red-500/15 text-red-300" };

export default function Revenue() {
  const { user } = useAuth();
  console.log("REVENUE USER", user);
  console.log("ROLE", user?.role);
  console.log("CAN VIEW REVENUE", can.viewRevenue(user));
  const queryClient = useQueryClient();
  const companyId = "default";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ client_name: "", amount: "", date: "", recruiter_name: "", candidate_name: "", type: "Placement Fee", status: "Pending", invoice_number: "" });

  const { data: revenue = [], isLoading } = useQuery({
  queryKey: ["revenue"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("revenue_records")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;

    return data || [];
  },
});

  const createMutation = useMutation({
    mutationFn: async (data) => {
  const { error } = await supabase
    .from("revenue_records")
    .insert([data]);

  if (error) throw error;
},
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["revenue"] });setDialogOpen(false);}
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
  const { error } = await supabase
    .from("revenue_records")
    .update(data)
    .eq("id", id);

  if (error) throw error;
},
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ["revenue"] });setDialogOpen(false);setEditItem(null);}
  });
  const deleteMutation = useMutation({
  mutationFn: async (id) => {
    const { error } = await supabase
      .from("revenue_records")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["revenue"] });
    setDeleteId(null);
  }
});
console.log("REVENUE PAGE USER", user);
console.log("REVENUE PAGE ROLE", user?.role);
console.log("CAN VIEW REVENUE", can.viewRevenue(user));
  if (!can.viewRevenue(user)) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      Revenue data is only accessible to authorized users.
    </div>
  );
}

  const totalRevenue = revenue.reduce((s, r) => s + (r.amount || 0), 0);
  const receivedRevenue = revenue.filter((r) => r.status === "Received").reduce((s, r) => s + (r.amount || 0), 0);

  const byClient = revenue.reduce((acc, r) => {const k = r.client_name || "Unknown";acc[k] = (acc[k] || 0) + (r.amount || 0);return acc;}, {});
  const clientData = Object.entries(byClient).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const openCreate = () => {setEditItem(null);setForm({ client_name: "", amount: "", date: "", recruiter_name: "", candidate_name: "", type: "Placement Fee", status: "Pending", invoice_number: "" });setDialogOpen(true);};
  const openEdit = (r) => {setEditItem(r);setForm({ client_name: r.client_name || "", amount: r.amount || "", date: r.date ? r.date.split("T")[0] : "", recruiter_name: r.recruiter_name || "", candidate_name: r.candidate_name || "", type: r.type || "Placement Fee", status: r.status || "Pending", invoice_number: r.invoice_number || "" });setDialogOpen(true);};

  const handleSave = (e) => {
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount) };
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload });else
    createMutation.mutate(payload);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Revenue</h1><p className="text-muted-foreground text-sm">Track your recruitment revenue</p></div>
        <div className="flex gap-2">
          <ExportButton
            data={revenue}
            filename="revenue-report"
            title="Revenue Report"
            columns={[
            { key: "client_name", label: "Client" },
            { key: "type", label: "Type" },
            { key: "amount", label: "Amount (₹)", accessor: (r) => r.amount?.toLocaleString("en-IN") },
            { key: "date", label: "Date", accessor: (r) => r.date?.split("T")[0] || "" },
            { key: "status", label: "Status" },
            { key: "recruiter_name", label: "Recruiter" }]
            } />
          
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Revenue</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-3xl font-bold text-foreground mt-1">{formatINRLabel(totalRevenue)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Received</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{formatINRLabel(receivedRevenue)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-3xl font-bold text-amber-400 mt-1">{formatINRLabel(totalRevenue - receivedRevenue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Revenue by Client</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={clientData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,28%,28%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Revenue by Type</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={types.map((t) => ({ name: t, value: revenue.filter((r) => r.type === t).reduce((s, r) => s + (r.amount || 0), 0) })).filter((d) => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                {types.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatINR(v)} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {isLoading ?
      <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div> :

      <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {revenue.map((r) =>
              <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{r.client_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{r.type}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">{formatINR(r.amount || 0)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{r.date ? format(new Date(r.date), "MMM d, yyyy") : "—"}</td>
                    <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusColor[r.status])}>{r.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        </div>
      }

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Revenue" : "Add Revenue"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Client Name *</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} required /></div>
              <div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Recruiter</Label><Input value={form.recruiter_name} onChange={(e) => setForm({ ...form, recruiter_name: e.target.value })} /></div>
              <div><Label>Candidate</Label><Input value={form.candidate_name} onChange={(e) => setForm({ ...form, candidate_name: e.target.value })} /></div>
              <div><Label>Invoice #</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Revenue Record</AlertDialogTitle><AlertDialogDescription>This will permanently remove this record.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}