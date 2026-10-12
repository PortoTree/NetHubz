"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { CommentItem, InlineReplyInput } from "@/components/PostDetailModal";
import CommentInput from "@/components/CommentInput";

interface ProjectCommentsModalMobileProps {
  isOpen: boolean;
  onClose: () => void;
  comments: any[];
  isLoadingComments: boolean;
  nextCursor?: string;
  fetchComments: (cursor?: string) => Promise<void>;
  locale: string;
  t: (key: any) => string;
  tGlobal: (key: any) => string;
  router: any;
  currentUser: any;
  handleLikeComment: (commentId: string, reactionType?: string) => Promise<void>;
  handleReplyClick: (uname: string, uid: string, displayName: string, exactCommentId: string, parentIdForDB?: string, rootId?: string) => void;
  replyingTo: any;
  setReplyingTo: (val: any) => void;
  handleInlineSubmit: (text: string, parentId: string) => Promise<void>;
  handleTopLevelSubmit: (e?: React.FormEvent) => Promise<void>;
  renderCommentContent: (content: string) => React.ReactNode;
  editor: any;
  commentInput: string;
  isSubmitting: boolean;
  isEmojiOpen: boolean;
  setIsEmojiOpen: React.Dispatch<React.SetStateAction<boolean>>;
  emojiRef: React.RefObject<HTMLDivElement | null>;
  isInputOpen: boolean;
  setIsInputOpen: (val: boolean) => void;
  isExpanded: boolean;
  traceInfo: any;
  setTraceInfo: (val: any) => void;
}

export default function ProjectCommentsModalMobile({
  isOpen,
  onClose,
  comments,
  isLoadingComments,
  nextCursor,
  fetchComments,
  locale,
  t,
  tGlobal,
  router,
  currentUser,
  handleLikeComment,
  handleReplyClick,
  replyingTo,
  setReplyingTo,
  handleInlineSubmit,
  handleTopLevelSubmit,
  renderCommentContent,
  editor,
  commentInput,
  isSubmitting,
  isEmojiOpen,
  setIsEmojiOpen,
  emojiRef,
  isInputOpen,
  setIsInputOpen,
  isExpanded,
  traceInfo,
  setTraceInfo,
}: ProjectCommentsModalMobileProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prevBody = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100000] flex flex-col bg-black/40 dark:bg-black/60 overscroll-contain"
      onWheel={(e) => e.stopPropagation()}
    >
      <div 
        className="w-full h-full bg-white dark:bg-[#242526] flex flex-col overflow-hidden relative shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Header (matching PostDetailModal mobile comment area) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#3E4042] bg-white dark:bg-[#242526] shrink-0 z-10">
          <h2 className="font-bold text-[17px] text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            {t("comments") || "Komentar"} <span className="text-gray-500 dark:text-[#B0B3B8] font-normal text-sm">({comments.length})</span>
          </h2>
          <button 
            onClick={onClose} 
            aria-label={t("close") || "Tutup"} 
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#3A3B3C] hover:bg-gray-200 dark:hover:bg-[#4E4F50] text-gray-700 dark:text-[#E4E6EB] flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Comments List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 custom-scrollbar flex flex-col gap-4 pb-24">
          {isLoadingComments ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] shrink-0" />
                <div className="flex-1 flex flex-col gap-2 pt-1">
                  <div className="h-3 bg-gray-200 dark:bg-[#3A3B3C] rounded w-1/4" />
                  <div className="h-3 bg-gray-200 dark:bg-[#3A3B3C] rounded w-3/4" />
                </div>
              </div>
            ))
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500 h-full my-auto">
              <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-500 dark:text-[#B0B3B8] font-medium text-[15px]">
                {t("noCommentsYet") || "Belum ada komentar."}
              </p>
            </div>
          ) : (
            <>
              {comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  locale={locale}
                  t={tGlobal}
                  router={router}
                  currentUser={currentUser}
                  handleLikeComment={handleLikeComment}
                  handleReplyClick={handleReplyClick}
                  replyingTo={replyingTo}
                  isExpanded={isExpanded}
                  traceInfo={traceInfo}
                  setTraceInfo={setTraceInfo}
                  rootId={c.id}
                  bgColorClass="bg-white dark:bg-[#242526]"
                  renderCommentContent={renderCommentContent}
                  renderInput={(commentId: string) => {
                    if (replyingTo?.commentId !== commentId) return null;
                    return (
                      <InlineReplyInput
                        currentUser={currentUser}
                        t={tGlobal}
                        initialMention={{
                          username: (replyingTo as any).username,
                          id: (replyingTo as any).id,
                          displayName: replyingTo.name,
                          commentId: replyingTo.commentId,
                        }}
                        onCancel={() => setReplyingTo(null)}
                        onSubmit={async (text: string) => {
                          await handleInlineSubmit(text, replyingTo?.parentId || commentId);
                        }}
                      />
                    );
                  }}
                />
              ))}
              {nextCursor && (
                <button
                  onClick={() => fetchComments(nextCursor)}
                  className="text-purple-500 hover:underline text-[13px] font-semibold text-center w-full py-2"
                >
                  {tGlobal("postModal.loadMore") || "Muat lebih banyak komentar"}
                </button>
              )}
            </>
          )}
        </div>

        {/* Floating Comment Input (Exact same UI/UX as PostDetailModal) */}
        <CommentInput
          editor={editor}
          commentText={commentInput}
          isSubmitting={isSubmitting}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          handleSubmitComment={handleTopLevelSubmit}
          isEmojiOpen={isEmojiOpen}
          setIsEmojiOpen={setIsEmojiOpen}
          emojiRef={emojiRef}
          isOpen={isInputOpen}
          setIsOpen={setIsInputOpen}
        />
      </div>
    </div>,
    document.body
  );
}
