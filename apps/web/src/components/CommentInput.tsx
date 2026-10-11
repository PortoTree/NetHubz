"use client";

import React, { useState, useCallback } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { EditorContent, Editor } from "@tiptap/react";
import { useTranslations } from "next-intl";

interface CommentInputProps {
  editor: Editor | null;
  commentText: string;
  isSubmitting: boolean;
  replyingTo: { commentId: string; name: string } | null;
  setReplyingTo: (val: null) => void;
  handleSubmitComment: (e: React.FormEvent) => void;
  isEmojiOpen: boolean;
  setIsEmojiOpen: React.Dispatch<React.SetStateAction<boolean>>;
  emojiRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

export default function CommentInput({
  editor,
  commentText,
  isSubmitting,
  replyingTo,
  setReplyingTo,
  handleSubmitComment,
  isEmojiOpen,
  setIsEmojiOpen,
  emojiRef,
  isOpen,
  setIsOpen,
}: CommentInputProps) {
  const t = useTranslations();
  const [editorHeight, setEditorHeight] = useState(38); // base height for a single line text

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore fallback
    }

    const startY = e.clientY;
    const startHeight = editorHeight;

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      // Moving up decreases clientY, deltaY is positive, height increases
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(38, Math.min(320, startHeight + deltaY));
      setEditorHeight(newHeight);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      try {
        (e.target as HTMLElement).releasePointerCapture(upEvent.pointerId);
      } catch {
        // Ignore fallback
      }
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
  }, [editorHeight]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;
    const startY = touch.clientY;
    const startHeight = editorHeight;

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.cancelable) moveEvent.preventDefault();
      const currentTouch = moveEvent.touches[0];
      if (!currentTouch) return;
      const deltaY = startY - currentTouch.clientY;
      const newHeight = Math.max(38, Math.min(320, startHeight + deltaY));
      setEditorHeight(newHeight);
    };

    const onTouchEnd = () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
  }, [editorHeight]);

  return (
    <div className="absolute bottom-4 left-4 right-4 z-50 flex items-end justify-end gap-2 md:gap-3 pointer-events-none">
      {/* The sliding input box */}
      <div 
        className={`pointer-events-auto flex flex-col items-end transition-all duration-300 origin-right flex-1 ${
          isOpen ? "opacity-100 translate-x-0 scale-100 max-w-full" : "opacity-0 translate-x-8 scale-95 max-w-0 w-0 h-0 overflow-hidden"
        }`}
      >


        <form onSubmit={handleSubmitComment} className="relative w-full shadow-2xl rounded-3xl bg-gray-100 dark:bg-[#3A3B3C] flex flex-col items-stretch p-1.5 border border-gray-200 dark:border-[#4E4F50]">
          
          {/* Top Drag Handle */}
          <div 
            onPointerDown={handlePointerDown}
            onTouchStart={handleTouchStart}
            className="w-full flex justify-center py-2 cursor-ns-resize hover:bg-gray-200/50 dark:hover:bg-[#4E4F50]/50 rounded-t-xl -mt-1 mb-1 transition-colors group touch-none select-none active:cursor-grabbing"
            style={{ touchAction: "none" }}
          >
            <div className="w-10 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 group-hover:bg-gray-500 dark:group-hover:bg-gray-400 transition-colors" />
          </div>

          <div className="flex items-end w-full">
            <div 
              className="flex-1 min-w-0 px-2 text-gray-900 dark:text-[#E4E6EB] flex flex-col pt-1.5 pb-2" 
              style={{ height: editorHeight }}
            >
              <style>{`
                .ProseMirror {
                  word-break: break-word;
                  overflow-wrap: anywhere;
                  white-space: pre-wrap;
                  outline: none;
                  min-height: 100%;
                  height: 100%;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                  color: #9ca3af;
                  content: attr(data-placeholder);
                  float: left;
                  height: 0;
                  pointer-events: none;
                }
                .ProseMirror p {
                  margin: 0;
                }
                .tiptap-wrapper {
                  flex: 1;
                  overflow-y: auto;
                  display: flex;
                  flex-direction: column;
                }
                .tiptap-wrapper > div {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                }
              `}</style>
              <div className="tiptap-wrapper custom-scrollbar" onClick={() => editor?.chain().focus().run()}>
                <EditorContent editor={editor} />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={!commentText.trim() || isSubmitting}
              className="shrink-0 p-2 text-blue-600 disabled:text-gray-400 dark:text-blue-400 dark:disabled:text-gray-500 transition-colors rounded-full mb-1 ml-1"
            >
              <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
        </form>
      </div>

      {/* Buttons Column */}
      <div className="flex flex-col items-center gap-3">
        {/* Emoji Button - Only visible when isOpen */}
        <div className={`transition-all duration-300 origin-bottom ${isOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-4 scale-50 h-0 overflow-hidden pointer-events-none'}`}>
          <div ref={emojiRef} className="relative">
            <button type="button" onClick={() => setIsEmojiOpen(o => !o)} aria-label="Emoji" className="bg-white dark:bg-[#3A3B3C] p-3 rounded-full shadow-md text-gray-500 hover:text-blue-500 transition-colors border border-gray-200 dark:border-[#4E4F50]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            {isEmojiOpen && (
              <div className="absolute bottom-full right-0 mb-4 z-50 shadow-2xl rounded-2xl overflow-hidden picker-container">
                <style>{`.picker-container em-emoji-picker{height:280px !important;min-height:280px !important;max-height:280px !important;width:328px !important;max-width:calc(100vw - 2rem) !important;}`}</style>
                <Picker data={data} onEmojiSelect={(e: any) => {
                  if (editor) editor.chain().focus().insertContent(e.native).run();
                }} theme={typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"} previewPosition="none" skinTonePosition="search" />
              </div>
            )}
          </div>
        </div>

        {/* The floating chat bubble toggle button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`pointer-events-auto bg-blue-500 hover:bg-blue-600 text-white p-3.5 rounded-full shadow-lg transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-12' : 'rotate-0'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
