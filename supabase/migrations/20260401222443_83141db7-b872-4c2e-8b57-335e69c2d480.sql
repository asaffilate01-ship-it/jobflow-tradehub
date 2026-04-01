
-- Messages table for in-app chat
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "users view own messages"
ON public.messages FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send messages
CREATE POLICY "users send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Recipients can mark messages as read
CREATE POLICY "recipients update read status"
ON public.messages FOR UPDATE TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Index for fast lookups
CREATE INDEX idx_messages_job_id ON public.messages(job_id);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id, read_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
