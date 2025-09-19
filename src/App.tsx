import WhatsAppZipViewer from '@/components/WhatsAppZipViewer';
import SplitZipPage from './SplitZipPage';
import './index.css';
import { cn } from "@/lib/utils";
import { useState } from 'react';

function App() {
  const [page, setPage] = useState<'viewer' | 'split'>('viewer');
  return (
    <div>  
      {/* Full-width Navigation Bar */}
      <nav className="w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="w-full px-4">
          <div className="flex items-center justify-start h-14">
            <div className="flex space-x-0">
              <button
                onClick={() => setPage('viewer')}
                className={cn(
                  "px-6 py-2 text-sm font-medium transition-all duration-200",
                  "border-b-2 hover:bg-gray-50",
                  page === 'viewer' 
                    ? "border-purple-500 text-purple-700 bg-purple-50" 
                    : "border-transparent text-gray-600 hover:text-gray-900"
                )}
              >
                WhatsApp ZIP Viewer
              </button>
              <button
                onClick={() => setPage('split')}
                className={cn(
                  "px-6 py-2 text-sm font-medium transition-all duration-200",
                  "border-b-2 hover:bg-gray-50",
                  page === 'split' 
                    ? "border-purple-500 text-purple-700 bg-purple-50" 
                    : "border-transparent text-gray-600 hover:text-gray-900"
                )}
              >
                Split Chat
              </button>
            </div>
          </div>
        </div>
      </nav>
      {page === 'viewer' ? <WhatsAppZipViewer /> : <SplitZipPage />}
    </div>
  );
}

export default App;