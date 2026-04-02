import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Radio, Megaphone, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type BroadcastMessage = {
  id: string;
  title: string;
  body: string | null;
  priority: string;
  created_at: string;
  channel?: { name: string; audience_role: string } | null;
};

const BroadcastsPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const { data: msgs } = await supabase
        .from("broadcast_messages")
        .select("id, title, body, priority, created_at, channel_id")
        .order("created_at", { ascending: false })
        .limit(50);

      if (msgs) {
        // Get channel info
        const channelIds = [...new Set(msgs.map((m: any) => m.channel_id))];
        const { data: channels } = await supabase
          .from("broadcast_channels")
          .select("id, name, audience_role")
          .in("id", channelIds);

        const enriched = msgs.map((m: any) => ({
          ...m,
          channel: (channels ?? []).find((c: any) => c.id === m.channel_id),
        }));
        setMessages(enriched);
      }
      setLoading(false);
    };

    fetch();

    // Realtime
    const channel = supabase
      .channel("broadcasts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "broadcast_messages" },
        () => { fetch(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const priorityColor: Record<string, string> = {
    normal: "bg-secondary text-muted-foreground",
    urgent: "bg-warning/15 text-warning border-warning/20",
    critical: "bg-destructive/15 text-destructive border-destructive/20",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" />
          Broadcasts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform announcements and alerts
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Megaphone className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No broadcasts yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="glass-card p-5 space-y-2 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={priorityColor[msg.priority] || priorityColor.normal}>
                  {msg.priority}
                </Badge>
                {msg.channel && (
                  <Badge variant="outline" className="text-[10px]">
                    {msg.channel.name}
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 ml-auto">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>
              <h3 className="font-semibold text-foreground">{msg.title}</h3>
              {msg.body && (
                <p className="text-sm text-muted-foreground">{msg.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BroadcastsPage;
