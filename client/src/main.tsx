import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Switch, Route } from 'wouter';
import { NotesApp } from './components/NotesApp';
import { AuthPage } from './pages/AuthPage';
import { SharedNoteView } from './pages/SharedNoteView';
import { useCurrentUser } from './lib/api';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRouter() {
  const { data, isLoading, error } = useCurrentUser();
  
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/shared/:shareLink">
        {(params) => <SharedNoteView shareLink={params.shareLink} />}
      </Route>
      <Route>
        {error || !data?.user ? (
          <AuthPage onSuccess={() => queryClient.invalidateQueries({ queryKey: ['currentUser'] })} />
        ) : (
          <NotesApp />
        )}
      </Route>
    </Switch>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  </React.StrictMode>
);
