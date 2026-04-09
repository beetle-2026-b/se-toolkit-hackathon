import React, { useState, useEffect } from 'react';
import { isAuthenticated, getCurrentUser, logout } from './services/api';
import Navbar from './components/Navbar';
import DeckSelector from './components/DeckSelector';
import CardsTab from './components/CardsTab';
import AIGenerateTab from './components/AIGenerateTab';
import StudyTab from './components/StudyTab';
import AIQuizTab from './components/AIQuizTab';
import ProgressTab from './components/ProgressTab';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { getCards, getDecks, getStudyStats, getScoredStudyStats, getProgress } from './services/api';

function App() {
    const [authed, setAuthed] = useState(isAuthenticated());
    const [user, setUser] = useState(getCurrentUser());
    const [activeTab, setActiveTab] = useState('cards');
    const [decks, setDecks] = useState([]);
    const [selectedDeckId, setSelectedDeckId] = useState(null);
    const [cards, setCards] = useState([]);
    const [stats, setStats] = useState(null);
    const [scoredStats, setScoredStats] = useState(null);
    const [progress, setProgress] = useState(null);

    // Simple hash router
    const [hash, setHash] = useState(window.location.hash);

    useEffect(() => {
        const handleHash = () => setHash(window.location.hash);
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    useEffect(() => {
        if (authed) {
            loadDecks();
        }
    }, [authed]);

    useEffect(() => {
        if (authed && (activeTab === 'cards' || activeTab === 'study' || activeTab === 'progress')) {
            loadDataForTab();
        }
    }, [authed, activeTab, selectedDeckId]);

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

    const loadProgress = async () => {
        try {
            const [statsData, scoredData, progressData] = await Promise.all([
                getStudyStats(selectedDeckId),
                getScoredStudyStats(),
                getProgress(selectedDeckId)
            ]);
            setStats(statsData);
            setScoredStats(scoredData);
            setProgress(progressData);
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    };

    const loadDataForTab = async () => {
        if (activeTab === 'cards') {
            loadCards();
        } else if (activeTab === 'study') {
            // StudyTab loads its own data
        } else if (activeTab === 'progress') {
            loadProgress();
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

    const handleAuth = () => {
        setAuthed(true);
        setUser(getCurrentUser());
        window.location.hash = '';
        loadDecks();
    };

    const handleLogout = () => {
        logout();
        setAuthed(false);
        setUser(null);
        setDecks([]);
        setCards([]);
        setStats(null);
        setProgress(null);
    };

    const getSelectedDeckName = () => {
        if (!selectedDeckId) return null;
        const deck = decks.find(d => d.id === selectedDeckId);
        return deck ? deck.name : null;
    };

    // Show login/register pages
    if (!authed) {
        if (hash === '#/register') {
            return <RegisterPage onRegister={handleAuth} />;
        }
        return <LoginPage onLogin={handleAuth} />;
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'cards':
                return <CardsTab decks={decks} setDecks={setDecks} />;
            case 'ai-generate':
                return <AIGenerateTab onDeckCreated={loadDecks} />;
            case 'study':
                return <StudyTab decks={decks} selectedDeckId={selectedDeckId} onCardRated={loadProgress} />;
            case 'ai-quiz':
                return <AIQuizTab decks={decks} onCardRated={loadProgress} />;
            case 'progress':
                return <ProgressTab deckName={getSelectedDeckName()} />;
            default:
                return null;
        }
    };

    return (
        <div className="app-container">
            <div className="main-content">
                <header>
                    <h1>Smart Flashcards with AI</h1>
                    <div className="header-user">
                        <span className="username">{user?.username}</span>
                        <button className="btn-logout" onClick={handleLogout}>Logout</button>
                    </div>
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
