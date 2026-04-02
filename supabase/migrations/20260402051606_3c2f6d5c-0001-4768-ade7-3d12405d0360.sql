
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "System inserts notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_notifications_recipient ON public.notifications (recipient_id, read_at, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Broadcast channels
CREATE TABLE public.broadcast_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  audience_role text NOT NULL DEFAULT 'all',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels publicly readable"
  ON public.broadcast_channels FOR SELECT
  USING (true);

CREATE POLICY "Admins manage channels"
  ON public.broadcast_channels FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Broadcast messages
CREATE TABLE public.broadcast_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.broadcast_channels(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  priority text NOT NULL DEFAULT 'normal',
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read broadcasts"
  ON public.broadcast_messages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage broadcasts"
  ON public.broadcast_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_broadcast_messages_channel ON public.broadcast_messages (channel_id, created_at DESC);

-- Enable realtime on broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_messages;
