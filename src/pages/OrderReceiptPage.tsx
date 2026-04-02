import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Printer, CheckCircle, Package, Truck, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

type OrderData = {
  id: string;
  order_status: string;
  goods_total: number;
  merchant_delivery_fee: number;
  platform_delivery_fee: number;
  delivery_mode: string;
  delivery_address: string;
  pickup_address: string | null;
  merchant_order_reference: string | null;
  notes: string | null;
  urgency: string;
  required_vehicle: string | null;
  created_at: string;
  merchant: { name: string } | null;
  job: { title: string; postcode: string } | null;
  trade_company: { legal_name: string; trading_name: string | null } | null;
  items: { item_name: string; quantity: number; unit_price: number; unit: string | null }[];
};

const paidStatuses = ["confirmed", "ready_for_pickup", "collected", "delivered"];

const OrderReceiptPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !user) return;

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from("material_orders")
        .select(`
          id, order_status, goods_total, merchant_delivery_fee, platform_delivery_fee,
          delivery_mode, delivery_address, pickup_address, merchant_order_reference,
          notes, urgency, required_vehicle, created_at,
          merchants(name),
          jobs(title, postcode),
          trade_companies(legal_name, trading_name),
          order_items(item_name, quantity, unit_price, unit)
        `)
        .eq("id", orderId)
        .single();

      if (error) {
        console.error("Receipt fetch error:", error);
      } else if (data) {
        setOrder({
          ...data,
          merchant: data.merchants as any,
          job: data.jobs as any,
          trade_company: data.trade_companies as any,
          items: (data.order_items as any[]) ?? [],
        } as any);
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderId, user]);

  const verificationUrl = `${window.location.origin}/verify-order/${orderId}`;
  const isPaid = order ? paidStatuses.includes(order.order_status) : false;
  const grandTotal = order
    ? order.goods_total + order.merchant_delivery_fee + order.platform_delivery_fee
    : 0;

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="glass-card p-8 h-96 animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <Package className="h-12 w-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">Order not found or you don't have access.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">Collection Receipt</h1>
          <p className="text-sm text-muted-foreground">
            Show this to the merchant when collecting
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1 print:hidden">
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
      </div>

      {/* Receipt card */}
      <div className="glass-card p-6 space-y-6 print:shadow-none print:border print:border-gray-300">
        {/* Status banner */}
        <div className={`flex items-center gap-3 p-4 rounded-lg ${isPaid ? "bg-success/10 border border-success/20" : "bg-warning/10 border border-warning/20"}`}>
          <CheckCircle className={`h-6 w-6 ${isPaid ? "text-success" : "text-warning"}`} />
          <div>
            <div className={`font-semibold ${isPaid ? "text-success" : "text-warning"}`}>
              {isPaid ? "Payment Confirmed" : "Payment Pending"}
            </div>
            <div className="text-xs text-muted-foreground">
              {isPaid ? "Goods are ready for collection" : "Awaiting payment confirmation"}
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-3 py-4">
          <QRCodeSVG
            value={verificationUrl}
            size={180}
            level="M"
            includeMargin
            className="rounded-lg"
          />
          <p className="text-[11px] text-muted-foreground text-center max-w-[200px]">
            Merchant: scan to verify payment status
          </p>
        </div>

        {/* Order reference */}
        <div className="text-center space-y-1 border-y border-border py-4">
          <div className="text-xs text-muted-foreground uppercase tracking-widest">Order Reference</div>
          <div className="font-mono text-lg font-bold tracking-wider text-foreground">
            {order.merchant_order_reference || order.id.slice(0, 12).toUpperCase()}
          </div>
          <div className="text-xs text-muted-foreground">
            ID: {order.id.slice(0, 8)}
          </div>
        </div>

        {/* Order details */}
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">{(order.merchant as any)?.name ?? "Merchant"}</div>
              {order.job && <div className="text-muted-foreground">Job: {(order.job as any).title}</div>}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              {order.pickup_address && (
                <div className="text-muted-foreground">Pickup: {order.pickup_address}</div>
              )}
              <div className="text-muted-foreground">Deliver to: {order.delivery_address}</div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-muted-foreground">
              Ordered: {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Truck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[10px]">
                {order.delivery_mode.replace(/_/g, " ")}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {order.urgency}
              </Badge>
            </div>
          </div>
        </div>

        {/* Line items */}
        {order.items.length > 0 && (
          <div className="border-t border-border pt-4 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</div>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.quantity}x {item.item_name}
                  {item.unit ? ` (${item.unit})` : ""}
                </span>
                <span className="font-medium">£{(item.quantity * item.unit_price).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-border pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Goods</span>
            <span>£{order.goods_total.toFixed(2)}</span>
          </div>
          {order.merchant_delivery_fee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Merchant delivery</span>
              <span>£{order.merchant_delivery_fee.toFixed(2)}</span>
            </div>
          )}
          {order.platform_delivery_fee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform delivery</span>
              <span>£{order.platform_delivery_fee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
            <span>Total</span>
            <span className="text-primary">£{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-muted-foreground pt-2 border-t border-border">
          TradeFlow Platform • Verified Digital Receipt
        </div>
      </div>
    </div>
  );
};

export default OrderReceiptPage;
