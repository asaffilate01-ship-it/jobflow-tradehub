import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageCircle, Send, ArrowLeft, User } from "lucide-react";

type Conversation = {
  job_id: string;
  other_id: string;
  other_name: string;
  job_title: string;
  last_message: string;
  last_at: string;
  unread: number;
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const MessagesPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<{ jobId: string; otherId: string; otherName: string; jobTitle: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, job_id, sender_id, recipient_id, body, created_at, read_at")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!data) { setLoading(false); return; }

      // Group by job + other user
      const convMap = new Map<string, { msgs: typeof data; otherId: string }>();
      for (const m of data) {
        const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        const key = `${m.job_id}__${otherId}`;
        if (!convMap.has(key)) convMap.set(key, { msgs: [], otherId });
        convMap.get(key)!.msgs.push(m);
      }

      // Fetch profile names + job titles
      const otherIds = [...new Set([...convMap.values()].map(c => c.otherId))];
      const jobIds = [...new Set(data.map(m => m.job_id))];

      const [profilesRes, jobsRes] = await Promise.all([
        otherIds.length ? supabase.from("profiles").select("id, full_name").in("id", otherIds) : { data: [] },
        jobIds.length ? supabase.from("jobs").select("id, title").in("id", jobIds) : { data: [] },
      ]);

      const nameMap = new Map((profilesRes.data ?? []).map(p => [p.id, p.full_name]));
      const jobMap = new Map((jobsRes.data ?? []).map(j => [j.id, j.title]));

      const convs: Conversation[] = [...convMap.entries()].map(([key, { msgs, otherId }]) => {
        const jobId = key.split("__")[0];
        const unread = msgs.filter(m => m.recipient_id === user.id && !m.read_at).length;
        return {
          job_id: jobId,
          other_id: otherId,
          other_name: nameMap.get(otherId) ?? "Unknown",
          job_title: jobMap.get(jobId) ?? "Job",
          last_message: msgs[0].body,
          last_at: msgs[0].created_at,
          unread,
        };
      });

      convs.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
      setConversations(convs);
      setLoading(false);
    };
    load();
  }, [user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selected || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at, read_at")
        .eq("job_id", selected.jobId)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${selected.otherId}),and(sender_id.eq.${selected.otherId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      setMessages((data as Message[]) ?? []);

      // Mark unread as read
      const unreadIds = (data ?? []).filter(m => m.sender_id !== user.id && !m.read_at).map(m => m.id);
      if (unreadIds.length) {
        await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
      }

      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };
    load();

    // Realtime
    const channel = supabase
      .channel(`messages-${selected.jobId}-${selected.otherId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `job_id=eq.${selected.jobId}`,
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === user.id || msg.sender_id === selected.otherId) {
          setMessages(prev => [...prev, msg]);
          if (msg.sender_id !== user.id) {
            supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", msg.id);
          }
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selected, user]);

  const sendMessage = async () => {
    if (!draft.trim() || !selected || !user) return;
    const body = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      job_id: selected.jobId,
      sender_id: user.id,
      recipient_id: selected.otherId,
      body,
    });
    if (error) toast.error(error.message);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        {[1, 2, 3].map(i => <div key={i} className="glass-card p-4 h-20 animate-pulse" />)}
      </div>
    );
  }

  // Chat view
  if (selected) {
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="font-semibold">{selected.otherName}</div>
            <div className="text-xs text-muted-foreground">{selected.jobTitle}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {messages.map(m => {
            const isMe = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  <p className="text-sm">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 pt-4 border-t border-border">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Type a message…"
            onKeyDown={e => e.key === "Enter" && sendMessage()}
          />
          <Button onClick={sendMessage} disabled={!draft.trim()} className="gap-1">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Conversation list
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Chat with customers and traders about jobs</p>
      </div>

      {conversations.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No messages yet</p>
          <p className="text-xs text-muted-foreground">Start a conversation from a job page</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(c => (
            <button
              key={`${c.job_id}-${c.other_id}`}
              onClick={() => setSelected({ jobId: c.job_id, otherId: c.other_id, otherName: c.other_name, jobTitle: c.job_title })}
              className="w-full glass-card p-4 flex items-center gap-4 hover:border-primary/20 transition-colors text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{c.other_name}</span>
                  {c.unread > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                      {c.unread}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{c.job_title}</div>
                <div className="text-sm text-muted-foreground truncate">{c.last_message}</div>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(c.last_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
