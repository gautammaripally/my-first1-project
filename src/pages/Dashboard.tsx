import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Megaphone, 
  Users, 
  Upload,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import Navigation from '@/components/layout/Navigation';

export default function Dashboard() {
  const quickActions = [
    {
      title: 'Upload Notes',
      description: 'Share your study materials with fellow students',
      icon: Upload,
      href: '/notes',
      color: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    {
      title: 'Browse Notes',
      description: 'Discover notes shared by other students',
      icon: BookOpen,
      href: '/notes',
      color: 'bg-green-50 text-green-600 border-green-200'
    },
    {
      title: 'Post Update',
      description: 'Share important college announcements',
      icon: TrendingUp,
      href: '/updates',
      color: 'bg-purple-50 text-purple-600 border-purple-200'
    },
  ];

  const features = [
    {
      title: 'Notes Library',
      description: 'Access and share study materials with your peers',
      icon: FileText,
      href: '/notes'
    },
    {
      title: 'College Updates',
      description: 'Stay informed about campus news and announcements',
      icon: Megaphone,
      href: '/updates'
    },
    {
      title: 'People Directory',
      description: 'Connect with students and teachers in your network',
      icon: Users,
      href: '/people'
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-hero rounded-lg p-8 mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to Campus Notes Hub
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Your central platform for sharing knowledge, staying updated, and connecting with your campus community
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <Link key={action.title} to={action.href}>
                <Card className="hover:shadow-campus transition-shadow cursor-pointer h-full">
                  <CardHeader className="text-center">
                    <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center mx-auto mb-4`}>
                      <action.icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline">
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Features Overview */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Explore Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Link key={feature.title} to={feature.href}>
                <Card className="hover:shadow-campus transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="mt-2">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}