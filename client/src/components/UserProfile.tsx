import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import type { User, Achievement, DifficultyLevel } from '../../../server/src/schema';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

interface AchievementStats {
  total: number;
  cookieTrifectas: number;
  byDifficulty: { [key in DifficultyLevel]: { count: number; avgTime: number; bestTime: number } };
}

export function UserProfile({ user, onLogout }: UserProfileProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [cookieTrifectaStatus, setCookieTrifectaStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load user achievements and stats
  useEffect(() => {
    if (isProfileOpen) {
      loadUserStats();
    }
  }, [isProfileOpen, user.id]);

  const loadUserStats = async () => {
    setIsLoading(true);
    try {
      // Load achievements
      const userAchievements = await trpc.getUserAchievements.query({ user_id: user.id });
      setAchievements(userAchievements);

      // Load cookie trifecta status
      const trifectaStatus = await trpc.getCookieTrifectaStatus.query(user.id);
      setCookieTrifectaStatus(trifectaStatus);

      // Calculate stats
      const calculatedStats: AchievementStats = {
        total: userAchievements.length,
        cookieTrifectas: userAchievements.filter(a => a.is_cookie_trifecta).length,
        byDifficulty: {
          Easy: { count: 0, avgTime: 0, bestTime: Infinity },
          Medium: { count: 0, avgTime: 0, bestTime: Infinity },
          Hard: { count: 0, avgTime: 0, bestTime: Infinity }
        }
      };

      // Calculate difficulty-specific stats
      (['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).forEach(difficulty => {
        const difficultyAchievements = userAchievements.filter(a => a.difficulty_level === difficulty);
        if (difficultyAchievements.length > 0) {
          calculatedStats.byDifficulty[difficulty].count = difficultyAchievements.length;
          calculatedStats.byDifficulty[difficulty].avgTime = 
            difficultyAchievements.reduce((sum, a) => sum + a.completion_time, 0) / difficultyAchievements.length;
          calculatedStats.byDifficulty[difficulty].bestTime = 
            Math.min(...difficultyAchievements.map(a => a.completion_time));
        }
      });

      setStats(calculatedStats);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyIcon = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case 'Easy': return '🟢';
      case 'Medium': return '🟡';
      case 'Hard': return '🔴';
      default: return '⚪';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google': return '🔴';
      case 'facebook': return '🔵';
      case 'email': return '📧';
      default: return '👤';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src="" alt={user.display_name} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                {getInitials(user.display_name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
            👤 Profile & Stats
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onLogout} className="text-red-600">
            🚪 Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src="" alt={user.display_name} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-lg">
                  {getInitials(user.display_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  {user.display_name}
                  {getProviderIcon(user.auth_provider)}
                </div>
                <div className="text-sm font-normal text-gray-600">{user.email}</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-lg">⏳ Loading stats...</div>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">📊 Overview</TabsTrigger>
                <TabsTrigger value="achievements">🏆 Achievements</TabsTrigger>
                <TabsTrigger value="trifecta">🍪 Cookie Trifecta</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">📈 Total Puzzles Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">
                        {stats?.total || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">🍪 Cookie Trifectas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-yellow-600">
                        {stats?.cookieTrifectas || 0}
                      </div>
                      <div className="text-sm text-gray-600">
                        Fast completions
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">📅 Member Since</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-semibold">
                        {new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          year: 'numeric'
                        }).format(user.created_at)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {stats && (
                  <Card>
                    <CardHeader>
                      <CardTitle>📊 Performance by Difficulty</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map(difficulty => {
                          const diffStats = stats.byDifficulty[difficulty];
                          const hasStats = diffStats.count > 0;

                          return (
                            <div key={difficulty} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{getDifficultyIcon(difficulty)}</span>
                                  <span className="font-medium">{difficulty}</span>
                                  <Badge className={getDifficultyColor(difficulty)}>
                                    {diffStats.count} completed
                                  </Badge>
                                </div>
                                {hasStats && (
                                  <div className="text-sm text-gray-600">
                                    Best: {formatTime(diffStats.bestTime)} • 
                                    Avg: {formatTime(Math.floor(diffStats.avgTime))}
                                  </div>
                                )}
                              </div>
                              <Progress 
                                value={hasStats ? Math.min(diffStats.count * 10, 100) : 0} 
                                className="h-2"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="achievements" className="space-y-4">
                {achievements.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="text-4xl mb-4">🎯</div>
                      <h3 className="text-lg font-semibold mb-2">No achievements yet</h3>
                      <p className="text-gray-600">
                        Complete some puzzles to earn your first achievements!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {achievements
                      .sort((a, b) => new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime())
                      .map((achievement) => (
                        <Card key={achievement.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-2xl">
                                  {achievement.is_cookie_trifecta ? '🍪' : '🏆'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      Puzzle #{achievement.puzzle_id} Completed
                                    </span>
                                    <Badge className={getDifficultyColor(achievement.difficulty_level)}>
                                      {achievement.difficulty_level}
                                    </Badge>
                                    {achievement.is_cookie_trifecta && (
                                      <Badge className="bg-yellow-100 text-yellow-800">
                                        Cookie Trifecta!
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Completed in {formatTime(achievement.completion_time)} • {' '}
                                    {new Intl.DateTimeFormat('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    }).format(achievement.achieved_at)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="trifecta" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🍪 Cookie Trifecta Challenge
                    </CardTitle>
                    <CardDescription>
                      Complete puzzles quickly (under 60 seconds) to earn Cookie Trifecta badges on each difficulty level!
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cookieTrifectaStatus ? (
                      <div className="space-y-4">
                        {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map(difficulty => {
                          const hasTrifecta = cookieTrifectaStatus[difficulty.toLowerCase()];
                          
                          return (
                            <div key={difficulty} className="flex items-center justify-between p-3 rounded-lg border">
                              <div className="flex items-center gap-3">
                                <div className="text-2xl">
                                  {getDifficultyIcon(difficulty)}
                                </div>
                                <div>
                                  <div className="font-medium">{difficulty} Level</div>
                                  <div className="text-sm text-gray-600">
                                    Complete any puzzle in under 60 seconds
                                  </div>
                                </div>
                              </div>
                              <div className="text-2xl">
                                {hasTrifecta ? '🍪' : '⚪'}
                              </div>
                            </div>
                          );
                        })}
                        
                        <div className="text-center pt-4">
                          <div className="text-lg font-semibold mb-2">
                            Progress: {Object.values(cookieTrifectaStatus).filter(Boolean).length}/3
                          </div>
                          <Progress 
                            value={(Object.values(cookieTrifectaStatus).filter(Boolean).length / 3) * 100}
                            className="w-full"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        Loading trifecta status...
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}