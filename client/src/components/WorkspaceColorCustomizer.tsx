import React, { useState } from 'react';
import { Palette, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface WorkspaceColorCustomizerProps {
  workspaceId: string;
  currentColor: string;
  workspaceName: string;
  onColorChanged?: (color: string) => void;
}

const PRESET_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Emerald', value: '#059669' },
];

const GRADIENT_PRESETS = [
  { name: 'Ocean', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { name: 'Aurora', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { name: 'Cosmic', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { name: 'Lavender', value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
];

export function WorkspaceColorCustomizer({ 
  workspaceId, 
  currentColor, 
  workspaceName,
  onColorChanged 
}: WorkspaceColorCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [customColor, setCustomColor] = useState(currentColor);
  const [colorMode, setColorMode] = useState<'solid' | 'gradient'>('solid');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateColorMutation = useMutation({
    mutationFn: async (color: string) => {
      return apiRequest('PUT', `/api/workspaces/${workspaceId}`, { color });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      onColorChanged?.(selectedColor);
      setIsOpen(false);
      toast({
        title: "Workspace color updated",
        description: `${workspaceName} color has been changed`
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating color",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setCustomColor(color);
  };

  const handleApplyColor = () => {
    updateColorMutation.mutate(selectedColor);
  };

  const generateRandomColor = () => {
    const randomPreset = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    handleColorSelect(randomPreset.value);
  };

  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  const getContrastColor = (hex: string) => {
    const [, , lightness] = hexToHsl(hex);
    return lightness > 50 ? '#000000' : '#ffffff';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <div 
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: currentColor }}
          />
          <Palette className="h-4 w-4" />
          Customize Color
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customize Workspace Color</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Preview */}
          <div className="text-center">
            <div
              className="mx-auto w-32 h-32 rounded-lg border-4 border-white shadow-lg flex items-center justify-center mb-4"
              style={{ 
                backgroundColor: selectedColor,
                background: colorMode === 'gradient' ? selectedColor : undefined
              }}
            >
              <span 
                className="font-bold text-lg"
                style={{ color: getContrastColor(selectedColor) }}
              >
                {workspaceName}
              </span>
            </div>
            <Badge variant="secondary">{selectedColor}</Badge>
          </div>

          {/* Color Mode Toggle */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant={colorMode === 'solid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setColorMode('solid')}
            >
              Solid Colors
            </Button>
            <Button
              variant={colorMode === 'gradient' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setColorMode('gradient')}
            >
              Gradients
            </Button>
          </div>

          {/* Solid Colors */}
          {colorMode === 'solid' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Preset Colors</Label>
                <div className="grid grid-cols-6 gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-110 ${
                        selectedColor === color.value 
                          ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => handleColorSelect(color.value)}
                      title={color.name}
                    >
                      {selectedColor === color.value && (
                        <Check 
                          className="w-6 h-6 mx-auto" 
                          style={{ color: getContrastColor(color.value) }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="custom-color" className="text-sm font-medium mb-2 block">
                  Custom Color
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="custom-color"
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setSelectedColor(e.target.value);
                    }}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    type="text"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setSelectedColor(e.target.value);
                    }}
                    placeholder="#000000"
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateRandomColor}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Gradient Colors */}
          {colorMode === 'gradient' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Gradient Presets</Label>
                <div className="grid grid-cols-3 gap-3">
                  {GRADIENT_PRESETS.map((gradient) => (
                    <button
                      key={gradient.value}
                      className={`h-16 rounded-lg border-2 transition-all hover:scale-105 ${
                        selectedColor === gradient.value 
                          ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ background: gradient.value }}
                      onClick={() => handleColorSelect(gradient.value)}
                      title={gradient.name}
                    >
                      {selectedColor === gradient.value && (
                        <Check className="w-6 h-6 mx-auto text-white drop-shadow-lg" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleColorSelect(currentColor)}
              >
                Reset
              </Button>
              <Button
                onClick={handleApplyColor}
                disabled={updateColorMutation.isPending || selectedColor === currentColor}
              >
                {updateColorMutation.isPending ? 'Applying...' : 'Apply Color'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}