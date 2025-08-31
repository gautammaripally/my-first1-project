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
import { Plus, Calendar, User, Megaphone } from 'lucide-react';

interface Update {
  id: number;
  title: string;
  description: string;
  created_at: string;
  author_id: string;
  profiles?: {
    full_name: string;
    role: string;
  };
}

export default function Updates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      // First fetch updates
      const { data: updatesData, error: updatesError } = await supabase
        .from('updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;

      if (updatesData && updatesData.length > 0) {
        // Get unique author IDs
        const authorIds = [...new Set(updatesData.map(update => update.author_id))];
        
        // Fetch profiles for these authors
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', authorIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Combine data
        const updatesWithProfiles = updatesData.map(update => ({
          ...update,
          profiles: profilesData?.find(profile => profile.id === update.author_id) || {
            full_name: 'Unknown User',
            role: 'student'
          }
        }));

        setUpdates(updatesWithProfiles);
      } else {
        setUpdates([]);
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast({
        title: "Error",
        description: "Failed to load updates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from('updates')
        .insert({
          title,
          description,
          author_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your update has been posted successfully.",
      });

      // Reset form and refresh updates
      setTitle('');
      setDescription('');
      setIsDialogOpen(false);
      fetchUpdates();
    } catch (error: any) {
      console.error('Error posting update:', error);
      toast({
        title: "Post Failed",
        description: error.message || "Failed to post update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading updates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">College Updates</h1>
            <p className="text-muted-foreground mt-2">
              Stay informed about campus news and announcements
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Post Update</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post an Update</DialogTitle>
                <DialogDescription>
                  Share important information with the campus community
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePost} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter update title..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Share your update details..."
                    rows={4}
                    required
                  />
                </div>
                <Button type="submit" disabled={posting} className="w-full">
                  {posting ? "Posting..." : "Post Update"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {updates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No updates yet</h3>
              <p className="text-muted-foreground">
                Be the first to share important information with the campus community!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {updates.map((update) => (
              <Card key={update.id} className="hover:shadow-campus transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{update.title}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>{update.profiles?.full_name || 'Unknown'}</span>
                          <Badge variant="secondary" className="text-xs">
                            {update.profiles?.role || 'student'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(update.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Megaphone className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{update.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}