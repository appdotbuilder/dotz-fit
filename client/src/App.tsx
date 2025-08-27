import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import { GameBoard } from '@/components/GameBoard';
import { PuzzleCreator } from '@/components/PuzzleCreator';
import { PuzzleGallery } from '@/components/PuzzleGallery';
import { UserAuth } from '@/components/UserAuth';
import { UserProfile } from '@/components/UserProfile';
import { DailyPuzzle } from '@/components/DailyPuzzle';
import type { User, Puzzle, DifficultyLevel } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);
  const [activeTab, setActiveTab] = useState<string>('play');
  const [isLoading, setIsLoading] = useState(false);

  // Load user from localStorage on app start
  useEffect(() => {
    const savedUser = localStorage.getItem('dotfit-user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('dotfit-user');
      }
    }
  }, []);

  const handleUserLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('dotfit-user', JSON.stringify(user));
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('dotfit-user');
    setSelectedPuzzle(null);
    setActiveTab('play');
  };

  const handlePuzzleSelect = (puzzle: Puzzle) => {
    setSelectedPuzzle(puzzle);
    setActiveTab('game');
  };

  const handlePuzzleComplete = () => {
    setSelectedPuzzle(null);
    setActiveTab('play');
  };

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedPuzzle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => setSelectedPuzzle(null)}
                className="flex items-center gap-2"
              >
                ← Back to Menu
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">🧩 {selectedPuzzle.title}</h1>
                {selectedPuzzle.description && (
                  <p className="text-gray-600">{selectedPuzzle.description}</p>
                )}
              </div>
            </div>
            <Badge className={getDifficultyColor(selectedPuzzle.difficulty_level)}>
              {selectedPuzzle.difficulty_level}
            </Badge>
          </div>
          <GameBoard 
            puzzle={selectedPuzzle} 
            user={currentUser}
            onComplete={handlePuzzleComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🔴</div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Dotz.fit
              </h1>
              <p className="text-gray-600">Visual Logic Puzzle Game</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {currentUser ? (
              <UserProfile user={currentUser} onLogout={handleUserLogout} />
            ) : (
              <UserAuth onLogin={handleUserLogin} />
            )}
          </div>
        </header>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="play" className="flex items-center gap-2">
              🎮 Play
            </TabsTrigger>
            <TabsTrigger value="daily" className="flex items-center gap-2">
              📅 Daily Puzzle
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              🎨 Create
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              🖼️ Gallery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="play" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Choose Your Challenge</h2>
              <p className="text-gray-600">
                Arrange dominoes on colored regions to satisfy mathematical conditions
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map((difficulty) => (
                <Card key={difficulty} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {difficulty === 'Easy' && '🟢'}
                        {difficulty === 'Medium' && '🟡'}
                        {difficulty === 'Hard' && '🔴'}
                        {difficulty}
                      </span>
                      <Badge className={getDifficultyColor(difficulty)}>
                        {difficulty}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {difficulty === 'Easy' && 'Small grids with simple sum conditions'}
                      {difficulty === 'Medium' && 'Medium grids with mixed conditions'}
                      {difficulty === 'Hard' && 'Large grids with complex conditions'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PuzzleGallery
                      difficulty={difficulty}
                      onPuzzleSelect={handlePuzzleSelect}
                      showCreateButton={false}
                      compact={true}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* How to Play */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📖 How to Play
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">🎯 Objective</h3>
                    <p className="text-gray-600 text-sm">
                      Place all dominoes on the colored board regions to satisfy each region's mathematical condition.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">🎮 Controls</h3>
                    <p className="text-gray-600 text-sm">
                      Drag dominoes to move them. Tap to rotate. All dominoes must be used to win.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">🔢 Conditions</h3>
                    <p className="text-gray-600 text-sm">
                      Each colored region has a mathematical condition like sum=10, product=12, or equality checks.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">🏆 Cookie Trifecta</h3>
                    <p className="text-gray-600 text-sm">
                      Complete puzzles quickly to earn Cookie Trifecta achievements on each difficulty level!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily">
            <DailyPuzzle onPuzzleSelect={handlePuzzleSelect} user={currentUser} />
          </TabsContent>

          <TabsContent value="create">
            <PuzzleCreator user={currentUser} />
          </TabsContent>

          <TabsContent value="gallery">
            <PuzzleGallery onPuzzleSelect={handlePuzzleSelect} user={currentUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;