import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { User, DifficultyLevel, ConditionType, CreatePuzzleInput } from '../../../server/src/schema';

interface PuzzleCreatorProps {
  user: User | null;
}

interface RegionData {
  id: string;
  color: string;
  cells: string[];
  condition?: {
    type: ConditionType;
    value: number | string;
  };
}

interface DominoData {
  id: string;
  values: [number, number];
}

interface CreatorState {
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  gridWidth: number;
  gridHeight: number;
  regions: { [key: string]: RegionData };
  dominoes: DominoData[];
  selectedTool: 'paint' | 'condition' | 'test';
  selectedColor: string;
  selectedRegion: string | null;
  paintMode: boolean;
}

const REGION_COLORS = [
  { id: 'red', color: 'bg-red-200 border-red-400', name: '🔴 Red' },
  { id: 'blue', color: 'bg-blue-200 border-blue-400', name: '🔵 Blue' },
  { id: 'green', color: 'bg-green-200 border-green-400', name: '🟢 Green' },
  { id: 'yellow', color: 'bg-yellow-200 border-yellow-400', name: '🟡 Yellow' },
  { id: 'purple', color: 'bg-purple-200 border-purple-400', name: '🟣 Purple' },
  { id: 'orange', color: 'bg-orange-200 border-orange-400', name: '🟠 Orange' },
  { id: 'pink', color: 'bg-pink-200 border-pink-400', name: '🩷 Pink' },
  { id: 'cyan', color: 'bg-cyan-200 border-cyan-400', name: '🔵 Cyan' }
];

