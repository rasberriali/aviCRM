import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
}

interface ContextMenuProps {
  children: React.ReactNode;
  items: ContextMenuItem[];
}

export function ContextMenu({ children, items }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.pageX, y: e.pageY });
    setIsOpen(true);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const handleItemClick = (item: ContextMenuItem) => {
    item.onClick();
    setIsOpen(false);
  };

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          className="fixed bg-white border border-neutral-300 rounded-lg shadow-lg py-2 min-w-48 z-50"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {items.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className={`w-full justify-start px-4 py-2 h-auto text-sm ${
                item.destructive ? 'text-error hover:bg-red-50' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
              onClick={() => handleItemClick(item)}
            >
              {item.icon && <span className="mr-3 w-4">{item.icon}</span>}
              {item.label}
            </Button>
          ))}
        </div>
      )}
    </>
  );
}
