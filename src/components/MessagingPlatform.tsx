/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { FormEvent, DragEvent, ChangeEvent, RefObject } from "react";
import { Sparkles, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LiveUpdate } from "../types";

interface MessagingPlatformProps {
  updates: LiveUpdate[];
  newAuthor: string;
  setNewAuthor: (val: string) => void;
  newText: string;
  setNewText: (val: string) => void;
  newImage: string;
  setNewImage: (val: string) => void;
  newType: 'text' | 'photo' | 'summit';
  setNewType: (val: 'text' | 'photo' | 'summit') => void;
  dragActive: boolean;
  setDragActive: (val: boolean) => void;
  handleAddLivePost: (e: FormEvent) => void;
  handleDeletePost: (id: string) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  processImageFile: (file: File) => void;
}

export default function MessagingPlatform({
  updates,
  newAuthor,
  setNewAuthor,
  newText,
  setNewText,
  newImage,
  setNewImage,
  newType,
  setNewType,
  dragActive,
  setDragActive,
  handleAddLivePost,
  handleDeletePost,
  fileInputRef,
  processImageFile
}: MessagingPlatformProps) {

  // Drag and Drop support
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-4 border-t-4 border-orange-400 border-x border-b border-slate-100 flex flex-col justify-between h-[450px] w-full">
      {/* Scrollable Live Updates timeline Feed */}
      <div className="flex-1 flex flex-col min-w-0 mb-3 overflow-hidden">
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
          <h3 className="text-xs font-black text-slate-800 tracking-tight flex items-center gap-1.5 uppercase">
            <span>📸</span> Live updates & photos
          </h3>
          <span className="bg-orange-50 border border-orange-200 text-orange-700 font-mono text-[8px] font-black px-1.5 py-0.5 rounded-lg">
            {updates.length} Updates
          </span>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
          <AnimatePresence initial={false}>
            {[...updates]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((post) => {
              const isSystem = post.author === "System" || post.author === "PeakBot";
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-2.5 rounded-xl border border-slate-150 transition-all text-xs ${
                    isSystem ? "bg-slate-50 border-dashed border-emerald-355" : "bg-white shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-2 items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isSystem ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-orange-100 text-orange-850 border border-orange-300'
                      }`}>
                        {isSystem ? "⛰️" : post.author[0]}
                      </div>
                      <div>
                        <span className={`font-black text-[11px] block ${isSystem ? 'text-emerald-800' : 'text-slate-800'}`}>
                          {post.author}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] text-slate-400 font-mono font-bold">
                        {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-slate-300 hover:text-rose-500 font-black text-[10px] px-1 hover:bg-slate-50 rounded"
                        title="Delete post"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <p className={`mt-1 text-[11px] leading-tight ${isSystem ? 'text-slate-500 font-medium italic' : 'text-slate-600 font-medium'}`}>
                    {post.text}
                  </p>

                  {post.type === "summit" && (
                    <span className="mt-1 inline-flex items-center gap-1 bg-[#f59e0b] text-white font-black text-[7px] uppercase px-1.5 py-0.5 rounded-full tracking-wider">
                      <Sparkles className="w-2.5 h-2.5 text-white" /> SUMMIT CLEARED
                    </span>
                  )}

                  {post.image && (
                    <div className="mt-1.5 overflow-hidden rounded-lg border border-slate-150 shadow-inner max-h-[120px] bg-slate-50 relative flex items-center justify-center">
                      <img src={post.image} alt="Walk Snapshot" className="w-full object-cover max-h-[120px]" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {updates.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-[10px] font-bold uppercase">
              No updates yet.
            </div>
          )}
        </div>
      </div>

      {/* Broadcast update composer input form */}
      <form onSubmit={(e) => { e.preventDefault(); }} className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 shrink-0 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[8px] font-black text-slate-450 uppercase tracking-wider mb-0.5">
              Author
            </label>
            <select
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              className="w-full text-[10px] font-bold text-slate-750 bg-white border border-slate-200 rounded-lg p-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
            >
              <option value="Nick">Nick 🏃‍♂️</option>
              <option value="Gurce">Gurce 🏃‍♂️</option>
              <option value="Wayne">Wayne 🥾</option>
              <option value="Louise">Louise 🏃‍♀️</option>
              <option value="Kira">Kira 🎒</option>
              <option value="Connor">Connor 🧗‍♂️</option>
              <option value="Friend/Family">Viewer 👋</option>
            </select>
          </div>
          <div>
            <label className="block text-[8px] font-black text-slate-455 uppercase tracking-wider mb-0.5">
              Type
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as any)}
              className="w-full text-[10px] font-bold text-slate-755 bg-white border border-slate-200 rounded-lg p-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
            >
              <option value="text">💬 Chat</option>
              <option value="photo">📷 Snapshot</option>
              <option value="summit">🏔️ Summit</option>
            </select>
          </div>
        </div>

        <div>
          <textarea
            rows={2}
            required
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={newType === "summit" ? "Which peak was cleared?" : "Update (e.g. 'Ascending Peak!')"}
            className="w-full text-[10px] font-medium text-slate-800 bg-white border border-slate-200 rounded-lg p-1.5 focus:border-orange-400 focus:outline-none placeholder:text-slate-400 resize-none leading-normal"
          />
        </div>

        <div className="flex gap-2 items-center">
          <div
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 border border-dashed rounded-lg p-1 text-center cursor-pointer transition-all flex items-center justify-center min-h-[28px] ${
              dragActive ? 'border-orange-500 bg-orange-50' : 'border-slate-250 bg-white hover:bg-slate-100'
            }`}
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" />
            {newImage ? (
              <span className="text-[8px] text-emerald-800 font-bold truncate block">📷 Photo Ready!</span>
            ) : (
              <span className="text-[7.5px] font-black text-slate-400 uppercase block">📁 Attach Photo</span>
            )}
          </div>

          <button
            onClick={handleAddLivePost}
            type="button"
            className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-black text-[9.5px] px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer min-h-[28px] text-center"
          >
            Broadcast
          </button>
        </div>
      </form>
    </div>
  );
}
