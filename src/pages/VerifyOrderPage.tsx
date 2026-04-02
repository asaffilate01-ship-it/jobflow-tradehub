import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Package } from "lucide-react";
import { format } from "date-fns";

const paidStatuses = ["confirmed", "ready_for_pickup", "collected", "delivered"];

const statusDisplay: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: "Draft", color: "text-muted-foreground", icon: Clock },
  submitted: { label: "Submitted", color: "text-warning", icon: Clock },
  confirmed: { label: "Paid & Confirmed", color: "text-success", icon: CheckCircle },
  ready_for_pickup: { label: "Ready for Pickup", color: "text-success", icon: Package },
  collected: { label: "Collected", color: "text-info", icon: CheckCircle },
  delivered: { label: "Delivered", color: "text-success", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "text-destructive", icon: XCircle },
};

const VerifyOrderPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      // Use the secure RPC function that only returns safe fields
      const { data, error: err } = await supabase.rpc("verify_order_status", {
        order_id: orderId,
      });

      if (err || !data) {
        setError(true);
      } else {
        setOrder(data);
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6 space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mx-auto" />
          <div className="glass-card p-8 h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6 text-center space-y-4">
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Order Not Found</h1>
          <p className="text-muted-foreground text-sm">
            This order reference is invalid or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const isPaid = paidStatuses.includes(order.order_status);
  const sd = statusDisplay[order.order_status] || statusDisplay.draft;
  const StatusIcon = sd.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-lg font-bold tracking-tight">TradeFlow</h1>
          <p className="text-xs text-muted-foreground">Order Verification</p>
        </div>

        <div className="glass-card p-6 space-y-6">
          {/* Status */}
          <div className={`flex items-center gap-3 p-4 rounded-lg ${isPaid ? "bg-success/10 border border-success/20" : "bg-warning/10 border border-warning/20"}`}>
            <StatusIcon className={`h-8 w-8 ${sd.color}`} />
            <div>
              <div className={`font-bold text-lg ${sd.color}`}>{sd.label}</div>
              <div className="text-xs text-muted-foreground">
                {isPaid ? "Payment has been confirmed — release goods" : "Payment not yet confirmed"}
              </div>
            </div>
          </div>

          {/* Reference */}
          <div className="text-center space-y-1 border-y border-border py-4">
            <div className="text-xs text-muted-foreground uppercase tracking-widest">Reference</div>
            <div className="font-mono text-xl font-bold tracking-wider">
              {order.merchant_order_reference || order.id?.slice(0, 12).toUpperCase()}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>{order.merchant_name ?? "Unknown Merchant"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {order.created_at ? format(new Date(order.created_at), "dd MMM yyyy, HH:mm") : "—"}
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-border pt-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">£{Number(order.goods_total || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center">
            <Badge variant={isPaid ? "default" : "secondary"} className="text-xs">
              {isPaid ? "✓ Safe to release goods" : "⏳ Awaiting payment"}
            </Badge>
          </div>

          <div className="text-center text-[10px] text-muted-foreground pt-2">
            TradeFlow Platform • Verified at {format(new Date(), "HH:mm dd/MM/yyyy")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOrderPage;
