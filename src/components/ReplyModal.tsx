import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SecretNote } from './SecretNote';

interface Note {
  id: string;
  short_id: string;
  message: string;
  color: string;
  recipient: string;
  from_sender?: string;
  	replying_to_id?: string;
  
  created_at: string;
  session_id: string;
  
}

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentNoteId: string | null;
  currentSessionId: string;
  onNoteDeleted: () => void;
}

export function ReplyModal({
  isOpen,
  onClose,
  parentNoteId,
  currentSessionId,
  onNoteDeleted,
}: ReplyModalProps) {
  const [replies, setReplies] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReplies = useCallback(async () => {
    if (!parentNoteId) {
      setReplies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: repliesData, error } = await (supabase as any)
        .from('notes')
        .select('*')
        				.eq('replying_to_id', parentNoteId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setReplies(repliesData || []);
    } catch (error) {
      console.error('Error fetching replies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load replies. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [parentNoteId, toast]);

  useEffect(() => {
    fetchReplies();

    const channel = supabase
      .channel(`replies-for-${parentNoteId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `replying_to_id=eq.${parentNoteId}` },
        () => fetchReplies()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReplies, parentNoteId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-xl sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-8 flex flex-col">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl">Replies to Note</DialogTitle>
          <DialogDescription>
            All replies to the selected note.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="text-center py-10">Loading replies...</div>
        ) : replies.length === 0 ? (
          <div className="text-center py-10 text-gray-600">No replies yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {replies.map((replyNote, index) => (
              <SecretNote
                key={replyNote.id}
                note={replyNote}
                postNumber={index + 1}
                onReply={() => { /* Replies of replies not supported in this modal */ } }
                onDelete={onNoteDeleted}
                currentSessionId={currentSessionId}
                onViewReplies={() => { /* Replies of replies not supported in this modal */ } }
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
