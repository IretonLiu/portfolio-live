import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface TabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex space-x-6 border-b border-white/10 pb-4 mb-6 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className="relative pb-1 group"
        >
          <span className={clsx(
            "text-xs font-bold uppercase tracking-widest transition-colors duration-300 font-mono",
            activeTab === tab ? "text-accent" : "text-gray-500 group-hover:text-gray-300"
          )}>
            {tab}
          </span>
          {activeTab === tab && (
            <motion.div
              layoutId="activeTabLine"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
};