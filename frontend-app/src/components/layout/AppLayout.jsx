import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatBot from '../ChatBot';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-6 py-8">
          <Outlet />
        </div>
      </main>
      <ChatBot />
    </div>
  );
}
