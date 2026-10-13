"use client";

import React, { useEffect, useState } from "react";
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
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isTall, setIsTall] = useState(false);
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const touchStartYRef = React.useRef(0);
  const startIsTallRef = React.useRef(false);
  const deltaYRef = React.useRef(0);

  const getHeights = () => {
    const windowH = typeof window !== "undefined" ? window.innerHeight : 800;
    const defaultH = Math.round(windowH * 0.80);
    const tallH = Math.round(windowH * 0.96);
    return { windowH, defaultH, tallH };
  };

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setIsTall(false);
      setDragOffset(0);
      setCurrentHeight(null);
      const frameId = requestAnimationFrame(() => {
        setIsMounted(true);
      });
      const prevBody = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        cancelAnimationFrame(frameId);
        document.body.style.overflow = prevBody;
      };
    } else {
      setIsMounted(false);
      setIsTall(false);
    }
  }, [isOpen]);

  const handleDismiss = React.useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setIsMounted(false);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDragOffset(0);
      setIsTall(false);
      setCurrentHeight(null);
    }, 280);
  }, [isClosing, onClose]);

  // Touch gesture for drag-up to expand and drag-down to shrink/dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    startIsTallRef.current = isTall;
    deltaYRef.current = 0;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartYRef.current;
    deltaYRef.current = deltaY;
    const { defaultH, tallH } = getHeights();
    const startH = startIsTallRef.current ? tallH : defaultH;

    if (deltaY < 0) {
      // Pulling UP (expanding height)
      const newH = Math.min(tallH + 10, startH + (-deltaY));
      setCurrentHeight(newH);
      setDragOffset(0);
    } else {
      // Pulling DOWN
      if (startIsTallRef.current) {
        const newH = startH - deltaY;
        if (newH >= defaultH) {
          setCurrentHeight(newH);
          setDragOffset(0);
        } else {
          setCurrentHeight(defaultH);
          setDragOffset(defaultH - newH);
        }
      } else {
        setCurrentHeight(defaultH);
        setDragOffset(deltaY);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setCurrentHeight(null);
    const deltaY = deltaYRef.current;
    const wasTall = startIsTallRef.current;

    if (wasTall) {
      if (deltaY > 160) {
        handleDismiss();
      } else if (deltaY > 40) {
        setIsTall(false);
        setDragOffset(0);
      } else {
        setIsTall(true);
        setDragOffset(0);
      }
    } else {
      if (deltaY < -35) {
        setIsTall(true);
        setDragOffset(0);
      } else if (deltaY > 75) {
        handleDismiss();
      } else {
        setIsTall(false);
        setDragOffset(0);
      }
    }
  };

  // Pointer gesture for desktop mobile-emulation support
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, textarea")) return;
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    const startY = e.clientY;
    startIsTallRef.current = isTall;
    deltaYRef.current = 0;
    setIsDragging(true);

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaY = moveEv.clientY - startY;
      deltaYRef.current = deltaY;
      const { defaultH, tallH } = getHeights();
      const startH = startIsTallRef.current ? tallH : defaultH;

      if (deltaY < 0) {
        // Pulling UP
        const newH = Math.min(tallH + 10, startH + (-deltaY));
        setCurrentHeight(newH);
        setDragOffset(0);
      } else {
        // Pulling DOWN
        if (startIsTallRef.current) {
          const newH = startH - deltaY;
          if (newH >= defaultH) {
            setCurrentHeight(newH);
            setDragOffset(0);
          } else {
            setCurrentHeight(defaultH);
            setDragOffset(defaultH - newH);
          }
        } else {
          setCurrentHeight(defaultH);
          setDragOffset(deltaY);
        }
      }
    };

    const onPointerUp = (upEv: PointerEvent) => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {}
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      setIsDragging(false);
      setCurrentHeight(null);
      const deltaY = deltaYRef.current;
      const wasTall = startIsTallRef.current;

      if (wasTall) {
        if (deltaY > 160) {
          handleDismiss();
        } else if (deltaY > 40) {
          setIsTall(false);
          setDragOffset(0);
        } else {
          setIsTall(true);
          setDragOffset(0);
        }
      } else {
        if (deltaY < -35) {
          setIsTall(true);
          setDragOffset(0);
        } else if (deltaY > 75) {
          handleDismiss();
        } else {
          setIsTall(false);
          setDragOffset(0);
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100000] flex flex-col justify-end overflow-hidden"
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Backdrop without blur */}
      <div 
        onClick={handleDismiss}
        className={`absolute inset-0 bg-black/45 dark:bg-black/65 transition-opacity duration-300 ease-out ${
          isMounted ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Slide-Up Native Sheet Card */}
      <div 
        className="relative w-full max-w-lg mx-auto bg-white dark:bg-[#242526] rounded-t-[28px] flex flex-col overflow-hidden shadow-2xl border-t border-gray-200/90 dark:border-[#3E4042] will-change-transform z-10"
        style={{
          height: currentHeight ? `${currentHeight}px` : isTall ? "96vh" : "80vh",
          maxHeight: "96vh",
          transform: isMounted 
            ? `translateY(${Math.max(0, dragOffset)}px)` 
            : "translateY(100%)",
          transition: isDragging 
            ? "none" 
            : "transform 280ms cubic-bezier(0.16, 1, 0.3, 1), height 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Native Drag Handle Bar & Header */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          className="flex flex-col shrink-0 select-none touch-none cursor-grab active:cursor-grabbing bg-white dark:bg-[#242526] border-b border-gray-200 dark:border-[#3E4042]"
        >
          {/* Top Pill Indicator */}
          <div className="w-full flex items-center justify-center pt-2.5 pb-1 pointer-events-none">
            <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 transition-colors" />
          </div>

          {/* Header Title */}
          <div className="flex items-center justify-between px-4 pb-2.5 pt-1">
            <h2 className="font-bold text-[17px] text-gray-900 dark:text-white flex items-center gap-2 pointer-events-none">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              {t("comments") || "Komentar"} <span className="text-gray-500 dark:text-[#B0B3B8] font-normal text-sm">({comments.length})</span>
            </h2>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 active:scale-90 active:bg-gray-100 dark:active:bg-[#3A3B3C] transition-all duration-150 select-none"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Comments List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 custom-scrollbar flex flex-col gap-4 pb-24 overscroll-contain">
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
                  className="text-purple-500 hover:underline active:scale-95 transition-transform duration-150 text-[13px] font-semibold text-center w-full py-2 select-none"
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
