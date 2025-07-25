import { TitleBar } from '@/components/TitleBar';

import { Sidebar } from '@/components/Sidebar';
import { FileManager } from '@/components/FileManager';
import { StatusBar } from '@/components/StatusBar';

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-neutral-50 overflow-hidden">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <FileManager />
      </div>
      <StatusBar />
    </div>
  );
}
