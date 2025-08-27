import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import type { Puzzle, User, PuzzleAttempt } from '../../../server/src/schema';

interface GameBoardProps {
  puzzle: Puzzle;
  user: User | null;
  onComplete: () => void;
}

interface BoardData {
  regions: { [key: string]: { color: string; cells: string[] } };
  conditions: { [key: string]: { type: string; value: number | string } };
}

interface DominoData {
  id: string;
  values: [number, number];
  position?: { x: number; y: number };
  rotation: 'horizontal' | 'vertical';
  isPlaced: boolean;
}

interface GameState {
  dominoes: DominoData[];
  boardState: { [key: string]: { dominoId: string; value: number } };
  isComplete: boolean;
  violatedConditions: string[];
  startTime: number;
  completionTime?: number;
}

export function GameBoard({ puzzle, user, onComplete }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<PuzzleAttempt | null>(null);
  const [draggedDomino, setDraggedDomino] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Parse puzzle data
  const boardData = useMemo<BoardData>(() => {
    try {
      const board = JSON.parse(puzzle.board_data);
      const conditions = JSON.parse(puzzle.conditions_data);
      return { regions: board, conditions };
    } catch (error) {
      console.error('Failed to parse puzzle data:', error);
      return { regions: {}, conditions: {} };
    }
  }, [puzzle.board_data, puzzle.conditions_data]);

  const dominoesData = useMemo<DominoData[]>(() => {
    try {
      const dominoes = JSON.parse(puzzle.dominoes_data);
      return dominoes.map((domino: any, index: number) => ({
        id: `domino-${index}`,
        values: domino.values,
        rotation: 'horizontal' as const,
        isPlaced: false
      }));
    } catch (error) {
      console.error('Failed to parse dominoes data:', error);
      return [];
    }
  }, [puzzle.dominoes_data]);

  // Initialize game state
  useEffect(() => {
    const newGameState: GameState = {
      dominoes: dominoesData,
      boardState: {},
      isComplete: false,
      violatedConditions: [],
      startTime: Date.now()
    };
    setGameState(newGameState);

    // Create or load puzzle attempt
    if (user) {
      const createAttempt = async () => {
        try {
          const attempt = await trpc.createPuzzleAttempt.mutate({
            user_id: user.id,
            puzzle_id: puzzle.id,
            attempt_data: JSON.stringify(newGameState)
          });
          setCurrentAttempt(attempt);
        } catch (error) {
          console.error('Failed to create puzzle attempt:', error);
        }
      };
      createAttempt();
    }
  }, [dominoesData, puzzle.id, user]);

  // Timer effect
  useEffect(() => {
    if (!gameState?.isComplete) {
      const timer = setInterval(() => {
        setElapsedTime(Date.now() - (gameState?.startTime || Date.now()));
      }, 100);
      return () => clearInterval(timer);
    }
  }, [gameState?.isComplete, gameState?.startTime]);

  // Check win conditions
  const checkWinConditions = useCallback((state: GameState): string[] => {
    const violated: string[] = [];
    
    Object.entries(boardData.conditions).forEach(([regionId, condition]) => {
      const region = boardData.regions[regionId];
      if (!region) return;

      const regionValues: number[] = [];
      region.cells.forEach(cellId => {
        const cell = state.boardState[cellId];
        if (cell) {
          regionValues.push(cell.value);
        }
      });

      if (regionValues.length === 0) return;

      let conditionMet = false;
      switch (condition.type) {
        case 'sum':
          conditionMet = regionValues.reduce((a, b) => a + b, 0) === condition.value;
          break;
        case 'product':
          conditionMet = regionValues.reduce((a, b) => a * b, 1) === condition.value;
          break;
        case 'difference':
          conditionMet = regionValues.length === 2 && 
            Math.abs(regionValues[0] - regionValues[1]) === condition.value;
          break;
        case 'equality':
          conditionMet = regionValues.every(val => val === regionValues[0]);
          break;
        case 'greater_than':
          conditionMet = regionValues.every(val => val > (condition.value as number));
          break;
        case 'less_than':
          conditionMet = regionValues.every(val => val < (condition.value as number));
          break;
      }

      if (!conditionMet) {
        violated.push(regionId);
      }
    });

    return violated;
  }, [boardData]);

  // Update game state and check for completion
  const updateGameState = useCallback((newState: Partial<GameState>) => {
    setGameState(prevState => {
      if (!prevState) return null;
      
      const updatedState = { ...prevState, ...newState };
      const violatedConditions = checkWinConditions(updatedState);
      const allDominoesPlaced = updatedState.dominoes.every(d => d.isPlaced);
      const isComplete = allDominoesPlaced && violatedConditions.length === 0;
      
      const finalState = {
        ...updatedState,
        violatedConditions,
        isComplete,
        completionTime: isComplete && !prevState.isComplete ? Date.now() - prevState.startTime : prevState.completionTime
      };

      // Handle completion
      if (isComplete && !prevState.isComplete) {
        setShowSuccess(true);
        handlePuzzleComplete(finalState);
      }

      // Save attempt if user is logged in
      if (user && currentAttempt) {
        const saveAttempt = async () => {
          try {
            await trpc.updatePuzzleAttempt.mutate({
              id: currentAttempt.id,
              attempt_data: JSON.stringify(finalState),
              is_completed: isComplete,
              completion_time: finalState.completionTime ? Math.floor(finalState.completionTime / 1000) : null,
              completed_at: isComplete ? new Date() : null
            });
          } catch (error) {
            console.error('Failed to save attempt:', error);
          }
        };
        saveAttempt();
      }

      return finalState;
    });
  }, [checkWinConditions, user, currentAttempt]);

  // Handle puzzle completion
  const handlePuzzleComplete = async (completedState: GameState) => {
    if (!user || !completedState.completionTime) return;

    try {
      const completionSeconds = Math.floor(completedState.completionTime / 1000);
      const isCookieTrifecta = completionSeconds <= 60; // Fast completion threshold

      await trpc.createAchievement.mutate({
        user_id: user.id,
        puzzle_id: puzzle.id,
        difficulty_level: puzzle.difficulty_level,
        completion_time: completionSeconds,
        is_cookie_trifecta: isCookieTrifecta
      });
    } catch (error) {
      console.error('Failed to create achievement:', error);
    }
  };

  // Handle domino drag and drop
  const handleDominoMove = (dominoId: string, targetCellId: string | null) => {
    if (!gameState) return;

    const domino = gameState.dominoes.find(d => d.id === dominoId);
    if (!domino) return;

    updateGameState({
      dominoes: gameState.dominoes.map(d => {
        if (d.id === dominoId) {
          if (targetCellId) {
            // Place domino on board
            const cells = domino.rotation === 'horizontal' 
              ? [targetCellId, `${targetCellId}-right`] // This is simplified - real implementation would calculate adjacent cells
              : [targetCellId, `${targetCellId}-below`];
            
            return { ...d, isPlaced: true, position: { x: 0, y: 0 } }; // Position would be calculated from cellId
          } else {
            // Remove from board
            return { ...d, isPlaced: false, position: undefined };
          }
        }
        return d;
      }),
      boardState: targetCellId && domino ? {
        ...gameState.boardState,
        [targetCellId]: { dominoId, value: domino.values[0] },
        [`${targetCellId}-${domino.rotation === 'horizontal' ? 'right' : 'below'}`]: { 
          dominoId, 
          value: domino.values[1] 
        }
      } : gameState.boardState
    });
  };

  // Handle domino rotation
  const handleDominoRotate = (dominoId: string) => {
    if (!gameState) return;

    updateGameState({
      dominoes: gameState.dominoes.map(d => 
        d.id === dominoId 
          ? { ...d, rotation: d.rotation === 'horizontal' ? 'vertical' : 'horizontal' }
          : d
      )
    });
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getConditionText = (condition: { type: string; value: number | string }) => {
    switch (condition.type) {
      case 'sum': return `Σ = ${condition.value}`;
      case 'product': return `Π = ${condition.value}`;
      case 'difference': return `|a-b| = ${condition.value}`;
      case 'equality': return 'All Equal';
      case 'greater_than': return `> ${condition.value}`;
      case 'less_than': return `< ${condition.value}`;
      default: return condition.type;
    }
  };

  if (!gameState) {
    return <div className="flex justify-center items-center h-64">Loading puzzle...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-mono">⏱️ {formatTime(elapsedTime)}</div>
          <Progress 
            value={(gameState.dominoes.filter(d => d.isPlaced).length / gameState.dominoes.length) * 100} 
            className="w-32"
          />
          <span className="text-sm text-gray-600">
            {gameState.dominoes.filter(d => d.isPlaced).length} / {gameState.dominoes.length} dominoes placed
          </span>
        </div>
        <Button onClick={onComplete} variant="outline">Exit Puzzle</Button>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="flex items-center gap-2">
            🎉 <strong>Puzzle Complete!</strong> 
            Finished in {formatTime(gameState.completionTime || 0)}
            {gameState.completionTime && gameState.completionTime <= 60000 && (
              <Badge className="bg-yellow-100 text-yellow-800 ml-2">
                🍪 Cookie Trifecta!
              </Badge>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Condition Violations */}
      {gameState.violatedConditions.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertDescription>
            <strong>Conditions not met:</strong> {gameState.violatedConditions.length} region(s) need adjustment
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Game Board */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Game Board ({puzzle.grid_width}×{puzzle.grid_height})</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="grid gap-1 mx-auto"
                style={{ 
                  gridTemplateColumns: `repeat(${puzzle.grid_width}, 1fr)`,
                  maxWidth: '600px'
                }}
              >
                {Array.from({ length: puzzle.grid_width * puzzle.grid_height }).map((_, index) => {
                  const cellId = `cell-${index}`;
                  const cellState = gameState.boardState[cellId];
                  
                  // Find which region this cell belongs to
                  const regionEntry = Object.entries(boardData.regions).find(([_, region]) => 
                    region.cells.includes(cellId)
                  );
                  const [regionId, region] = regionEntry || [null, null];
                  const isViolated = regionId && gameState.violatedConditions.includes(regionId);
                  
                  return (
                    <div
                      key={cellId}
                      className={`
                        aspect-square w-12 border-2 rounded flex items-center justify-center text-sm font-bold
                        ${region ? region.color : 'bg-gray-100'}
                        ${isViolated ? 'ring-2 ring-red-400' : ''}
                        ${cellState ? 'bg-white shadow-md' : 'border-dashed border-gray-300'}
                      `}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedDomino) {
                          handleDominoMove(draggedDomino, cellId);
                          setDraggedDomino(null);
                        }
                      }}
                    >
                      {cellState?.value}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Region Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Region Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(boardData.conditions).map(([regionId, condition]) => {
                const region = boardData.regions[regionId];
                const isViolated = gameState.violatedConditions.includes(regionId);
                
                return (
                  <div
                    key={regionId}
                    className={`
                      flex items-center justify-between p-2 rounded text-xs
                      ${region ? region.color : 'bg-gray-100'}
                      ${isViolated ? 'ring-1 ring-red-400' : ''}
                    `}
                  >
                    <span className="font-medium">{getConditionText(condition)}</span>
                    {isViolated ? '❌' : '✅'}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Available Dominoes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Dominoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {gameState.dominoes.filter(d => !d.isPlaced).map((domino) => (
                <div
                  key={domino.id}
                  draggable
                  onDragStart={() => setDraggedDomino(domino.id)}
                  onClick={() => handleDominoRotate(domino.id)}
                  className={`
                    flex items-center gap-1 p-2 bg-white border-2 border-gray-300 rounded cursor-pointer
                    hover:shadow-md transition-shadow
                    ${domino.rotation === 'horizontal' ? 'flex-row' : 'flex-col'}
                  `}
                  title="Click to rotate, drag to place"
                >
                  <div className="w-6 h-6 bg-gray-800 text-white rounded text-xs flex items-center justify-center">
                    {domino.values[0]}
                  </div>
                  <div className="w-6 h-6 bg-gray-800 text-white rounded text-xs flex items-center justify-center">
                    {domino.values[1]}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Placed Dominoes */}
          {gameState.dominoes.some(d => d.isPlaced) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Placed Dominoes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {gameState.dominoes.filter(d => d.isPlaced).map((domino) => (
                  <div
                    key={domino.id}
                    onClick={() => handleDominoMove(domino.id, null)}
                    className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded cursor-pointer hover:bg-green-100"
                    title="Click to remove from board"
                  >
                    <div className="flex gap-1">
                      <div className="w-4 h-4 bg-green-600 text-white rounded text-xs flex items-center justify-center">
                        {domino.values[0]}
                      </div>
                      <div className="w-4 h-4 bg-green-600 text-white rounded text-xs flex items-center justify-center">
                        {domino.values[1]}
                      </div>
                    </div>
                    <span className="text-xs text-green-700">Placed</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}