export function PuzzleCreator({ user }: PuzzleCreatorProps) {
  const [state, setState] = useState<CreatorState>({
    title: '',
    description: '',
    difficulty: 'Easy',
    gridWidth: 4,
    gridHeight: 4,
    regions: {},
    dominoes: [],
    selectedTool: 'paint',
    selectedColor: 'red',
    selectedRegion: null,
    paintMode: false
  });

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showConditionDialog, setShowConditionDialog] = useState(false);
  const [tempCondition, setTempCondition] = useState<{ type: ConditionType; value: string }>({
    type: 'sum',
    value: '10'
  });

  // Handle grid resize
  const handleGridResize = (width: number, height: number) => {
    setState(prev => ({
      ...prev,
      gridWidth: width,
      gridHeight: height,
      regions: {} // Clear regions when grid changes
    }));
  };

  // Handle cell painting
  const handleCellClick = (cellId: string) => {
    if (state.selectedTool === 'paint') {
      const colorData = REGION_COLORS.find(c => c.id === state.selectedColor);
      if (!colorData) return;

      setState(prev => {
        const newRegions = { ...prev.regions };
        
        // Remove cell from any existing region
        Object.keys(newRegions).forEach(regionId => {
          newRegions[regionId] = {
            ...newRegions[regionId],
            cells: newRegions[regionId].cells.filter(c => c !== cellId)
          };
          // Remove empty regions
          if (newRegions[regionId].cells.length === 0) {
            delete newRegions[regionId];
          }
        });

        // Add cell to selected color region
        const regionId = state.selectedColor;
        if (!newRegions[regionId]) {
          newRegions[regionId] = {
            id: regionId,
            color: colorData.color,
            cells: []
          };
        }
        newRegions[regionId].cells.push(cellId);

        return { ...prev, regions: newRegions };
      });
    } else if (state.selectedTool === 'condition') {
      // Find which region this cell belongs to
      const regionEntry = Object.entries(state.regions).find(([_, region]) => 
        region.cells.includes(cellId)
      );
      if (regionEntry) {
        setState(prev => ({ ...prev, selectedRegion: regionEntry[0] }));
        setShowConditionDialog(true);
      }
    }
  };

  // Handle condition setting
  const handleSetCondition = () => {
    if (!state.selectedRegion) return;

    const numericValue = ['sum', 'product', 'difference', 'greater_than', 'less_than'].includes(tempCondition.type)
      ? parseInt(tempCondition.value) || 0
      : tempCondition.value;

    setState(prev => ({
      ...prev,
      regions: {
        ...prev.regions,
        [state.selectedRegion!]: {
          ...prev.regions[state.selectedRegion!],
          condition: {
            type: tempCondition.type,
            value: numericValue
          }
        }
      },
      selectedRegion: null
    }));
    setShowConditionDialog(false);
  };

  // Generate random dominoes based on difficulty
  const generateDominoes = useCallback(() => {
    const count = state.difficulty === 'Easy' ? 4 : state.difficulty === 'Medium' ? 6 : 8;
    const maxValue = state.difficulty === 'Easy' ? 6 : state.difficulty === 'Medium' ? 9 : 12;
    
    const newDominoes: DominoData[] = [];
    for (let i = 0; i < count; i++) {
      newDominoes.push({
        id: `domino-${i}`,
        values: [
          Math.floor(Math.random() * maxValue) + 1,
          Math.floor(Math.random() * maxValue) + 1
        ]
      });
    }
    
    setState(prev => ({ ...prev, dominoes: newDominoes }));
  }, [state.difficulty]);

  // Test puzzle
  const testPuzzle = () => {
    // Basic validation
    const hasRegions = Object.keys(state.regions).length > 0;
    const allRegionsHaveConditions = Object.values(state.regions).every(r => r.condition);
    const hasDominoes = state.dominoes.length > 0;
    
    if (!hasRegions) {
      alert('Please create at least one colored region');
      return;
    }
    if (!allRegionsHaveConditions) {
      alert('Please set conditions for all regions');
      return;
    }
    if (!hasDominoes) {
      alert('Please generate dominoes for testing');
      return;
    }
    
    alert('🧪 Test mode would launch the puzzle for validation (feature to be implemented)');
  };

  // Publish puzzle
  const publishPuzzle = async () => {
    if (!user) {
      alert('Please log in to publish puzzles');
      return;
    }

    if (!state.title.trim()) {
      alert('Please enter a puzzle title');
      return;
    }

    // Validate puzzle
    const hasRegions = Object.keys(state.regions).length > 0;
    const allRegionsHaveConditions = Object.values(state.regions).every(r => r.condition);
    const hasDominoes = state.dominoes.length > 0;
    
    if (!hasRegions || !allRegionsHaveConditions || !hasDominoes) {
      alert('Please complete the puzzle design before publishing');
      return;
    }

    setIsPublishing(true);
    try {
      const puzzleInput: CreatePuzzleInput = {
        title: state.title,
        description: state.description || null,
        creator_id: user.id,
        difficulty_level: state.difficulty,
        grid_width: state.gridWidth,
        grid_height: state.gridHeight,
        board_data: JSON.stringify(state.regions),
        dominoes_data: JSON.stringify(state.dominoes),
        conditions_data: JSON.stringify(
          Object.fromEntries(
            Object.entries(state.regions).map(([id, region]) => [
              id,
              region.condition!
            ])
          )
        ),
        solution_data: null,
        is_published: true,
        is_daily_puzzle: false
      };

      await trpc.createPuzzle.mutate(puzzleInput);
      setPublishResult({ success: true, message: 'Puzzle published successfully! 🎉' });
      
      // Reset form
      setState({
        title: '',
        description: '',
        difficulty: 'Easy',
        gridWidth: 4,
        gridHeight: 4,
        regions: {},
        dominoes: [],
        selectedTool: 'paint',
        selectedColor: 'red',
        selectedRegion: null,
        paintMode: false
      });
    } catch (error) {
      console.error('Failed to publish puzzle:', error);
      setPublishResult({ success: false, message: 'Failed to publish puzzle. Please try again.' });
    } finally {
      setIsPublishing(false);
    }
  };

  const getConditionText = (condition: { type: ConditionType; value: number | string }) => {
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">🎨 Puzzle Creator</h2>
        <p className="text-gray-600">
          Design your own Dotz.fit puzzles and share them with the community!
        </p>
        {!user && (
          <Alert className="mt-4 border-blue-200 bg-blue-50">
            <AlertDescription>
              💡 <strong>Guest Mode:</strong> You can create puzzles locally. Log in to publish and share your creations!
            </AlertDescription>
          </Alert>
        )}
      </div>

      {publishResult && (
        <Alert className={publishResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertDescription>{publishResult.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-3 space-y-6">
          {/* Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Grid Editor ({state.gridWidth}×{state.gridHeight})
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{state.selectedTool} mode</Badge>
                  {state.selectedTool === 'paint' && (
                    <Badge className={REGION_COLORS.find(c => c.id === state.selectedColor)?.color}>
                      {REGION_COLORS.find(c => c.id === state.selectedColor)?.name}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="grid gap-1 mx-auto mb-4"
                style={{ 
                  gridTemplateColumns: `repeat(${state.gridWidth}, 1fr)`,
                  maxWidth: '600px'
                }}
              >
                {Array.from({ length: state.gridWidth * state.gridHeight }).map((_, index) => {
                  const cellId = `cell-${index}`;
                  
                  // Find which region this cell belongs to
                  const regionEntry = Object.entries(state.regions).find(([_, region]) => 
                    region.cells.includes(cellId)
                  );
                  const [regionId, region] = regionEntry || [null, null];
                  
                  return (
                    <div
                      key={cellId}
                      onClick={() => handleCellClick(cellId)}
                      className={`
                        aspect-square w-12 border-2 rounded cursor-pointer
                        hover:opacity-80 transition-opacity
                        ${region ? region.color : 'bg-gray-100 border-gray-300'}
                        ${state.selectedTool === 'condition' && region && !region.condition ? 'ring-2 ring-orange-400' : ''}
                      `}
                      title={
                        state.selectedTool === 'paint' ? 'Click to paint' :
                        state.selectedTool === 'condition' ? (region ? 'Click to set condition' : 'No region') :
                        'Test mode'
                      }
                    >
                      {region?.condition && (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-700">
                          {getConditionText(region.condition).split(' ')[0]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Generated Dominoes */}
          {state.dominoes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Dominoes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {state.dominoes.map((domino) => (
                    <div
                      key={domino.id}
                      className="flex items-center gap-1 p-2 bg-white border-2 border-gray-300 rounded"
                    >
                      <div className="w-6 h-6 bg-gray-800 text-white rounded text-xs flex items-center justify-center">
                        {domino.values[0]}
                      </div>
                      <div className="w-6 h-6 bg-gray-800 text-white rounded text-xs flex items-center justify-center">
                        {domino.values[1]}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Toolbox */}
        <div className="space-y-4">
          {/* Puzzle Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Puzzle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={state.title}
                  onChange={(e) => setState(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="My Amazing Puzzle"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={state.description}
                  onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="A challenging puzzle with..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={state.difficulty}
                  onValueChange={(value: DifficultyLevel) => setState(prev => ({ ...prev, difficulty: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">🟢 Easy</SelectItem>
                    <SelectItem value="Medium">🟡 Medium</SelectItem>
                    <SelectItem value="Hard">🔴 Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Grid Size */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Grid Size</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="width">Width</Label>
                <Select
                  value={state.gridWidth.toString()}
                  onValueChange={(value) => handleGridResize(parseInt(value), state.gridHeight)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7, 8].map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="height">Height</Label>
                <Select
                  value={state.gridHeight.toString()}
                  onValueChange={(value) => handleGridResize(state.gridWidth, parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7, 8].map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant={state.selectedTool === 'paint' ? 'default' : 'outline'}
                  onClick={() => setState(prev => ({ ...prev, selectedTool: 'paint' }))}
                  className="justify-start"
                >
                  🎨 Paint Regions
                </Button>
                <Button
                  variant={state.selectedTool === 'condition' ? 'default' : 'outline'}
                  onClick={() => setState(prev => ({ ...prev, selectedTool: 'condition' }))}
                  className="justify-start"
                >
                  ⚙️ Set Conditions
                </Button>
              </div>

              {state.selectedTool === 'paint' && (
                <div className="space-y-2">
                  <Label>Region Colors</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {REGION_COLORS.map((colorOption) => (
                      <Button
                        key={colorOption.id}
                        variant={state.selectedColor === colorOption.id ? 'default' : 'outline'}
                        onClick={() => setState(prev => ({ ...prev, selectedColor: colorOption.id }))}
                        className={`text-xs p-2 h-auto ${colorOption.color}`}
                      >
                        {colorOption.name.split(' ')[0]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Region Status */}
          {Object.keys(state.regions).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Regions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.values(state.regions).map((region) => (
                  <div
                    key={region.id}
                    className={`p-2 rounded text-xs ${region.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {REGION_COLORS.find(c => c.id === region.id)?.name || region.id}
                      </span>
                      <span className="text-gray-600">
                        {region.cells.length} cells
                      </span>
                    </div>
                    {region.condition ? (
                      <div className="text-gray-700 font-medium">
                        {getConditionText(region.condition)}
                      </div>
                    ) : (
                      <div className="text-orange-600">No condition set</div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={generateDominoes}
                variant="outline" 
                className="w-full justify-start"
              >
                🎲 Generate Dominoes
              </Button>
              <Button 
                onClick={testPuzzle}
                variant="outline" 
                className="w-full justify-start"
                disabled={Object.keys(state.regions).length === 0}
              >
                🧪 Test Puzzle
              </Button>
              <Button 
                onClick={publishPuzzle}
                disabled={!user || isPublishing}
                className="w-full justify-start"
              >
                {isPublishing ? '⏳ Publishing...' : '🚀 Publish Puzzle'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Condition Dialog */}
      <Dialog open={showConditionDialog} onOpenChange={setShowConditionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Region Condition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="conditionType">Condition Type</Label>
              <Select
                value={tempCondition.type}
                onValueChange={(value: ConditionType) => setTempCondition(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sum">Sum (Σ)</SelectItem>
                  <SelectItem value="product">Product (Π)</SelectItem>
                  <SelectItem value="difference">Difference (|a-b|)</SelectItem>
                  <SelectItem value="equality">All Equal</SelectItem>
                  <SelectItem value="greater_than">Greater Than (&gt;)</SelectItem>
                  <SelectItem value="less_than">Less Than (&lt;)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tempCondition.type !== 'equality' && (
              <div>
                <Label htmlFor="conditionValue">Value</Label>
                <Input
                  id="conditionValue"
                  type="number"
                  value={tempCondition.value}
                  onChange={(e) => setTempCondition(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Enter target value"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConditionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSetCondition}>
                Set Condition
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}