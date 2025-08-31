import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/layout/Navigation';
import { Upload, Download, FileText, Calendar, User } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  description: string;
  file_url: string;
  uploaded_at: string;
  author_id: string;
  profiles?: {
    full_name: string;
    role: string;
  };
}

export default function Notes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      // First fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (notesError) throw notesError;

      if (notesData && notesData.length > 0) {
        // Get unique author IDs
        const authorIds = [...new Set(notesData.map(note => note.author_id))];
        
        // Fetch profiles for these authors
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', authorIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Combine data
        const notesWithProfiles = notesData.map(note => ({
          ...note,
          profiles: profilesData?.find(profile => profile.id === note.author_id) || {
            full_name: 'Unknown User',
            role: 'student'
          }
        }));

        setNotes(notesWithProfiles);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setUploading(true);
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('notes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('notes')
        .getPublicUrl(filePath);

      // Save note to database
      const { error: dbError } = await supabase
        .from('notes')
        .insert({
          title,
          description,
          file_url: publicUrl,
          author_id: user.id,
          is_public: true
        });

      if (dbError) throw dbError;

      toast({
        title: "Success!",
        description: "Your note has been uploaded successfully.",
      });

      // Reset form and refresh notes
      setTitle('');
      setDescription('');
      setFile(null);
      setIsDialogOpen(false);
      fetchNotes();
    } catch (error: any) {
      console.error('Error uploading note:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notes Library</h1>
            <p className="text-muted-foreground mt-2">
              Discover and share study materials with your peers
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Upload Note</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload a Note</DialogTitle>
                <DialogDescription>
                  Share your study materials with fellow students
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter note title..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the note..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Supported formats: PDF, Word, Text, Images
                  </p>
                </div>
                <Button type="submit" disabled={uploading} className="w-full">
                  {uploading ? "Uploading..." : "Upload Note"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {notes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No notes yet</h3>
              <p className="text-muted-foreground">
                Be the first to share your study materials with the community!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note) => (
              <Card key={note.id} className="hover:shadow-campus transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{note.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {note.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{note.profiles?.full_name || 'Unknown'}</span>
                      <Badge variant="secondary" className="text-xs">
                        {note.profiles?.role || 'student'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(note.uploaded_at).toLocaleDateString()}</span>
                    </div>
                    <Button
                      onClick={() => downloadFile(note.file_url, note.title)}
                      className="w-full flex items-center space-x-2"
                      variant="outline"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}