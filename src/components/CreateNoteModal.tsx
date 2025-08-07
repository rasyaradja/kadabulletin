import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateNoteModalProps {
	isOpen: boolean;
	onClose: () => void;
	onNoteCreated: () => void;
	replyingTo?: string;
	sessionId: string;
}

const noteColors = [
	{ name: 'Orange', value: '#FFDDC1', class: 'bg-note-orange' },
	{ name: 'Yellow', value: '#FFD3A5', class: 'bg-note-yellow' },
	{ name: 'Blue', value: '#C7CEEA', class: 'bg-note-blue' },
	{ name: 'Green', value: '#A8E6CF', class: 'bg-note-green' },
	{ name: 'Pink', value: '#FFAAA5', class: 'bg-note-pink' },
	{ name: 'Purple', value: '#E6B3FF', class: 'bg-note-purple' },
];

export function CreateNoteModal({
	isOpen,
	onClose,
	onNoteCreated,
	replyingTo,
	sessionId,
}: CreateNoteModalProps) {
	const [recipient, setRecipient] = useState('');
	const [from_sender, setFromSender] = useState('');
	const [message, setMessage] = useState('');
	const [selectedColor, setSelectedColor] = useState(noteColors[0].value);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!message.trim()) {
			toast({
				title: 'Error',
				description: 'Please enter a message.',
				variant: 'destructive',
			});
			return;
		}

		setIsSubmitting(true);
		try {
			let imageUrl: string | null = null;

			if (imageFile) {
				const fileExt = imageFile.name.split('.').pop();
				const fileName = `${sessionId}-${Date.now()}.${fileExt}`;
				const filePath = `public/${fileName}`;

				const { error: uploadError } = await supabase.storage
					.from('note-images')
					.upload(filePath, imageFile);

				if (uploadError) {
					throw uploadError;
				}

				const {
					data: { publicUrl },
				} = supabase.storage.from('note-images').getPublicUrl(filePath);

				imageUrl = publicUrl;
			}

			const noteData = {
				message: message.trim(),
				color: selectedColor,
				session_id: sessionId,
				...(recipient.trim() && { to_recipient: recipient.trim() }),
				...(from_sender.trim() && { from_sender: from_sender.trim() }),
				...(replyingTo && { replying_to_id: replyingTo }),
				...(imageUrl && { image_url: imageUrl }),
			};

			const { error } = await (supabase as any)
				.from('notes')
				.insert(noteData);

			if (error) throw error;

			toast({
				title: 'Note created!',
				description: 'Your secret note has been posted to the board.',
			});

			// Reset form
			setRecipient('');
			setFromSender('');
			setMessage('');
			setSelectedColor(noteColors[0].value);
			setImageFile(null);
			onNoteCreated();
			onClose();
		} catch (error) {
			console.error('Error creating note:', error);
			toast({
				title: 'Error',
				description: 'Failed to create note. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		setRecipient('');
		setFromSender('');
		setMessage('');
		setSelectedColor(noteColors[0].value);
		setImageFile(null);
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="w-full max-w-md sm:max-w-lg p-8 flex flex-col max-h-[90vh] overflow-y-auto">
				<DialogHeader className="mb-6">
					<DialogTitle className="text-2xl">
						{replyingTo ? `Reply to Note` : 'Create Secret Note'}
					</DialogTitle>
					<DialogDescription>
						Create a new secret note to share with the world.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col gap-6">
					<div>
						<Label htmlFor="recipient" className="mb-3 block">
							To (optional)
						</Label>
						<Input
							id="recipient"
							placeholder="Someone special..."
							value={recipient}
							onChange={(e) => setRecipient(e.target.value)}
							maxLength={50}
							className="h-12 rounded-lg"
						/>
					</div>

					<div>
						<Label htmlFor="from_sender" className="mb-3 block">
							From (optional)
						</Label>
						<Input
							id="from_sender"
							placeholder="A secret admirer..."
							value={from_sender}
							onChange={(e) => setFromSender(e.target.value)}
							maxLength={50}
							className="h-12 rounded-lg"
						/>
					</div>

					<div>
						<Label htmlFor="message" className="mb-3 block">
							Secret Message
						</Label>
						<Textarea
							id="message"
							placeholder="Share your secret thoughts..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
														maxLength={150}
							className="min-h-[160px] resize-none rounded-lg"
							required
						/>
						<div className="text-xs text-muted-foreground mt-3">
							{message.length}/150 characters
						</div>
					</div>

					<div>
						<Label htmlFor="image" className="mb-3 block">
							Image (optional)
						</Label>
						<Input
							id="image"
							type="file"
							accept="image/png, image/jpeg, image/gif"
							onChange={(e) =>
								setImageFile(
									e.target.files ? e.target.files[0] : null
								)
							}
							className="file:mr-4 file:py-3 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
						/>
					</div>

					<div>
						<Label className="mb-3 block">Note Color</Label>
						<div className="grid grid-cols-3 gap-4 mt-3">
							{noteColors.map((color) => (
								<button
									key={color.value}
									type="button"
									onClick={() =>
										setSelectedColor(color.value)
									}
									className={cn(
										'h-16 rounded-lg border-2 transition-all',
										color.class,
										selectedColor === color.value
											? 'border-primary ring-2 ring-primary/20'
											: 'border-border hover:border-primary/50'
									)}
									title={color.name}
								/>
							))}
						</div>
					</div>

					<div className="flex justify-end gap-4 pt-8">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isSubmitting}
							className="h-12 px-6 rounded-lg"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="h-12 px-6 rounded-lg"
						>
							{isSubmitting ? 'Posting...' : 'Post Note'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
