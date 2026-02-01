// components/Sidebar.jsx
import React from 'react';

const TABS_DATA = [
  { 
      id: 'validator', 
      name: 'Validator URL', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  },
  { 
      id: 'operatorConfig', 
      name: 'Operator Config', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      )
  },
  { 
      id: 'roundDetails', 
      name: 'Round Details', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
  },
  {
      id: 'signature',
      name: 'Signature Calc',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
  },
  {
      id: 'availability',
      name: 'Game Checker',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  },
  { 
      id: 'settings', 
      name: 'Settings', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
  }
];

const Sidebar = ({ activeTab, setActiveTab }) => {
    const primaryColor = 'bg-[#2e2691]'; 

    return (
        <div className="w-16 sm:w-64 bg-white shadow-xl flex flex-col justify-between py-6 transition-all duration-300 border-r border-gray-200 shrink-0">
            <div className="space-y-2 px-2 sm:px-4">
                <div className="hidden sm:block text-center mb-6">
                    <span className="text-xl font-bold text-gray-800">Toolbox</span>
                </div>
                <div className="block sm:hidden text-center text-lg font-bold text-gray-800 mb-6">
                    T
                </div>
                
                {TABS_DATA.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center justify-center sm:justify-start space-x-3 py-3 px-3 rounded-lg transition-colors duration-200 group 
                                        ${isActive 
                                            ? `${primaryColor} text-white shadow-lg` 
                                            : 'text-gray-600 hover:bg-gray-100'}`
                                    }
                            title={tab.name}
                        >
                            <span className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-800'}>
                                {tab.icon}
                            </span>
                            <span className={`hidden sm:inline font-medium ${isActive ? 'text-white' : 'text-gray-800'}`}>
                                {tab.name}
                            </span>
                        </button>
                    );
                })}
            </div>
            
            <div className="text-center text-xs text-gray-400 mt-8">
                v2.7
            </div>
        </div>
    );
};

export default Sidebar;