import WhatsAppZipViewer from '@/components/WhatsAppZipViewer';
import SplitZipPage from './SplitZipPage';
import './index.css';

import { useState } from 'react';

function App() {
  const [page, setPage] = useState<'viewer' | 'split'>('viewer');
  return (
    <div>
      <nav style={{ padding: 16, borderBottom: '1px solid #eee', marginBottom: 16 }}>
        <button onClick={() => setPage('viewer')} style={{ marginRight: 8 }}>
          WhatsApp ZIP Viewer 檢視
        </button>
        <button onClick={() => setPage('split')}>
          Split Chat 分割聊天
        </button>
      </nav>
      {page === 'viewer' ? <WhatsAppZipViewer /> : <SplitZipPage />}
    </div>
  );
}

export default App;