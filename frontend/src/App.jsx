import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CardsTab from './components/CardsTab';
import AIGenerateTab from './components/AIGenerateTab';
import StudyTab from './components/StudyTab';
import ProgressTab from './components/ProgressTab';
import { getCards, getStudyStats, getProgress } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('cards');
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const cardsData = await getCards();
      setCards(cardsData);
    } catch (err) {
      console.error('Error loading cards:', err);
    }
  };

  const loadStats = async () => {
    try {
      const [statsData, progressData] = await Promise.all([
        getStudyStats(),
        getProgress()
      ]);
      setStats(statsData);
      setProgress(progressData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'progress') {
      loadStats();
    } else if (tabId === 'cards') {
      loadCards();
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'cards':
        return <CardsTab cards={cards} setCards={setCards} />;
      case 'ai-generate':
        return <AIGenerateTab setCards={setCards} />;
      case 'study':
        return <StudyTab onRatingComplete={loadStats} />;
      case 'progress':
        return <ProgressTab stats={stats} progress={progress} />;
      default:
        return null;
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Smart Flashcards with AI</h1>
        <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
      </header>

      <main>
        {renderTabContent()}
      </main>
    </div>
  );
}

export default App;
