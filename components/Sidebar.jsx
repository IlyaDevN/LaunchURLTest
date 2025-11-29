// components/Sidebar.jsx
const TABS_DATA = [
  { id: 'validator', name: 'Validator URL', icon: ("")},
  { id: 'roundDetails', name: 'RoundDetails', icon: ("")},
  { id: 'settings', name: 'Settings', icon: ("")}
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
                v2.0
            </div>
        </div>
    );
};

export default Sidebar;