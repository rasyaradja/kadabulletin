import { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SecretNote } from './SecretNote';
import { CreateNoteModal } from './CreateNoteModal';
import { ReplyModal } from './ReplyModal';
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

export function SecretBoard() {
	const [notes, setNotes] = useState<Note[]>([]);
	const [processedNotes, setProcessedNotes] = useState<Note[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [replyingTo, setReplyingTo] = useState<string | undefined>();
	const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
	const [selectedNoteForReplies, setSelectedNoteForReplies] = useState<
		string | null
	>(null);
	const [sessionId] = useState(() => {
		const stored = localStorage.getItem('secretboard_session');
		if (stored) return stored;
		const newSession = crypto.randomUUID();
		localStorage.setItem('secretboard_session', newSession);
		return newSession;
	});
	const { toast } = useToast();

	const fetchNotes = useCallback(async () => {
		try {
			const { data: notesData, error: notesError } = await (
				supabase as any
			)
				.from('notes')
				.select('*')
				.order('created_at', { ascending: false });
			if (notesError) throw notesError;
			setNotes(notesData || []);
		} catch (error) {
			console.error('Error fetching notes:', error);
			toast({
				title: 'Error',
				description: 'Failed to load notes. Please refresh the page.',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	}, [toast]);

	useEffect(() => {
		fetchNotes();
		const channel = supabase
			.channel('notes-changes')
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'notes' },
				fetchNotes
			)
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [fetchNotes]);

	useEffect(() => {
		const notesById = new Map<string, Note>(
			notes.map((note) => [note.id, { ...note, replies: [] }])
		);
		for (const note of notes) {
			if (note.reply_to && notesById.has(note.reply_to)) {
				const parentNote = notesById.get(note.reply_to);
				if (parentNote) {
					parentNote.replies = parentNote.replies || [];
					parentNote.replies.push(note);
				}
			}
		}
		let currentProcessedNotes = Array.from(notesById.values()).filter(
			(note) => !note.reply_to
		);
		currentProcessedNotes.sort(
			(a, b) =>
				new Date(b.created_at).getTime() -
				new Date(a.created_at).getTime()
		);
		currentProcessedNotes.forEach((note) => {
			if (note.replies) {
				note.replies.sort(
					(a, b) =>
						new Date(a.created_at).getTime() -
						new Date(b.created_at).getTime()
				);
			}
		});
		if (searchQuery.trim()) {
			currentProcessedNotes = currentProcessedNotes.filter(
				(note) =>
					note.recipient
						?.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					note.short_id
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					note.message
						.toLowerCase()
						.includes(searchQuery.toLowerCase())
			);
		}
		setProcessedNotes(currentProcessedNotes);
	}, [notes, searchQuery]);

	const handleReply = (noteId: string) => {
		setReplyingTo(noteId);
		setIsCreateModalOpen(true);
	};
	const handleViewReplies = (noteId: string) => {
		setSelectedNoteForReplies(noteId);
		setIsReplyModalOpen(true);
	};
	const handleCreateNote = () => {
		setReplyingTo(undefined);
		setIsCreateModalOpen(true);
	};
	const handleNoteCreated = () => fetchNotes();
	const handleNoteDeleted = () => fetchNotes();

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-100 dark:bg-geminiDark flex items-center justify-center">
				<div className="text-lg text-gray-600 dark:text-gray-400">
					Loading KADA board...
				</div>
			</div>
		);
	}

	return (
		// Wall Background
		<div className="min-h-screen bg-geminiDark flex justify-center items-center p-6 sm:p-10">
			{/* Wooden Frame */}
			<div className="relative w-full max-w-7xl bg-cork-frame bg-wood-texture bg-gradient-to-br from-cork-frameLight to-cork-frame p-4 rounded-xl shadow-2xl border-4 border-solid border-cork-frameDark">
				{/* Inner shadow for frame depth */}
				<div className="shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] rounded-lg">
					{/* Realistic Cork Board */}
					<div className="relative w-full h-full bg-cork-board bg-cork-texture bg-cover bg-center rounded-md min-h-[80vh] overflow-hidden">
						{/* Header (Navbar) */}
						<div className="relative z-10 bg-black/30 backdrop-blur-sm border-b border-white/20 px-8 py-6">
							<div className="max-w-7xl mx-auto flex items-center justify-between gap-6 flex-wrap">
								<h1
									className="text-3xl font-bold text-gray-100"
									style={{
										textShadow:
											'1px 1px 3px rgba(0,0,0,0.5)',
									}}
								>
									KADA'S Bulletin Board
								</h1>

								<div className="flex-1 max-w-md min-w-[250px]">
									<div className="relative">
										<Search
											className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300"
											size={18}
										/>
										<Input
											placeholder="Search board..."
											value={searchQuery}
											onChange={(e) =>
												setSearchQuery(e.target.value)
											}
											className="pl-12 bg-black/40 text-gray-100 border-white/30 placeholder:text-gray-400 h-12 rounded-lg"
										/>
									</div>
								</div>

								<Button
									onClick={handleCreateNote}
									className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-md h-12 px-6 rounded-lg"
								>
									<Plus className="mr-2" size={18} />
									New Note
								</Button>
							</div>
						</div>

						{/* Notes Grid */}
						<div className="relative z-0 max-w-7xl mx-auto p-8 sm:p-14">
							{processedNotes.length === 0 ? (
								<div className="text-center py-20">
									<p className="text-slate-700 font-semibold text-xl mb-6">
										{searchQuery
											? 'No notes found matching your search.'
											: 'The board is empty.'}
									</p>
									{!searchQuery && (
										<Button
											onClick={handleCreateNote}
											variant="outline"
											className="bg-white/50 border-slate-600 text-slate-800 h-12 px-6 rounded-lg"
										>
											<Plus className="mr-2" size={18} />
											Be the first to post a note
										</Button>
									)}
								</div>
							) : (
								// 👇 This is the section that has been changed to a Flexbox grid
								<div className="flex flex-wrap -mx-4">
									{processedNotes.map((note, index) => (
										<div
											key={note.id}
											className="w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 px-4 mb-8"
										>
											<SecretNote
												note={note}
												postNumber={
													processedNotes.length -
													index
												}
												onReply={handleReply}
												onDelete={handleNoteDeleted}
												currentSessionId={sessionId}
												onViewReplies={
													handleViewReplies
												}
												image_url={note.image_url}
											/>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Modals remain outside the flow */}
						<CreateNoteModal
							isOpen={isCreateModalOpen}
							onClose={() => setIsCreateModalOpen(false)}
							onNoteCreated={handleNoteCreated}
							replyingTo={replyingTo}
							sessionId={sessionId}
						/>
						<ReplyModal
							isOpen={isReplyModalOpen}
							onClose={() => setIsReplyModalOpen(false)}
							parentNoteId={selectedNoteForReplies}
							currentSessionId={sessionId}
							onNoteDeleted={handleNoteDeleted}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
