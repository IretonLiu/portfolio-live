import React from 'react';
import { Github, Linkedin } from 'lucide-react';

export const SocialLinks = () => {
  return (
    <div className="flex gap-3 mt-4 mb-6">
      <a
        href="https://github.com/IretonLiu"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 border border-transparent hover:border-white/10"
        aria-label="GitHub"
      >
        <Github size={18} />
      </a>
      <a
        href="https://www.linkedin.com/in/ireton-liu/"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 border border-transparent hover:border-white/10"
        aria-label="LinkedIn"
      >
        <Linkedin size={18} />
      </a>
    </div>
  );
};