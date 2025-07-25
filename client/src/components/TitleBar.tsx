import { Button } from '@/components/ui/button';
import { Cloud, Minus, Square, X } from 'lucide-react';

export function TitleBar() {
  const handleMinimize = () => {
    // In a real Electron app, this would minimize the window
    console.log('Minimize window');
  };

  const handleMaximize = () => {
    // In a real Electron app, this would maximize/restore the window
    console.log('Maximize/restore window');
  };

  const handleClose = () => {
    // In a real Electron app, this would close the window
    console.log('Close window');
  };

  return (
    <div className="bg-neutral-900 text-white px-4 py-2 flex items-center justify-between text-sm select-none">
      <div className="flex items-center space-x-3">
        <Cloud className="text-primary" size={16} />
        <span className="font-medium">MyDrive Desktop</span>
        <span className="text-neutral-300">v1.0.0</span>
      </div>
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-neutral-700 px-3 py-1 h-auto text-white"
          onClick={handleMinimize}
        >
          <Minus size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-neutral-700 px-3 py-1 h-auto text-white"
          onClick={handleMaximize}
        >
          <Square size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-red-600 px-3 py-1 h-auto text-white"
          onClick={handleClose}
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
