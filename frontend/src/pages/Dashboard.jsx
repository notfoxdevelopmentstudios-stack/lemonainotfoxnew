import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import CreateProjectModal from '../components/modals/CreateProjectModal';
import ChatView from '../components/chat/ChatView';
import useAuthStore from '../store/authStore';
import useProjectStore from '../store/projectStore';
import { projectAPI } from '../lib/api';
import { ArrowUpRight } from 'lucide-react';

// Background thumbnails for the scattered grid
const BACKGROUND_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1605245763221-e89db37d59f7?w=300&h=200&fit=crop', position: 'top-[15%] left-[15%]', delay: 0 },
  { url: 'https://images.unsplash.com/photo-1664070719324-c0a6a02ce364?w=300&h=200&fit=crop', position: 'top-[10%] left-[50%]', delay: 0.5 },
  { url: 'https://images.pexels.com/photos/8679906/pexels-photo-8679906.jpeg?w=300&h=200&fit=crop', position: 'top-[15%] right-[15%]', delay: 1 },
  { url: 'https://images.pexels.com/photos/8858693/pexels-photo-8858693.jpeg?w=300&h=200&fit=crop', position: 'bottom-[25%] left-[20%]', delay: 1.5 },
  { url: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=300&h=200&fit=crop', position: 'bottom-[20%] right-[20%]', delay: 2 },
  { url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=200&fit=crop', position: 'bottom-[35%] left-[50%]', delay: 2.5 },
];

const FloatingCard = ({ image, position, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 0.7, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className={`absolute ${position} w-32 md:w-40 lg:w-48 aspect-video rounded-xl overflow-hidden border border-white/10 shadow-xl hover:scale-105 transition-transform duration-300`}
    style={{ animation: `float ${6 + delay}s ease-in-out infinite` }}
  >
    <img src={image} alt="" className="w-full h-full object-cover opacity-60 blur-[1px]" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
  </motion.div>
);

const LandingContent = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');

  const placeholders = [
    'Add a gun with shooting mechanic',
    'Make shift-to-run with stamina bar UI',
    'Create an inventory system',
    'Build a dialogue system for NPCs',
  ];

  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-screen overflow-hidden">
      {/* Background floating cards */}
      {BACKGROUND_IMAGES.map((img, index) => (
        <FloatingCard key={index} image={img.url} position={img.position} delay={img.delay} />
      ))}

      {/* Central content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-2xl mx-auto px-6"
      >
        <h1 
          data-testid="hero-title"
          className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8"
        >
          Describe a game mechanic...
        </h1>

        {/* Chat input */}
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            data-testid="hero-chat-input"
            placeholder={placeholders[currentPlaceholder]}
            className="w-full bg-zinc-800/80 backdrop-blur-xl border border-white/10 focus:border-white/20 rounded-2xl px-6 py-4 pr-14 text-white placeholder:text-zinc-500 transition-all outline-none text-lg"
          />
          <button
            data-testid="hero-send-btn"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>

        <p className="text-zinc-500 text-sm mt-6">
          Create a new project to start building with NotFox AI
        </p>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { projects, currentProject, setProjects, setCurrentProject } = useProjectStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadProjects();
  }, [isAuthenticated, navigate]);

  const loadProjects = async () => {
    try {
      const response = await projectAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleNewProject = () => {
    setShowCreateModal(true);
  };

  const handleSelectProject = (project) => {
    setCurrentProject(project);
  };

  const handleProjectCreated = (project) => {
    setCurrentProject(project);
  };

  return (
    <div data-testid="dashboard" className="min-h-screen bg-[#09090b]">
      <Sidebar 
        onNewProject={handleNewProject} 
        onSelectProject={handleSelectProject}
      />
      
      <div className="ml-64">
        <Header 
          showBackButton={!!currentProject}
          projectName={currentProject?.name}
        />
        
        <main className="pt-16 h-screen">
          {currentProject ? (
            <ChatView />
          ) : (
            <LandingContent />
          )}
        </main>
      </div>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
};

export default Dashboard;
