import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { trpc } from '@/utils/trpc';
import type { Puzzle, User, DifficultyLevel } from '../../../server/src/schema';

interface PuzzleGalleryProps {
  onPuzzleSelect: (puzzle: Puzzle) => void;
  user?: User | null;
  difficulty?: DifficultyLevel;
  showCreateButton?: boolean;
  compact?: boolean;
}

export function PuzzleGallery({ 
  onPuzzleSelect, 
  user, 
  difficulty, 
  showCreateButton = true,
  compact = false 
}: PuzzleGalleryProps) {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [filteredPuzzles, setFilteredPuzzles] = useState<Puzzle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>(difficulty || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMyPuzzles, setShowMyPuzzles] = useState(false);
  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Puzzle | null>(null);

  // Load puzzles
  const loadPuzzles = useCallback(async () => {
    setIsLoading(true);
    try {
      let result: Puzzle[] = [];
      
      if (selectedDifficulty !== 'all') {
        result = await trpc.getPuzzlesByDifficulty.query({
          difficulty_level: selectedDifficulty as DifficultyLevel,
          limit: compact ? 3 : 20
        });
      } else if (showMyPuzzles && user) {
        result = await trpc.getPuzzlesByCreator.query({
          creator_id: user.id,
          limit: compact ? 3 : 20
        });
      } else {
        result = await trpc.getPublishedPuzzles.query({
          limit: compact ? 3 : 20
        });
      }
      
      setPuzzles(result);
    } catch (error) {
      console.error('Failed to load puzzles:', error);
      setPuzzles([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDifficulty, showMyPuzzles, user, compact]);

  // Filter puzzles based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPuzzles(puzzles);
    } else {
      const filtered = puzzles.filter(puzzle =>
        puzzle.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (puzzle.description && puzzle.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredPuzzles(filtered);
    }
  }, [puzzles, searchTerm]);

  // Load puzzles when filters change
  useEffect(() => {
    loadPuzzles();
  }, [loadPuzzles]);

  const handleDeletePuzzle = async (puzzle: Puzzle) => {
    if (!user || puzzle.creator_id !== user.id) return;

    try {
      await trpc.deletePuzzle.mutate({
        puzzleId: puzzle.id,
        creatorId: user.id
      });
      setShowDeleteConfirm(null);
      loadPuzzles(); // Reload puzzles after deletion
    } catch (error) {
      console.error('Failed to delete puzzle:', error);
      alert('Failed to delete puzzle. Please try again.');
    }
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center text-gray-500 py-4">Loading puzzles...</div>
        ) : filteredPuzzles.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No puzzles available for this difficulty level.
          </div>
        ) : (
          filteredPuzzles.slice(0, 3).map((puzzle) => (
            <div
              key={puzzle.id}
              onClick={() => onPuzzleSelect(puzzle)}
              className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{puzzle.title}</h4>
                <p className="text-xs text-gray-500 truncate">
                  {puzzle.grid_width}×{puzzle.grid_height} • {formatDate(puzzle.created_at)}
                </p>
              </div>
              <div className="text-lg">
                {getDifficultyIcon(puzzle.difficulty_level)}
              </div>
            </div>
          ))
        )}
        {filteredPuzzles.length > 3 && (
          <div className="text-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // This would switch to full gallery view
                alert('View more puzzles - feature to be implemented');
              }}
            >
              View All ({filteredPuzzles.length})
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">🖼️ Puzzle Gallery</h2>
        <p className="text-gray-600">
          Discover amazing puzzles created by the Dotz.fit community
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Select
            value={selectedDifficulty}
            onValueChange={(value: DifficultyLevel | 'all') => {
              setSelectedDifficulty(value);
              setShowMyPuzzles(false);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="Easy">🟢 Easy</SelectItem>
              <SelectItem value="Medium">🟡 Medium</SelectItem>
              <SelectItem value="Hard">🔴 Hard</SelectItem>
            </SelectContent>
          </Select>

          {user && (
            <Button
              variant={showMyPuzzles ? 'default' : 'outline'}
              onClick={() => {
                setShowMyPuzzles(!showMyPuzzles);
                setSelectedDifficulty('all');
              }}
            >
              {showMyPuzzles ? '👤 My Puzzles' : '🌍 All Puzzles'}
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Search puzzles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {/* Puzzles Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPuzzles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-4xl mb-4">🧩</div>
            <h3 className="text-lg font-semibold mb-2">No puzzles found</h3>
            <p className="text-gray-600 mb-4">
              {showMyPuzzles 
                ? "You haven't created any puzzles yet." 
                : searchTerm 
                ? "Try adjusting your search terms."
                : "No puzzles match your current filters."
              }
            </p>
            {showCreateButton && (
              <Button onClick={() => alert('Navigate to Create tab')}>
                🎨 Create Your First Puzzle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPuzzles.map((puzzle) => (
            <Card key={puzzle.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate flex items-center gap-2">
                      {getDifficultyIcon(puzzle.difficulty_level)} {puzzle.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getDifficultyColor(puzzle.difficulty_level)}>
                        {puzzle.difficulty_level}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {puzzle.grid_width}×{puzzle.grid_height}
                      </span>
                    </div>
                  </div>
                  {user && puzzle.creator_id === user.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          ⋮
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setSelectedPuzzle(puzzle)}>
                          👁️ Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => alert('Edit puzzle - feature to be implemented')}
                        >
                          ✏️ Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setShowDeleteConfirm(puzzle)}
                          className="text-red-600"
                        >
                          🗑️ Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {puzzle.description && (
                  <CardDescription className="line-clamp-2">
                    {puzzle.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Created {formatDate(puzzle.created_at)}</span>
                    {puzzle.is_daily_puzzle && (
                      <Badge variant="secondary">📅 Daily</Badge>
                    )}
                  </div>
                  
                  <Button 
                    onClick={() => onPuzzleSelect(puzzle)}
                    className="w-full"
                  >
                    🎮 Play Puzzle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Puzzle Preview Dialog */}
      <Dialog open={!!selectedPuzzle} onOpenChange={() => setSelectedPuzzle(null)}>
        <DialogContent className="max-w-2xl">
          {selectedPuzzle && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getDifficultyIcon(selectedPuzzle.difficulty_level)} {selectedPuzzle.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge className={getDifficultyColor(selectedPuzzle.difficulty_level)}>
                    {selectedPuzzle.difficulty_level}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {selectedPuzzle.grid_width}×{selectedPuzzle.grid_height} grid
                  </span>
                  <span className="text-sm text-gray-600">
                    Created {formatDate(selectedPuzzle.created_at)}
                  </span>
                </div>
                {selectedPuzzle.description && (
                  <p className="text-gray-700">{selectedPuzzle.description}</p>
                )}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      setSelectedPuzzle(null);
                      onPuzzleSelect(selectedPuzzle);
                    }}
                    className="flex-1"
                  >
                    🎮 Play Now
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedPuzzle(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          {showDeleteConfirm && (
            <>
              <DialogHeader>
                <DialogTitle>Delete Puzzle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>Are you sure you want to delete "{showDeleteConfirm.title}"?</p>
                <p className="text-sm text-gray-600">
                  This action cannot be undone. The puzzle will be permanently removed.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleDeletePuzzle(showDeleteConfirm)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}