import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import type { Puzzle, User } from '../../../server/src/schema';

interface DailyPuzzleProps {
  onPuzzleSelect: (puzzle: Puzzle) => void;
  user?: User | null;
}

export function DailyPuzzle({ onPuzzleSelect, user }: DailyPuzzleProps) {
  const [dailyPuzzle, setDailyPuzzle] = useState<Puzzle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');

  // Load today's daily puzzle
  useEffect(() => {
    const loadDailyPuzzle = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const today = new Date();
        const puzzle = await trpc.getDailyPuzzle.query(today);
        setDailyPuzzle(puzzle);
      } catch (error: any) {
        console.error('Failed to load daily puzzle:', error);
        setError('Failed to load today\'s puzzle. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDailyPuzzle();
  }, []);

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeUntilNext(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '🟢';
      case 'Medium': return '🟡';
      case 'Hard': return '🔴';
      default: return '⚪';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📅 Daily Puzzle</h2>
          <p className="text-gray-600">Loading today's challenge...</p>
        </div>
        <Card>
          <CardContent className="p-12">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📅 Daily Puzzle</h2>
          <p className="text-gray-600">Something went wrong</p>
        </div>
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!dailyPuzzle) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">📅 Daily Puzzle</h2>
          <p className="text-gray-600">{formatDate(new Date())}</p>
        </div>
        
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🧩</div>
            <h3 className="text-xl font-semibold mb-2">No Daily Puzzle Today</h3>
            <p className="text-gray-600 mb-4">
              There's no daily puzzle available for today. Check back tomorrow for a new challenge!
            </p>
            <div className="text-sm text-gray-500">
              Next puzzle in: <span className="font-mono font-medium">{timeUntilNext}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">💡 About Daily Puzzles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Daily puzzles are specially curated challenges that refresh every 24 hours. 
              They're designed to provide a consistent difficulty progression and introduce 
              new puzzle mechanics.
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-lg">🎯</span>
                <div>
                  <div className="font-medium">Unique Challenge</div>
                  <div className="text-gray-600">Each day brings a new puzzle</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">🏆</span>
                <div>
                  <div className="font-medium">Progress Tracking</div>
                  <div className="text-gray-600">Compete with other players</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">🍪</span>
                <div>
                  <div className="font-medium">Cookie Trifecta</div>
                  <div className="text-gray-600">Fast completion rewards</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">📈</span>
                <div>
                  <div className="font-medium">Skill Building</div>
                  <div className="text-gray-600">Progressive difficulty</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">📅 Daily Puzzle</h2>
        <p className="text-gray-600">{formatDate(new Date())}</p>
      </div>

      {/* Countdown Timer */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏰</span>
              <div>
                <div className="font-semibold text-blue-800">Today's Challenge</div>
                <div className="text-sm text-blue-600">
                  New puzzle in: <span className="font-mono font-medium">{timeUntilNext}</span>
                </div>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
              Daily Special
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Daily Puzzle Card */}
      <Card className="border-2 border-purple-200 shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl flex items-center gap-3 mb-2">
                {getDifficultyIcon(dailyPuzzle.difficulty_level)} {dailyPuzzle.title}
              </CardTitle>
              <div className="flex items-center gap-3 mb-3">
                <Badge className={getDifficultyColor(dailyPuzzle.difficulty_level)}>
                  {dailyPuzzle.difficulty_level}
                </Badge>
                <span className="text-sm text-gray-600">
                  {dailyPuzzle.grid_width}×{dailyPuzzle.grid_height} grid
                </span>
                {dailyPuzzle.daily_puzzle_date && (
                  <span className="text-sm text-gray-600">
                    {formatDate(dailyPuzzle.daily_puzzle_date)}
                  </span>
                )}
              </div>
              {dailyPuzzle.description && (
                <CardDescription className="text-base">
                  {dailyPuzzle.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700">🎯 Today's Challenge</h4>
              <p className="text-sm text-gray-600">
                Complete this specially designed puzzle to earn your daily achievement. 
                Fast completion (under 60 seconds) earns a Cookie Trifecta bonus!
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700">📊 Puzzle Stats</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Difficulty: {dailyPuzzle.difficulty_level}</div>
                <div>Grid Size: {dailyPuzzle.grid_width} × {dailyPuzzle.grid_height}</div>
                <div>Created: {formatDate(dailyPuzzle.created_at)}</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={() => onPuzzleSelect(dailyPuzzle)}
              size="lg"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6"
            >
              🚀 Start Today's Challenge
            </Button>
          </div>

          {!user && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                💡 <strong>Tip:</strong> Sign in to track your daily puzzle progress and compete with other players!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Daily Puzzle Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🌟 Why Play Daily Puzzles?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <h4 className="font-semibold">Consistent Practice</h4>
                  <p className="text-sm text-gray-600">
                    Daily challenges help build puzzle-solving skills with regular practice
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <h4 className="font-semibold">Achievement Tracking</h4>
                  <p className="text-sm text-gray-600">
                    Build up your completion streak and earn special badges
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🍪</span>
                <div>
                  <h4 className="font-semibold">Cookie Trifecta Bonus</h4>
                  <p className="text-sm text-gray-600">
                    Complete puzzles under 60 seconds for special rewards
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📈</span>
                <div>
                  <h4 className="font-semibold">Progressive Difficulty</h4>
                  <p className="text-sm text-gray-600">
                    Puzzles are designed to gradually increase in complexity
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}