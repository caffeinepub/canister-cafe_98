import { useGetAnalyticsData, useIsCallerAdmin } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Users, TrendingUp, BarChart3, Activity, Package } from 'lucide-react';
import { formatTimestamp } from '../lib/utils';

export default function AnalyticsPage() {
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: analyticsData, isLoading: analyticsLoading } = useGetAnalyticsData();

  if (adminLoading || analyticsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view analytics. This page is only accessible to administrators.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>No Analytics Data</CardTitle>
            <CardDescription>Analytics data is not available at this time.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Calculate page traffic metrics
  const pageTrafficMap = new Map<string, number>();
  analyticsData.pageTraffic.forEach((traffic) => {
    const pageKey = Object.keys(traffic.pageType)[0];
    const currentCount = pageTrafficMap.get(pageKey) || 0;
    pageTrafficMap.set(pageKey, currentCount + Number(traffic.visitCount));
  });

  const pageNames: Record<string, string> = {
    discover: 'Discover',
    profile: 'Profile',
    messages: 'Messages',
    search: 'Search',
    notifications: 'Notifications',
  };

  // Get recent profile creations (last 10)
  const recentProfileCreations = analyticsData.profileCreations
    .slice(-10)
    .reverse()
    .map((timestamp) => formatTimestamp(timestamp));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Platform insights and user engagement metrics
          </p>
        </div>

        {/* Summary Metrics - Three Key Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Profiles */}
          <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {Number(analyticsData.totalProfiles)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Registered users on the platform
              </p>
            </CardContent>
          </Card>

          {/* Total Page Visits */}
          <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total Page Visits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {Number(analyticsData.totalPageVisits)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sum of all recorded visits across pages
              </p>
            </CardContent>
          </Card>

          {/* Total Apps Shared */}
          <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Apps Shared
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {Number(analyticsData.totalAppsShared)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                App showcases posted on the platform
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Page Traffic Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Page Traffic Breakdown
            </CardTitle>
            <CardDescription>
              Visit counts per main page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(pageTrafficMap.entries()).map(([pageKey, count]) => {
                const totalVisits = Number(analyticsData.totalPageVisits);
                const percentage = totalVisits > 0 ? (count / totalVisits) * 100 : 0;

                return (
                  <div key={pageKey} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{pageNames[pageKey] || pageKey}</span>
                      <span className="text-muted-foreground">
                        {count} visits ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {pageTrafficMap.size === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No page traffic data available yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Profile Creations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Profile Creations
            </CardTitle>
            <CardDescription>
              Last 10 profile creation timestamps
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentProfileCreations.length > 0 ? (
              <div className="space-y-2">
                {recentProfileCreations.map((timestamp, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="text-sm font-medium">Profile #{analyticsData.profileCreations.length - index}</span>
                    <span className="text-sm text-muted-foreground">{timestamp}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No profile creations recorded yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Page Visit Timeline (Recent 20) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Page Visits
            </CardTitle>
            <CardDescription>
              Last 20 page visit events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData.pageTraffic.length > 0 ? (
              <div className="space-y-2">
                {analyticsData.pageTraffic
                  .slice(-20)
                  .reverse()
                  .map((traffic, index) => {
                    const pageKey = Object.keys(traffic.pageType)[0];
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <span className="text-sm font-medium">{pageNames[pageKey] || pageKey}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(traffic.timestamp)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No page visits recorded yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
