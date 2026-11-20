import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import { AppShell } from './new-ui/AppShell';
import Auth from './new-ui/screens/onboarding/auth';
import Welcome from './new-ui/screens/onboarding/welcome';
import Intro from './new-ui/screens/onboarding/intro';
import Today from './new-ui/screens/tabs/today';
import Tasks from './new-ui/screens/tabs/tasks';
import Calendar from './new-ui/screens/tabs/calendar';
import Jerry from './new-ui/screens/tabs/jerry';
import More from './new-ui/screens/tabs/more';
import Focus from './new-ui/screens/focus';
import Insights from './new-ui/screens/insights';
import Board from './new-ui/screens/board/id';
import { MeetingScreen, ProfileScreen } from './new-ui/screens/extra';
import { useAuthStore } from './store/authStore';
import { useTaskStore } from './store/taskStore';
import { JoinWorkspace, WorkspaceApp, WorkspacePicker } from './new-ui/screens/workspaces/WorkspaceApp';

function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div className="flow-loading" role="status">Loading FlowTask…</div>;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function AuthPage({ mode }: { mode: 'create' | 'login' }) {
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  return authenticated ? <Navigate to="/today" replace /> : <Auth initialMode={mode} />;
}

function AppRoutes() {
  const isWorkspace = useLocation().pathname.startsWith('/workspaces');
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void checkAuth().finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [checkAuth]);

  useEffect(() => {
    if (ready && isAuthenticated && !isWorkspace) void fetchTasks({ limit: 200 });
  }, [ready, isAuthenticated, isWorkspace, fetchTasks]);

  useEffect(() => {
    const onError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      if (message) toast.error(message);
    };
    window.addEventListener('flowtask:error', onError);
    return () => window.removeEventListener('flowtask:error', onError);
  }, []);

  if (!ready) return <div className="flow-loading" role="status">Getting your day ready…</div>;

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? '/today' : '/welcome'} replace />} />
        <Route path="/welcome" element={isAuthenticated ? <Navigate to="/today" replace /> : <div className="flow-introduction"><Welcome /></div>} />
        <Route path="/intro" element={isAuthenticated ? <Navigate to="/today" replace /> : <div className="flow-introduction"><Intro /></div>} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="create" />} />
        <Route path="/join/:token" element={<JoinWorkspace />} />
        <Route element={<RequireAuth />}>
          <Route path="/workspaces" element={<WorkspacePicker />} />
          <Route path="/workspaces/:org/:section?/:meetingId?" element={<WorkspaceApp />} />
          <Route element={<AppShell />}>
            <Route path="/today" element={<Today />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/jerry" element={<Jerry />} />
            <Route path="/more" element={<More />} />
            <Route path="/focus" element={<Focus />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/board/:id" element={<Board />} />
            <Route path="/meetings" element={<MeetingScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </>
  );
}

export function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}

export default App;
