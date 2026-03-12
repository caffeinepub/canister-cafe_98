import { Coffee, Users, Search, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import type { View } from '../App';

interface WelcomeScreenProps {
  onNavigate: (view: View) => void;
}

export default function WelcomeScreen({ onNavigate }: WelcomeScreenProps) {
  const { identity } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;
  const hasProfile = isAuthenticated && userProfile !== null;

  const handleGetStarted = () => {
    if (hasProfile) {
      onNavigate('discover');
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/assets/cccafe.jpeg" 
              alt="Canister Cafe Hero" 
              className="w-full max-w-3xl h-auto object-contain rounded-2xl shadow-2xl"
            />
          </div>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            A showcase for your caffeine powered web applications.
          </p>
          
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Share your applications built with Caffeine, discover amazing projects from the community, 
            and connect with fellow developers in our vibrant café-inspired platform.
          </p>

          {hasProfile ? (
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="gap-2 text-lg px-8 py-6"
            >
              Explore Apps
              <ArrowRight className="h-5 w-5" />
            </Button>
          ) : (
            <div className="text-muted-foreground">
              {isAuthenticated ? (
                <p>Complete your profile setup to get started</p>
              ) : (
                <p>Login to start exploring and sharing apps</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What You Can Do</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Coffee className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Showcase Your Apps</CardTitle>
                <CardDescription>
                  Share your Caffeine-powered applications with the community. 
                  Add descriptions, thumbnails, and live links to your projects.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Build Your Community</CardTitle>
                <CardDescription>
                  Follow other developers, engage with their work through likes and comments, 
                  and build meaningful connections in the Caffeine ecosystem.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Discover & Explore</CardTitle>
                <CardDescription>
                  Browse apps by category, search by hashtags, and discover innovative 
                  projects from developers around the world.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
