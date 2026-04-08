import React from 'react';

function Navbar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'cards', label: 'My Cards' },
    { id: 'ai-generate', label: 'AI Generate' },
    { id: 'study', label: 'Study Mode' },
    { id: 'progress', label: 'Progress' }
  ];

  return (
    <nav className="navbar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export default Navbar;
