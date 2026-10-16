/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { Dashboard } from './components/Dashboard';
import { RelationshipWorkspace } from './components/RelationshipWorkspace';
import type { Relationship } from './types';

function MainApp() {
  const { user, loading } = useAuth();
  const { uiLang } = useTheme();
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
        <div className="w-10 h-10 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-stone-500 font-medium">
          {uiLang === 'ar' ? 'جارٍ التحقق من الجلسة وتجهيز الرفيق...' : 'Initializing relationship companion...'}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
        <Navbar />
        <main>
          <AuthView />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors flex flex-col">
      <Navbar
        activeRelationship={selectedRelationship}
        onBackToDashboard={() => setSelectedRelationship(null)}
      />

      <main className={`flex-1 ${selectedRelationship ? 'pb-0' : 'pb-12'}`}>
        {selectedRelationship ? (
          <RelationshipWorkspace
            userId={user.uid}
            relationship={selectedRelationship}
            onBack={() => setSelectedRelationship(null)}
            onRelationshipUpdated={(updated) => setSelectedRelationship(updated)}
            onRelationshipDeleted={() => setSelectedRelationship(null)}
          />
        ) : (
          <Dashboard onSelectRelationship={(rel) => setSelectedRelationship(rel)} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </AuthProvider>
  );
}
