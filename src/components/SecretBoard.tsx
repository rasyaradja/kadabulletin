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
	replying_to_id?: string;
	created_at: string;
	session_id: string;

	image_url?: string;
	replies_count?: number;
}

export function SecretBoard() {
	const NOTES_PER_PAGE = 8;
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
	const [currentPage, setCurrentPage] = useState(0);
	const [totalNotesCount, setTotalNotesCount] = useState(0);
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
			const from = currentPage * NOTES_PER_PAGE;
			const to = from + NOTES_PER_PAGE - 1;

			const {
				data: notesData,
				error: notesError,
				count,
			} = await (supabase as any)
				.from('notes')
				.select('*', { count: 'exact' })
				.is('replying_to_id', null)
				.order('created_at', { ascending: false })
				.range(from, to);

			if (notesError) throw notesError;

			const notesWithReplyCounts = await Promise.all(
				(notesData || []).map(async (note: Note) => {
					const { data: replyCountData, error: replyCountError } =
						await (supabase as any).rpc('get_note_replies_count', {
							note_id: note.id,
						});

					if (replyCountError) {
						console.error(
							`Error fetching reply count for note ${note.id}:`,
							replyCountError
						);
						return { ...note, replies_count: 0 };
					}
					return { ...note, replies_count: replyCountData };
				})
			);

			setNotes(notesWithReplyCounts);
			setTotalNotesCount(count || 0);
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
	}, [currentPage, toast]);

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
			notes.map((note) => [note.id, { ...note }])
		);
		let currentProcessedNotes = Array.from(notesById.values()).filter(
			(note) => !note.replying_to_id
		);
		currentProcessedNotes.sort(
			(a, b) =>
				new Date(b.created_at).getTime() -
				new Date(a.created_at).getTime()
		);
		currentProcessedNotes.forEach((note) => {
			// Replies are now fetched directly by ReplyModal, no need to sort here
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
			<div className="relative w-full max-w-5xl bg-cork-frame bg-wood-texture bg-gradient-to-br from-cork-frameLight to-cork-frame p-4 rounded-xl shadow-2xl border-4 border-solid border-cork-frameDark">
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
									KADA's Bulletin Board
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
													totalNotesCount -
													(currentPage *
														NOTES_PER_PAGE +
														index)
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

						{/* Pagination Controls */}
						{processedNotes.length > 0 && (
							<div className="flex justify-center gap-4 mt-8">
								<Button
									onClick={() =>
										setCurrentPage((prev) =>
											Math.max(0, prev - 1)
										)
									}
									disabled={currentPage === 0}
									className="bg-blue-600 hover:bg-blue-700 text-white shadow-md h-12 px-6 rounded-lg"
								>
									Previous Page
								</Button>
								<Button
									onClick={() =>
										setCurrentPage((prev) => prev + 1)
									}
									disabled={
										currentPage * NOTES_PER_PAGE +
											processedNotes.length >=
										totalNotesCount
									}
									className="bg-blue-600 hover:bg-blue-700 text-white shadow-md h-12 px-6 rounded-lg"
								>
									Next Page
								</Button>
							</div>
						)}

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
