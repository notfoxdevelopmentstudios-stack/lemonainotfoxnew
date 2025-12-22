import React from 'react';
import { Plus, FolderOpen, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import useProjectStore from '../../store/projectStore';

const Sidebar = ({ onNewProject, onSelectProject }) => {
  const { projects, currentProject } = useProjectStore();

  return (
    <aside 
      data-testid="sidebar"
      className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl z-40 flex flex-col"
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#FFD60A] flex items-center justify-center">
            <span className="text-black font-bold text-sm">🦊</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-lg text-white">NotFox</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-zinc-400">beta</span>
          </div>
        </div>
      </div>

      {/* New Project Button */}
      <div className="p-4">
        <motion.button
          data-testid="new-project-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewProject}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium">New Project</span>
        </motion.button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto px-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Projects</p>
        
        <div className="space-y-1">
          {projects.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">No projects yet</p>
          ) : (
            projects.map((project) => (
              <motion.button
                key={project.id}
                data-testid={`project-item-${project.id}`}
                whileHover={{ x: 4 }}
                onClick={() => onSelectProject(project)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  currentProject?.id === project.id
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm">{project.name}</span>
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Discord CTA */}
      <div className="p-4">
        <a
          href="https://discord.gg/notfox"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="discord-cta"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Discord</p>
            <p className="text-xs text-zinc-500">Join for gifts</p>
          </div>
          <span className="text-zinc-500 group-hover:text-white transition-colors">→</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
