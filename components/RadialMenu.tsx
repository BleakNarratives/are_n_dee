import React from 'react';

interface RadialMenuProps {
  isOpen: boolean;
  onMenuItemClick: (item: string) => void;
}

const RadialMenu: React.FC<RadialMenuProps> = ({ isOpen, onMenuItemClick }) => {
  const menuItems = [
    { name: 'AI Chat', feature: 'chat', icon: '💬' },
    { name: 'Generate Image', feature: 'generateImage', icon: '🖼️' },
    { name: 'Analyze Image', feature: 'analyzeImage', icon: '🔍' },
    { name: 'Generate Video', feature: 'generateVideo', icon: '🎥' },
    { name: 'Analyze Video', feature: 'analyzeVideo', icon: '🎬' },
    { name: 'Code Forge', feature: 'codeForge', icon: '💻' },
  ];

  return (
    <div
      id="radial-menu"
      className={`
        fixed inset-0 flex justify-center items-center
        transition-opacity duration-300 z-40
        ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}
        sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
      `}
    >
      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-900 bg-opacity-95 rounded-xl shadow-lg border border-blue-600/30 w-full max-w-sm mx-auto">
        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() => onMenuItemClick(item.feature)}
            className="
              flex flex-col items-center justify-center p-4 sm:p-5
              bg-gray-800 bg-opacity-80 hover:bg-opacity-95
              border border-blue-500/30 rounded-lg shadow-md
              text-blue-200 hover:text-white
              transition-all duration-200 ease-in-out
              active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500
              min-h-[80px] sm:min-h-[100px]
            "
          >
            <span className="text-3xl sm:text-4xl mb-1" aria-hidden="true">{item.icon}</span>
            <span className="text-sm sm:text-base font-medium">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RadialMenu;