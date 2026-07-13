import { useState, useEffect } from 'react';
import { db, seedDatabase, type Book } from './db';
import CountdownStamp from './features/countdown/CountdownStamp';
import OsymTimeline from './features/timeline/OsymTimeline';
import LibraryShelf from './features/library/LibraryShelf';
import PDFReader from './features/library/PDFReader';
import ExamDefteri from './features/exams/ExamDefteri';
import SimulationPanel from './features/simulation/SimulationPanel';
import StudyPlaces from './features/places/StudyPlaces';
import GuncelNotes from './features/notes/GuncelNotes';
import SettingsPanel from './features/settings/SettingsPanel';
import { BookOpen, Award, BarChart2, MapPin, Edit3, Settings } from 'lucide-react';

type Tab = 'library' | 'exams' | 'simulation' | 'places' | 'notes' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [dbSeeded, setDbSeeded] = useState(false);

  // Seed DB on mount
  useEffect(() => {
    async function initDB() {
      await seedDatabase();
      setDbSeeded(true);
    }
    initDB();
  }, []);

  // Keyboard Shortcuts: 1-6 switches tabs
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      // Avoid firing hotkeys when user is actively typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.key === '1') setActiveTab('library');
      if (e.key === '2') setActiveTab('exams');
      if (e.key === '3') setActiveTab('simulation');
      if (e.key === '4') setActiveTab('places');
      if (e.key === '5') setActiveTab('notes');
      if (e.key === '6') setActiveTab('settings');
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);



  if (!dbSeeded) {
    return (
      <div className="kp-loading-screen">
        <div className="kp-spinner"></div>
        <span>KOKPİT ÖN YÜKLEMESİ YAPILIYOR...</span>
      </div>
    );
  }

  return (
    <div className="kp-app-container">
      {/* Top Countdown & Info stamp */}
      <CountdownStamp />

      {/* OSYM Milestone timeline banner */}
      <OsymTimeline />

      {/* Main Tab Controller Bar */}
      <div className="kp-tab-bar">
        <button
          className={`kp-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          <BookOpen size={16} />
          <span>KİTAPLIK [1]</span>
        </button>
        <button
          className={`kp-tab-btn ${activeTab === 'exams' ? 'active' : ''}`}
          onClick={() => setActiveTab('exams')}
        >
          <Award size={16} />
          <span>DENEME DEFTERİ [2]</span>
        </button>
        <button
          className={`kp-tab-btn ${activeTab === 'simulation' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulation')}
        >
          <BarChart2 size={16} />
          <span>SİMÜLATÖR [3]</span>
        </button>
        <button
          className={`kp-tab-btn ${activeTab === 'places' ? 'active' : ''}`}
          onClick={() => setActiveTab('places')}
        >
          <MapPin size={16} />
          <span>MEKANLAR [4]</span>
        </button>
        <button
          className={`kp-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <Edit3 size={16} />
          <span>GÜNCEL GÜNLÜK [5]</span>
        </button>
        <button
          className={`kp-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} />
          <span>AYARLAR [6]</span>
        </button>
      </div>

      {/* Workspace Display Area */}
      <main className="kp-main-content">
        {activeTab === 'library' && (
          <LibraryShelf onOpenBook={(book) => setActiveBook(book)} />
        )}
        
        {activeTab === 'exams' && (
          <ExamDefteri />
        )}
        
        {activeTab === 'simulation' && (
          <SimulationPanel />
        )}
        
        {activeTab === 'places' && (
          <StudyPlaces />
        )}
        
        {activeTab === 'notes' && (
          <GuncelNotes />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel />
        )}
      </main>

      {/* Screen reader overlay (fullscreen modal for reading PDF files) */}
      {activeBook && (
        <PDFReader
          book={activeBook}
          onClose={() => setActiveBook(null)}
        />
      )}
    </div>
  );
}
