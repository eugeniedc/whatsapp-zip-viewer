import WhatsAppZipViewer from '@/components/WhatsAppZipViewer';
import SplitZipPage from './SplitZipPage';
import './index.css';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

import { useState } from 'react';

function App() {
  const [page, setPage] = useState<'viewer' | 'split'>('viewer');
  return (
    <div>  
        <NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger onClick={() => setPage('viewer')}>WhatsApp ZIP Viewer</NavigationMenuTrigger>

    </NavigationMenuItem>
        <NavigationMenuItem>
      <NavigationMenuTrigger onClick={() => setPage('split')}> Split Chat</NavigationMenuTrigger>  
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>

      {page === 'viewer' ? <WhatsAppZipViewer /> : <SplitZipPage />}
    </div>
  );
}

export default App;