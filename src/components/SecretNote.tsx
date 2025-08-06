import { useState } from 'react';
import { Heart, Reply, Trash2, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Note {
	id: string;
	short_id: string;
	message: string;
	color: string;
	recipient: string;
	from_sender?: string;
	reply_to?: string;
	created_at: string;
	session_id: string;
	replies?: Note[];
	image_url?: string;
}

interface SecretNoteProps {
	note: Note;
	postNumber: number;
	onReply: (noteId: string) => void;
	onDelete: () => void;
	currentSessionId: string;
	onViewReplies: (noteId: string) => void;
	image_url?: string;
}

const getNoteColorClass = (color: string) => {
	const colorMap: { [key: string]: string } = {
		'#FFDDC1': 'bg-note-orange',
		'#FFD3A5': 'bg-note-yellow',
		'#FD9853': 'bg-note-orange',
		'#F8B500': 'bg-note-yellow',
		'#C7CEEA': 'bg-note-blue',
		'#A8E6CF': 'bg-note-green',
		'#FFAAA5': 'bg-note-pink',
		'#E6B3FF': 'bg-note-purple',
	};
	return colorMap[color] || 'bg-note-yellow';
};

export function SecretNote({
	note,
	postNumber,
	onReply,
	onDelete,
	currentSessionId,
	onViewReplies,
	image_url,
}: SecretNoteProps) {
	const [isDeleting, setIsDeleting] = useState(false);
	const [isReporting, setIsReporting] = useState(false);
	const { toast } = useToast();

	const isOwnNote = note.session_id === currentSessionId;

	const handleDelete = async () => {
		if (!isOwnNote) return;

		setIsDeleting(true);
		try {
			const { error } = await (supabase as any)
				.from('notes')
				.delete()
				.eq('id', note.id)
				.eq('session_id', currentSessionId);

			if (error) throw error;

			onDelete();
			toast({
				title: 'Note deleted',
				description: 'Your secret note has been removed.',
			});
		} catch (error) {
			console.error('Error deleting note:', error);
			toast({
				title: 'Error',
				description: 'Failed to delete note. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsDeleting(false);
		}
	};

	const handleReport = async () => {
		setIsReporting(true);
		try {
			const { error } = await (supabase as any).from('reports').insert({
				note_id: note.id,
				session_id: currentSessionId,
			});

			if (error) throw error;

			toast({
				title: 'Note reported',
				description: 'Thank you for reporting inappropriate content.',
			});
		} catch (error) {
			console.error('Error reporting note:', error);
			toast({
				title: 'Error',
				description: 'Failed to report note. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsReporting(false);
		}
	};

	return (
		<div
			className={cn(
				'relative p-7 rounded-lg shadow-lg transform rotate-1 hover:rotate-0 transition-all duration-300 cursor-pointer group',
				'border-l-4 border-t border-r border-b border-opacity-20 border-gray-600',
				'min-h-[220px] max-w-[300px] break-words',
				getNoteColorClass(note.color)
			)}
			style={{ transform: `rotate(${Math.random() * 6 - 3}deg)` }}
		>
			{/* Pin */}
			<div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-cork-pin rounded-full shadow-md"></div>

			{/* Post Number */}
			<div className="text-xs font-mono text-gray-600 mb-3">
				Post #{postNumber}
			</div>

			{/* Recipient */}
			{note.recipient && (
				<div className="text-sm font-semibold text-gray-700 mb-3">
					To: {note.recipient}
				</div>
			)}

			{/* Sender */}
			{note.from_sender && (
				<div className="text-sm font-semibold text-gray-700 mb-3">
					From: {note.from_sender}
				</div>
			)}

			{/* Image */}
			{note.image_url && (
				<div className="bg-white p-2 shadow-md my-4 transform -rotate-2">
					<img
						src={image_url}
						alt="Note image"
						className="w-full h-auto"
					/>
				</div>
			)}

			{/* Message */}
			<p className="text-gray-800 text-sm leading-relaxed mb-4 font-handwriting">
				{note.message}
			</p>

			{/* Reply indicator */}
			{note.reply_to && (
				<div className="text-xs text-gray-500 mb-3 italic">
					↳ Reply to Note
				</div>
			)}

			{/* Actions */}
			<div className="flex items-center justify-between pt-4 border-t border-gray-300 border-opacity-30 mt-auto">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onReply(note.id)}
						className="h-8 px-2 hover:bg-black/10"
					>
						<Reply size={14} />
					</Button>
				</div>

				<div className="flex items-center gap-1">
					{note.replies && note.replies.length > 0 && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onViewReplies(note.id)}
							className="h-8 px-2 hover:bg-black/10"
						>
							View Replies ({note.replies.length})
						</Button>
					)}

					

					{!isOwnNote && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleReport}
							disabled={isReporting}
							className="h-8 px-2 hover:bg-orange-500/20 text-orange-600"
						>
							<Flag size={14} />
						</Button>
					)}
				</div>
			</div>

			{/* Timestamp */}
			<div className="text-xs text-gray-500 mt-2">
				{new Date(note.created_at).toLocaleDateString()}
			</div>
		</div>
	);
}
