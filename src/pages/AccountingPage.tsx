import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Calculator, BookOpen, Receipt, Users, FileText,
  PoundSterling, TrendingUp, TrendingDown, Building2,
} from "lucide-react";
import { Link } from "react-router-dom";

type BusinessType = "self_employed" | "partnership" | "limited";

const AccountingPage = () => {
  const { user } = useAuth();
  const [businessType, setBusinessType] = useState<BusinessType>("self_employed");

  const { data: tradeCompany } = useQuery({
    queryKey: ["my-trade-company", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trade_companies")
        .select("*")
        .eq("owner_profile_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: glEntries } = useQuery({
    queryKey: ["gl-entries", tradeCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gl_entries")
        .select("*, gl_lines(*)")
        .eq("trade_company_id", tradeCompany!.id)
        .order("entry_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tradeCompany?.id,
  });

  const { data: invoices } = useQuery({
    queryKey: ["customer-invoices", tradeCompany?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_invoices")
        .select("*")
        .eq("trade_company_id", tradeCompany!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!tradeCompany?.id,
  });

  const { data: subInvoices } = useQuery({
    queryKey: ["sub-invoices", tradeCompany?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subcontractor_invoices")
        .select("*, subcontractors(full_name, company_name)")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!tradeCompany?.id,
  });

  const totalIncome = invoices?.reduce((s, i) => s + Number(i.total_amount), 0) ?? 0;
  const totalVat = invoices?.reduce((s, i) => s + Number(i.vat_amount), 0) ?? 0;
  const totalSubCosts = subInvoices?.reduce((s, i) => s + Number(i.gross_amount ?? 0), 0) ?? 0;
  const totalCisDeductions = subInvoices?.reduce((s, i) => s + Number(i.cis_deduction_amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground">Manage your books, tax obligations & payroll.</p>
        </div>
        <Select value={businessType} onValueChange={(v) => setBusinessType(v as BusinessType)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="self_employed">Self-Employed</SelectItem>
            <SelectItem value="partnership">Partnership</SelectItem>
            <SelectItem value="limited">Limited Company</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <div className="text-xl font-bold">£{totalIncome.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total Income</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <TrendingDown className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <div className="text-xl font-bold">£{totalSubCosts.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Subcontractor Costs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Receipt className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <div className="text-xl font-bold">£{totalVat.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">VAT Collected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Calculator className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <div className="text-xl font-bold">£{totalCisDeductions.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">CIS Deductions</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bookkeeping" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bookkeeping" className="gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bookkeeping</span>
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-1">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tax</span>
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Payroll</span>
          </TabsTrigger>
          <TabsTrigger value="cis" className="gap-1">
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CIS</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookkeeping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General Ledger Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {(!glEntries || glEntries.length === 0) ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No journal entries yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Lines</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {glEntries.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground">{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{entry.entry_type}</Badge></TableCell>
                        <TableCell className="font-medium">{entry.description}</TableCell>
                        <TableCell className="text-right">{entry.gl_lines?.length ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {(!invoices || invoices.length === 0) ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No invoices yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(inv.issue_date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">£{Number(inv.total_amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Tax Overview — {businessType === "self_employed" ? "Self Assessment" : businessType === "partnership" ? "Partnership Return" : "Corporation Tax"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <h3 className="font-semibold mb-2">Business Type: {businessType === "self_employed" ? "Self-Employed (Sole Trader)" : businessType === "partnership" ? "Partnership" : "Limited Company"}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Turnover:</span>
                    <span className="ml-2 font-semibold">£{totalIncome.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expenses:</span>
                    <span className="ml-2 font-semibold">£{totalSubCosts.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Net Profit:</span>
                    <span className="ml-2 font-semibold text-emerald-600">£{(totalIncome - totalSubCosts).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">VAT Liability:</span>
                    <span className="ml-2 font-semibold">£{totalVat.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {businessType === "self_employed" && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Self Assessment tax return (SA100) due 31 January</p>
                  <p>• Payment on account instalments: 31 January & 31 July</p>
                  <p>• Class 2 & 4 National Insurance calculated on profits</p>
                </div>
              )}
              {businessType === "partnership" && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Partnership return (SA800) due 31 January</p>
                  <p>• Each partner files individual SA100 with their share</p>
                  <p>• Profit sharing ratios set in partnership agreement</p>
                </div>
              )}
              {businessType === "limited" && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Corporation Tax return (CT600) due 12 months after period end</p>
                  <p>• Corporation Tax rate: 25% (over £250k) / 19% (under £50k)</p>
                  <p>• Annual accounts filed at Companies House</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Payroll Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage employee payroll, PAYE calculations, National Insurance, pension contributions and payslips.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3 text-center">
                  <PoundSterling className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <div className="text-sm font-semibold">PAYE</div>
                  <div className="text-xs text-muted-foreground">Tax calculations</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <div className="text-sm font-semibold">NI</div>
                  <div className="text-xs text-muted-foreground">National Insurance</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <Calculator className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <div className="text-sm font-semibold">Pension</div>
                  <div className="text-xs text-muted-foreground">Auto-enrolment</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <div className="text-sm font-semibold">Payslips</div>
                  <div className="text-xs text-muted-foreground">Digital delivery</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Full payroll runs, employee management and RTI submissions are available in your operations dashboard.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Construction Industry Scheme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage CIS deductions, verify subcontractors, and file monthly returns to HMRC.
              </p>

              {subInvoices && subInvoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subcontractor</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Labour</TableHead>
                      <TableHead>CIS Deducted</TableHead>
                      <TableHead>Net Payable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subInvoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          {inv.subcontractors?.company_name || inv.subcontractors?.full_name || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{inv.invoice_reference}</TableCell>
                        <TableCell>£{Number(inv.labour_amount).toFixed(2)}</TableCell>
                        <TableCell className="text-red-500">-£{Number(inv.cis_deduction_amount).toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">£{Number(inv.net_payable).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No CIS invoices yet.</p>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Standard deduction rate: 20% on labour element</p>
                <p>• Higher deduction rate: 30% for unverified subcontractors</p>
                <p>• Monthly returns due by 19th of following tax month</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountingPage;
