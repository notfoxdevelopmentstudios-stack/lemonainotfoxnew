import React, { useState } from 'react';
import { X, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { projectAPI } from '../../lib/api';
import useProjectStore from '../../store/projectStore';
import { toast } from 'sonner';

const CreateProjectModal = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { addProject } = useProjectStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const response = await projectAPI.create({
        name: name.trim(),
        project_type: 'roblox_game'
      });
      addProject(response.data);
      toast.success('Project created successfully!');
      onSuccess?.(response.data);
      onClose();
      setName('');
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div
              data-testid="create-project-modal"
              className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h2 className="text-xl font-heading font-bold text-white">Create A Project</h2>
                <button
                  onClick={onClose}
                  data-testid="close-modal-btn"
                  className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Project Type */}
                <div
                  data-testid="project-type-roblox"
                  className="p-4 rounded-xl border-2 border-white/20 bg-white/5 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00A2FF] flex items-center justify-center">
                      <Gamepad2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Roblox Game</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Create or connect to a Roblox experience with Luau scripts
                      </p>
                    </div>
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="project-name-input"
                    placeholder="My Awesome Game"
                    className="w-full bg-white/5 border border-white/10 focus:border-[#FFD60A]/50 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 transition-all outline-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!name.trim() || loading}
                  data-testid="submit-project-btn"
                  className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Creating...' : 'Submit'}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateProjectModal;
