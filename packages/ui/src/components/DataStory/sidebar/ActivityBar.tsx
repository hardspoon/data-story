import React, { useState } from 'react';

type Activity = {
  id: string;
  name: string;
  icon: (isActive: boolean) => JSX.Element; // 修改图标为函数，接收活动状态
};

const DiagramIcon = (isActive: boolean) => (
  <svg className={`w-6 h-6 ${isActive ? 'fill-white' : 'fill-blue-500'}`} viewBox="0 0 24 24"><path d="M5 3v18h18V3H5zm16 16H7V5h14v14z"/><path d="M9 7h2v10H9zm4 0h2v10h-2z"/></svg>
);
const NodeConfigIcon = (isActive: boolean) => (
  <svg className={`w-6 h-6 ${isActive ? 'fill-white' : 'fill-blue-500'}`} viewBox="0 0 24 24"><path d="M12 2L3 7v9l9 5 9-5V7l-9-5zm7 13.2l-7 3.9-7-3.9V8.8l7-3.9 7 3.9v6.4z"/><path d="M9 12h2v2H9zm4 0h2v2h-2z"/></svg>
);
const SettingsIcon = (isActive: boolean) => (
  <svg className={`w-6 h-6 ${isActive ? 'fill-white' : 'fill-blue-500'}`} viewBox="0 0 24 24"><path d="M19.14,12.94a1.43,1.43,0,1,0,1.43,1.43A1.43,1.43,0,0,0,19.14,12.94Zm-3.86,3.5a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,15.28,16.44Zm-5.71,0a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,9.57,16.44Zm-5.71,0a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,3.86,16.44Z"/></svg>
);

const activities: Activity[] = [
  { id: 'diagram', name: 'Diagram Config', icon: DiagramIcon },
  { id: 'node', name: 'Node Config', icon: NodeConfigIcon },
  { id: 'settings', name: 'Settings', icon: SettingsIcon },
];

export const ActivityBar: React.FC = () => {
  const [activeActivity, setActiveActivity] = useState<string>(activities[0].id);

  const handleActivityClick = (id: string) => {
    setActiveActivity(id);
    console.log(`Activity changed to: ${id}`);
  };

  return (
    <div className="bg-f4f4f4 text-gray-800 flex flex-col items-center py-2 space-y-4">
      {activities.map(({ id, name, icon }) => (
        <button
          key={id}
          title={name}
          className={`p-2 rounded ${activeActivity === id ? 'bg-blue-500' : 'hover:bg-blue-100'}`}
          onClick={() => handleActivityClick(id)}
        >
          {icon(activeActivity === id)} {/* 调用图标函数，并传入活动状态 */}
        </button>
      ))}
    </div>
  );
};
