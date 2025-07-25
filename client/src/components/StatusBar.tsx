export function StatusBar() {
  return (
    <footer className="bg-surface border-t border-neutral-300 px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-6">
          <span className="text-neutral-600">
            CRM System Active
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-neutral-600">
            Audio Video Integrations
          </span>
        </div>
      </div>
    </footer>
  );
}
