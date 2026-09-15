import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { humanise } from '@/features/projects/catalog';
export default function WorkActivity({workId}:{workId:string}) {
  const {user}=useAuth();
  const [open,setOpen]=useState(false);
  const {data=[],error,isLoading,refetch}=useQuery({
    queryKey:['sub-activity',user?.id,workId],
    enabled:open&&!!user,
    refetchInterval:open?30000:false,
    queryFn:async()=>{
      const {data,error}=await supabase.from('subcontract_activity')
        .select('id,event_type,status,progress,note,created_at')
        .eq('work_order_id',workId).order('created_at',{ascending:false})
        .order('id',{ascending:false}).limit(50);
      if(error)throw error;return data;
    }
  });
  return <section className="border-t pt-4">
    <Button type="button" variant="outline" aria-expanded={open} aria-controls={`activity-${workId}`} onClick={()=>setOpen(!open)}>{open?'Hide activity':'View activity history'}</Button>
    {open&&<div id={`activity-${workId}`} className="mt-4 space-y-3">
      {error?<div role="alert"><p className="text-sm">Activity could not be loaded.</p><Button type="button" variant="ghost" onClick={()=>void refetch()}>Retry</Button></div>:isLoading?<p role="status">Loading activity…</p>:!data.length?<p className="text-sm text-muted-foreground">No activity recorded yet. History starts when this feature is enabled.</p>:<ol className="space-y-4">{data.map(event=><li key={event.id} className="border-l-2 border-primary/30 pl-4 text-sm">
        <p className="font-medium capitalize">{humanise(event.event_type)}</p>
        <time dateTime={event.created_at} className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString('en-GB')}</time>
        <p className="text-xs text-muted-foreground">{humanise(event.status)} · {event.progress}%</p>
        {event.note&&<p className="mt-1 whitespace-pre-wrap break-words">{event.note}</p>}
      </li>)}</ol>}
      <p className="text-xs text-muted-foreground">Latest 50 events. Activity records cannot be edited here.</p>
    </div>}
  </section>;
}
