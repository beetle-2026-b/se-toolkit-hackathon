import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DeckSelector from './components/DeckSelector';
import CardsTab from './components/CardsTab';
import AIGenerateTab from './components/AIGenerateTab';
import StudyTab from './components/StudyTab';
import AIQuizTab from './components/AIQuizTab';
import ProgressTab from './components/ProgressTab';
import { getCards, getDecks, getStudyStats, getProgress } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('cards');
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    loadDecks();
    loadCards();
  }, []);

  useEffect(() => {
    if (activeTab === 'cards' || activeTab === 'study' || activeTab === 'progress') {
      loadDataForTab();
    }
  }, [activeTab, selectedDeckId]);

  const loadDecks = async () => {
    try {
      const decksData = await getDecks();
      setDecks(decksData);
    } catch (err) {
      console.error('Error loading decks:', err);
    }
  };

  const loadCards = async () => {
    try {
      const cardsData = await getCards(selectedDeckId);
      setCards(cardsData);
    } catch (err) {
      console.error('Error loading cards:', err);
    }
  };

  const loadDataForTab = async () => {
    if (activeTab === 'cards') {
      loadCards();
    } else if (activeTab === 'study') {
      // StudyTab loads its own data
    } else if (activeTab === 'progress') {
      try {
        const [statsData, progressData] = await Promise.all([
          getStudyStats(selectedDeckId),
          getProgress(selectedDeckId)
        ]);
        setStats(statsData);
        setProgress(progressData);
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleDeckSelect = (deckId) => {
    setSelectedDeckId(deckId);
  };

  const handleDecksChange = () => {
    loadDecks();
  };

  const getSelectedDeckName = () => {
    if (!selectedDeckId) return null;
    const deck = decks.find(d => d.id === selectedDeckId);
    return deck ? deck.name : null;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'cards':
        return <CardsTab cards={cards} setCards={setCards} decks={decks} selectedDeckId={selectedDeckId} />;
      case 'ai-generate':
        return <AIGenerateTab setCards={setCards} />;
      case 'study':
        return <StudyTab deckId={selectedDeckId} onRatingComplete={loadDataForTab} />;
      case 'ai-quiz':
        return <AIQuizTab deckId={selectedDeckId} />;
      case 'progress':
        return <ProgressTab stats={stats} progress={progress} deckName={getSelectedDeckName()} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <DeckSelector
          decks={decks}
          selectedDeckId={selectedDeckId}
          onSelectDeck={handleDeckSelect}
          onDecksChange={handleDecksChange}
        />
      </div>
      <div className="main-content">
        <header>
          <h1>Smart Flashcards with AI</h1>
          <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
        </header>
        <main>
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
