"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import PostCard, { formatPostTime } from "./PostCard";
import { MediaRenderer } from "./MediaRenderer";
import { addComment, getComments, getCommentReplies } from "@/app/actions/interactions";
import { toggleLike } from "@/app/actions/interactions";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { searchUsersForMention } from '@/app/actions/profile';
import { getMentionSuggestion } from '@/utils/mentionSuggestion';
import CommentInput from "./CommentInput";
import { ReactionButton, ReactionType, REACTION_CONFIG } from "./ReactionButton";
import Image from "next/image";
import { ReactionSummaryPopup } from "./ReactionSummaryPopup";

import { commentsCache } from "@/utils/cache";

interface PostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
  currentUser: any;
  targetCommentId?: string;
}


export function CommentItem({
  comment,
  locale,
  t,
  router,
  currentUser,
  handleLikeComment,
  handleReplyClick,
  renderCommentContent,
  replyingTo,
  renderInput,
  depth = 0,
  isLast = false,
  isExpanded = false,
  parentCommentId,
  allThreadComments = [],
  traceInfo = null,
  setTraceInfo = () => { },
  rootId,
  bgColorClass = "bg-gray-50 dark:bg-[#18191A]",
  targetType = "post"
}: any) {
  const currentRootId = depth === 0 ? comment.id : rootId;
  const [replies, setReplies] = useState<any[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const nextThreadComments = [comment, ...Array.from(new Map([...replies, ...(comment.optimisticReplies || [])].map(r => [r.id, r])).values())];
  const currentThreadComments = depth === 0 ? nextThreadComments : allThreadComments;

  // Render input if this is the parent comment of the thread being replied to
  const isThreadActive = replyingTo?.parentId === comment.id;
  const inputElement = isThreadActive && renderInput
    ? renderInput(replyingTo?.commentId)
    : null;
  const replyCount = (comment._count?.replies || 0) + (comment.optimisticReplies?.length || 0);

  const [isLiked, setIsLiked] = useState<ReactionType | null>(comment.myReaction || null);
  const [likeCount, setLikeCount] = useState(comment._count?.likes || 0);
  const [topReactions, setTopReactions] = useState<ReactionType[]>(comment.topReactions || []);

  useEffect(() => {
    setIsLiked(comment.myReaction || null);
    setLikeCount(comment._count?.likes || 0);
    setTopReactions(comment.topReactions || []);
  }, [comment.myReaction, comment._count?.likes, comment.topReactions]);

  const { targetCommentId: globalTargetCommentId, targetParentId: globalTargetParentId } = comment.globalTarget || {};

  useEffect(() => {
    if (comment.optimisticReplies && comment.optimisticReplies.length > 0) {
      setShowReplies(true);
    }
  }, [comment.optimisticReplies]);

  useEffect(() => {
    if (globalTargetParentId && comment.id === globalTargetParentId) {
      if (!showReplies) {
        setShowReplies(true);
        if (replies.length === 0) {
          fetchReplies();
        }
      }
    }
  }, [globalTargetParentId, comment.id]);

  const onLikeClick = async (reactionType: ReactionType = "LIKE") => {
    if (!currentUser) return;
    const prevReaction = isLiked;
    const isSameReaction = prevReaction === reactionType;
    const isRemovingLike = prevReaction && isSameReaction;
    const isAddingLike = !prevReaction;

    if (isRemovingLike) {
      setIsLiked(null);
      setLikeCount((prev: number) => Math.max(0, prev - 1));
    } else {
      setIsLiked(reactionType);
      if (isAddingLike) setLikeCount((prev: number) => prev + 1);
    }
    
    // Optimistic reaction summary update
    if (!isRemovingLike) {
      setTopReactions((prev: ReactionType[]) => {
         const newTop = [reactionType, ...prev.filter((r: ReactionType) => r !== reactionType)];
         return newTop;
      });
    }

    try {
      await handleLikeComment(comment.id, reactionType);
    } catch (e) {
       // simple revert on error
       setIsLiked(prevReaction);
       if (isRemovingLike) setLikeCount((prev: number) => prev + 1);
       if (isAddingLike) setLikeCount((prev: number) => Math.max(0, prev - 1));
    }
  };

  const fetchReplies = async (cursor?: string) => {
    setIsLoading(true);
    const res = await getCommentReplies(comment.id, currentUser?.id, cursor, 5);
    if (res.success && res.replies) {
      setReplies(prev => cursor ? [...prev, ...res.replies] : res.replies);
      setNextCursor(res.nextCursor);
    }
    setIsLoading(false);
  };

  const handleToggleReplies = () => {
    if (!showReplies && replies.length === 0) {
      fetchReplies();
    }
    setShowReplies(!showReplies);
  };

  const isReplying = replyingTo?.commentId === comment.id;
  const isParentReplying = replyingTo?.commentId === parentCommentId;


  let targetComment: any = null;
  if (depth > 0 && comment.content) {
    const match = comment.content.match(/@\[(.*?)\]\(([^\)]+)\)/);
    if (match) {
      const parts = match[2].split('/');
      const targetUserId = parts[1] || parts[0];
      const targetCommentId = parts[2];
      const currentIndex = currentThreadComments.findIndex((c: any) => c.id === comment.id);
      if (currentIndex > 0) {
        for (let i = currentIndex - 1; i >= 0; i--) {
          const c = currentThreadComments[i];
          if (targetCommentId) {
            if (c.id === targetCommentId) {
              targetComment = c;
              break;
            }
          } else {
            if (c.author?.id === targetUserId || c.author?.username === targetUserId) {
              targetComment = c;
              break;
            }
          }
        }
      }
    }
  }

  const effectiveTraceInfo = traceInfo || (
    replyingTo && replyingTo.rootId === currentRootId ? {
      parentId: replyingTo.parentId || comment.id,
      targetId: replyingTo.commentId,
      sourceId: `input-${replyingTo.commentId}`
    } : null
  );

  const isTracingThisLine = effectiveTraceInfo && effectiveTraceInfo.sourceId === comment.id;
  const isTracingParentLine = effectiveTraceInfo && effectiveTraceInfo.parentId === comment.id;
  const isTargetOfTrace = effectiveTraceInfo && effectiveTraceInfo.targetId === comment.id;

  let isBetweenTrace = false;
  if (effectiveTraceInfo && effectiveTraceInfo.parentId === parentCommentId) {
    let sourceIndex = currentThreadComments.findIndex((c: any) => c.id === effectiveTraceInfo.sourceId);
    if (sourceIndex === -1 && effectiveTraceInfo.sourceId.startsWith('input-')) {
      sourceIndex = currentThreadComments.length;
    }
    const myIndex = currentThreadComments.findIndex((c: any) => c.id === comment.id);
    const targetIndex = currentThreadComments.findIndex((c: any) => c.id === effectiveTraceInfo.targetId);
    const startIndex = targetIndex >= 0 ? targetIndex : 0;

    if (myIndex > startIndex && myIndex < sourceIndex) {
      isBetweenTrace = true;
    }
  }

  const [traceStyle, setTraceStyle] = useState<{ top: string, height: string, bottom: string }>({ top: '0', height: '100%', bottom: '0' });

  const traceSourceId = effectiveTraceInfo?.sourceId;
  const traceTargetId = effectiveTraceInfo?.targetId;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isTracingParentLine && traceSourceId && traceTargetId) {
      // Delay slightly to ensure DOM (and heavy components like TipTap) are fully mounted and painted
      timeoutId = setTimeout(() => {
        const sourceEl = document.getElementById(`comment-${traceSourceId}`);
        const parentEl = document.getElementById(`comment-${comment.id}`);
        const targetEl = document.getElementById(`comment-${traceTargetId}`);

        if (sourceEl && parentEl) {
          const sourceRect = sourceEl.getBoundingClientRect();
          const parentRect = parentEl.getBoundingClientRect();
          const deltaYBottom = sourceRect.top - parentRect.top;

          let deltaYTop = 0;
          let isSiblingTarget = false;
          if (targetEl && traceTargetId !== comment.id) {
            const targetRect = targetEl.getBoundingClientRect();
            deltaYTop = targetRect.top - parentRect.top;
            isSiblingTarget = true;
          }

          const top = Math.max(0, isSiblingTarget ? deltaYTop : 0);
          const height = Math.max(0, (deltaYBottom - 16) - top);

          setTraceStyle(prev => {
            if (prev.top === `${top}px` && prev.height === `${height}px`) return prev;
            return { top: `${top}px`, height: `${height}px`, bottom: 'auto' };
          });
        }
      }, 50);
    } else {
      setTraceStyle(prev => {
        if (prev.top === '0' && prev.height === '100%') return prev;
        return { top: '0', height: '100%', bottom: '0' };
      });
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isTracingParentLine, traceSourceId, traceTargetId, comment.id, isLoading, currentThreadComments.length]);

  const handleJumpToComment = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    const currentTraceId = Date.now();
    setTraceInfo({ sourceId: comment.id, parentId: parentCommentId, targetId, traceId: currentTraceId });
    const el = document.getElementById(`comment-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setTraceInfo((prev: any) => prev?.traceId === currentTraceId ? null : prev);
    }, 3000); // Remove trace after 3s
  };

  return (
    <>
      <div id={`comment-${comment.id}`} className={`flex gap-3 group relative transition-all duration-300 ${comment.isOptimistic ? 'opacity-70' : 'opacity-100'} ${depth > 0 ? 'mt-3' : ''}`}>
        {depth > 0 && (
          <div className={`absolute -left-[33px] top-[-16px] w-[49px] h-[32px] border-b-[1.5px] border-l-[1.5px] rounded-bl-[12px] z-30 transition-all duration-300 ease-out ${isTracingThisLine ? 'border-b-blue-500 border-l-blue-500' : ((isParentReplying || isBetweenTrace) ? 'border-b-[#ECECEC] dark:border-b-[#333538] border-l-blue-500' : 'border-[#ECECEC] dark:border-[#333538]')}`} />
        )}
        {depth > 0 && isTargetOfTrace && effectiveTraceInfo?.targetId !== effectiveTraceInfo?.parentId && (
          <div className="absolute -left-[33px] top-[14px] w-[49px] h-[18px] border-t-[1.5px] border-l-[1.5px] border-blue-500 rounded-tl-[12px] z-40 pointer-events-none transition-all duration-300 ease-out" />
        )}
        {depth > 0 && isLast && (
          <div className={`absolute -left-[34px] top-[4px] bottom-[-50px] w-[4px] z-20 ${bgColorClass}`} />
        )}
        {(showReplies || inputElement) && depth < 2 && (
          <div className={`absolute left-[15px] top-[32px] bottom-[24px] border-l-[1.5px] ${isReplying ? 'border-blue-500' : 'border-[#ECECEC] dark:border-[#333538]'} z-10`}>
            {!isReplying && isTracingParentLine && (
              <div
                className="absolute -left-[1.5px] w-[1.5px] bg-blue-500 transition-all duration-300 ease-out z-20"
                style={traceStyle}
              />
            )}
          </div>
        )}
        {isReplying && depth >= 2 && inputElement && (
          <div className="absolute left-[15px] top-[32px] bottom-[-28px] border-l-[1.5px] border-blue-500 z-10" />
        )}
        <img src={comment.author?.profile?.avatarUrl || "/default-avatar.svg"} alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0 cursor-pointer relative z-50" onClick={() => router.push(`/${locale}/p/${comment.author?.username}/${comment.author?.id}`)} />
        <div className="flex-1 relative z-40">
          <div className="group/comment relative">
          <button type="button" aria-label={t("postModal.more") || "Opsi lainnya"} className="absolute right-0 top-0 opacity-0 group-hover/comment:opacity-100 p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:text-[#B0B3B8] dark:hover:bg-[#3A3B3C] transition-all shrink-0">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
          </button>
          <div className="flex items-center gap-1.5 flex-wrap pr-6">
            <h4 className="font-semibold text-[13px] text-gray-900 dark:text-[#E4E6EB] cursor-pointer hover:underline" onClick={() => router.push(`/${locale}/p/${comment.author?.username}/${comment.author?.id}`)}>
              {comment.author?.profile?.displayName || comment.author?.username}
            </h4>
            <span className="text-gray-400 dark:text-gray-500 text-[11px] select-none">|</span>
            <span className="text-[12px] text-gray-500 dark:text-gray-400 font-normal flex items-center gap-1.5">
              {comment.isOptimistic ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
                  <span className="text-blue-500 font-medium text-[11.5px]">
                    {(() => {
                      const txt = t("postModal.sending");
                      return (!txt || txt === "postModal.sending") ? (locale === "en" ? "Sending..." : "Mengirim...") : txt;
                    })()}
                  </span>
                </>
              ) : (
                formatPostTime(comment.createdAt, t, locale)
              )}
            </span>
          </div>
          <p className="text-[14.5px] text-gray-900 dark:text-[#E4E6EB] mt-0.5 whitespace-pre-wrap">{renderCommentContent(comment.content)}</p>

          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-gray-600 dark:text-gray-400 mt-1.5">
            {topReactions.length > 0 && (
              <div className="flex items-center -space-x-1 z-0 mr-1 cursor-pointer hover:opacity-80">
                {topReactions.map((r, i) => (
                  <ReactionSummaryPopup key={r} targetId={comment.id} targetType="COMMENT" likeCount={likeCount} topReactions={topReactions} filterReactionType={r}>
                    <div className="w-[16px] h-[16px] rounded-full bg-white dark:bg-[#242526] relative z-10 flex items-center justify-center shadow-sm hover:z-20">
                      <Image src={REACTION_CONFIG[r].src} alt={r} fill className="object-contain" />
                    </div>
                  </ReactionSummaryPopup>
                ))}
              </div>
            )}
            {targetComment && (
              <button onClick={(e) => handleJumpToComment(e, targetComment.id)} aria-label="Lihat target komentar" className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] px-2 py-1.5 rounded-full transition-colors -ml-2">
                <img src="/answer.svg" alt="Answer" className="w-[14px] h-[14px] opacity-60 dark:invert" />
              </button>
            )}
            
            <ReactionButton 
              myReaction={isLiked} 
              onReact={comment.isOptimistic ? () => {} : onLikeClick} 
              count={likeCount} 
              hideTooltip={true}
              containerClassName={`!flex-none ${!targetComment ? '-ml-2' : ''} ${comment.isOptimistic ? 'pointer-events-none opacity-50' : ''}`}
              className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] px-2 py-1.5 rounded-full transition-colors bg-transparent"
            />

            <button 
              disabled={comment.isOptimistic}
              onClick={() => {
                const parentIdForDB = depth >= 2 ? comment.parentId : comment.id;
                handleReplyClick(comment.author?.username, comment.author?.id, comment.author?.profile?.displayName || comment.author?.username, comment.id, parentIdForDB, currentRootId);
              }} 
              className={`flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] px-3 py-1.5 rounded-full transition-colors ${comment.isOptimistic ? 'pointer-events-none opacity-50' : ''}`}
            >
              <img src="/reply.svg" alt="Reply" className="w-[16px] h-[16px] opacity-60 dark:invert" />
              {t("postModal.reply") || "Balas"}
            </button>
          </div>
          </div>

          {(replyCount > 0 || inputElement) && depth < 2 && (
            <div className="mt-2 ml-1 relative">
              {replyCount > 0 && (
                <button onClick={handleToggleReplies} className="flex items-center gap-1 text-[#A8A8A8] hover:underline text-[13px] font-semibold relative z-10">
                  {showReplies ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      {t("postModal.hideReplies") || "Sembunyikan balasan"}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      {t("postModal.viewReplies", { count: replyCount }) || `Lihat ${replyCount} balasan`}
                    </>
                  )}
                </button>
              )}

              {(showReplies || inputElement) && (
                <div className="mt-3 relative">
                  {showReplies && Array.from(new Map([...replies, ...(comment.optimisticReplies || [])].map(r => [r.id, r])).values()).map((reply: any, index, arr) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      locale={locale}
                      t={t}
                      router={router}
                      currentUser={currentUser}
                      handleLikeComment={handleLikeComment}
                      handleReplyClick={handleReplyClick}
                      renderCommentContent={renderCommentContent}
                      replyingTo={replyingTo}
                      renderInput={renderInput}
                      depth={depth + 1}
                      isLast={index === arr.length - 1 && !inputElement && !isLoading}
                      isExpanded={isExpanded}
                      parentCommentId={comment.id}
                      allThreadComments={nextThreadComments}
                      traceInfo={traceInfo}
                      setTraceInfo={setTraceInfo}
                      rootId={currentRootId}
                      bgColorClass={bgColorClass}
                      targetType={targetType}
                    />
                  ))}

                  {isLoading && (
                    <div className="relative mt-3">
                      <div className={`absolute -left-[33px] top-[-16px] w-[49px] h-[32px] border-b-[1.5px] border-l-[1.5px] ${isReplying ? 'border-blue-500' : 'border-[#ECECEC] dark:border-[#333538]'} rounded-bl-[12px] z-30`} />
                      {!inputElement && (
                        <div className={`absolute -left-[34px] top-[4px] bottom-[-50px] w-[4px] z-20 ${bgColorClass}`} />
                      )}
                      <div className="relative z-40 flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] animate-pulse shrink-0"></div>
                        <div className="flex-1 flex flex-col gap-2 pt-1">
                          <div className="h-3 bg-gray-200 dark:bg-[#3A3B3C] rounded-full w-1/3 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 dark:bg-[#3A3B3C] rounded-full w-2/3 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {inputElement && (
                    <div id={`comment-input-${replyingTo?.commentId}`} className="relative mt-3">
                      <div className="absolute -left-[33px] top-[-16px] w-[49px] h-[32px] border-b-[1.5px] border-l-[1.5px] border-blue-500 rounded-bl-[12px] z-30" />
                      <div className={`absolute -left-[34px] top-[4px] bottom-[-50px] w-[4px] z-20 ${bgColorClass}`} />
                      <div className="relative z-40">
                        {inputElement}
                      </div>
                    </div>
                  )}

                  {nextCursor && !isLoading && (
                    <button onClick={() => fetchReplies(nextCursor)} className="text-blue-500 hover:underline text-[12px] font-semibold mt-2 ml-11">
                      {t("postModal.loadMoreReplies") || "Muat balasan lainnya"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isReplying && depth >= 2 && inputElement && (
        <div className="relative mt-3">
          {isLast && (
            <div className={`absolute -left-[34px] top-[-50px] bottom-[-50px] w-[4px] z-20 ${bgColorClass}`} />
          )}
          <div className="relative z-40">
            {inputElement}
          </div>
        </div>
      )}
    </>
  );
}

export function InlineReplyInput({ currentUser, onSubmit, onCancel, initialMention, t }: { currentUser: any, onSubmit: (text: string) => Promise<void>, onCancel: () => void, initialMention: any, t: any }) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  const [inputHeight, setInputHeight] = useState<number | 'auto'>('auto');
  const startY = useRef(0);
  const startHeight = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore fallback
    }

    startY.current = e.clientY;
    startHeight.current = formRef.current ? formRef.current.clientHeight : 80;

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const delta = moveEvent.clientY - startY.current;
      setInputHeight(Math.max(70, Math.min(600, startHeight.current + delta)));
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
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;

    startY.current = touch.clientY;
    startHeight.current = formRef.current ? formRef.current.clientHeight : 80;

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.cancelable) moveEvent.preventDefault();
      const currentTouch = moveEvent.touches[0];
      if (!currentTouch) return;
      const delta = currentTouch.clientY - startY.current;
      setInputHeight(Math.max(70, Math.min(600, startHeight.current + delta)));
    };

    const onTouchEnd = () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setIsEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const getMentionsText = (ed: any) => {
    const json = ed.getJSON();
    let txt = '';
    const parseNode = (node: any) => {
      if (node.type === 'text') txt += node.text;
      if (node.type === 'mention') txt += `@[${node.attrs.label}](${node.attrs.id})`;
      if (node.type === 'paragraph' && txt !== '') txt += '\n';
      if (node.content) node.content.forEach(parseNode);
    }
    if (json.content) json.content.forEach(parseNode);
    return txt.trim();
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ bold: false, italic: false, strike: false, code: false, codeBlock: false, heading: false, bulletList: false, orderedList: false, listItem: false, blockquote: false, horizontalRule: false }),
      Placeholder.configure({
        placeholder: t("postModal.writeReply") || "Tulis balasan...",
        emptyEditorClass: 'is-editor-empty text-gray-400',
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'text-blue-500 dark:text-blue-400 font-bold underline cursor-pointer bg-blue-50 dark:bg-blue-900/30 rounded px-1',
        },
        suggestion: getMentionSuggestion(),
      }),
    ],
    onUpdate: ({ editor }) => {
      setText(getMentionsText(editor));
    },
    editorProps: {
      attributes: {
        class: 'w-full min-h-[24px] max-h-[120px] overflow-y-auto outline-none custom-scrollbar',
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          const popup = document.querySelector('.tippy-box');
          if (popup) return false;
          event.preventDefault();
          handleSubmit(new Event('submit') as any);
          return true;
        }
        return false;
      },
    },
  });

  // Mention is now displayed in the header instead of injected into the editor

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const mentionString = `@[${initialMention.displayName}](${initialMention.username}/${initialMention.id}${initialMention.commentId ? `/${initialMention.commentId}` : ''})`;
    await onSubmit(`${mentionString} ${text}`);
    setIsSubmitting(false);
  };

  return (
    <div className="mt-3 flex gap-2 items-start w-full pr-2">
      <img src={currentUser?.profile?.avatarUrl || "/default-avatar.svg"} alt="Avatar" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 relative z-50" />
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        style={{ height: inputHeight === 'auto' ? 'auto' : `${inputHeight}px` }}
        className="flex-1 flex flex-col bg-white dark:bg-[#3A3B3C] border border-gray-300 dark:border-[#4E4F50] rounded-xl overflow-visible focus-within:border-gray-400 dark:focus-within:border-gray-500 transition-colors relative"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-[#4E4F50]/50 bg-gray-50/50 dark:bg-transparent rounded-t-xl">
          <span className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">
            Membalas <span className="font-bold text-blue-500 dark:text-blue-400">@{initialMention.displayName}</span>
          </span>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Input Area */}
        <div
          className="flex-1 px-3 py-2 cursor-text text-[14px] overflow-y-auto custom-scrollbar"
          onClick={() => editor?.chain().focus().run()}
        >
          <style>{`
            .ProseMirror { outline: none; white-space: pre-wrap; word-break: break-word; color: #111827; min-height: 100%; }
            :is(.dark .ProseMirror) { color: #E4E6EB; }
            .ProseMirror p.is-editor-empty:first-child::before { color: #9ca3af; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
            .ProseMirror p { margin: 0; }
          `}</style>
          <EditorContent editor={editor} className="h-full" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-[#2c2d2e]/50 border-t border-gray-100 dark:border-[#4E4F50]/50 rounded-b-xl relative">
          <div className="flex-1"></div>

          {/* Drag Indicator */}
          <div
            className="flex justify-center items-end absolute left-1/2 -translate-x-1/2 bottom-0 w-32 h-6 cursor-ns-resize pb-1.5 z-10 touch-none select-none active:cursor-grabbing"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onTouchStart={handleTouchStart}
          >
            <div className="w-8 h-1 rounded-full bg-gray-400 hover:bg-gray-500 dark:bg-gray-500 dark:hover:bg-gray-400 transition-colors pointer-events-none"></div>
          </div>

          {/* Actions */}
          <div className="flex-1 flex justify-end items-center gap-1">
            <div ref={emojiRef} className="relative">
              <button type="button" onClick={() => setIsEmojiOpen(o => !o)} className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
              {isEmojiOpen && (
                <div className="absolute bottom-full right-0 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden picker-container">
                  <style>{`.picker-container em-emoji-picker{height:280px !important;min-height:280px !important;max-height:280px !important;width:328px !important;max-width:calc(100vw - 2rem) !important;}`}</style>
                  <Picker data={data} onEmojiSelect={(e: any) => {
                    if (editor) editor.chain().focus().insertContent(e.native).run();
                  }} theme={document.documentElement.classList.contains("dark") ? "dark" : "light"} previewPosition="none" skinTonePosition="search" />
                </div>
              )}
            </div>
            <button type="submit" disabled={!text.trim() || isSubmitting} className="p-1.5 text-blue-500 hover:text-blue-600 disabled:text-gray-400 dark:disabled:text-gray-500 transition-colors">
              <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function PostDetailModal({ isOpen, onClose, post, currentUser, targetCommentId }: PostDetailModalProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  const [isLiked, setIsLiked] = useState(post.hasLiked || false);
  const [likeCount, setLikeCount] = useState(post._count?.likes || 0);

  const endOfCommentsRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string, name: string, parentId?: string, username?: string, id?: string, rootId?: string } | null>(null);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [traceInfo, setTraceInfo] = useState<{ sourceId: string, parentId: string, targetId: string, traceId: number } | null>(null);
  const [targetParentId, setTargetParentId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && targetCommentId) {
      import("@/app/actions/interactions").then(module => {
        module.getTargetCommentInfo(targetCommentId).then(res => {
          if (res.success && res.parentId) {
            setTargetParentId(res.parentId);
          }
        });
      });
    } else {
      setTargetParentId(null);
    }
  }, [isOpen, targetCommentId]);

  // Focus helper for MentionsInput
  const handleReplyClick = (username: string, id: string, displayName: string, exactCommentId: string, parentIdForDB?: string, rootId?: string) => {
    setReplyingTo({ commentId: exactCommentId, name: displayName, parentId: parentIdForDB, username, id, rootId });
  };

  const getMentionsText = (ed: any) => {
    const json = ed.getJSON();
    let text = '';
    const parseNode = (node: any) => {
      if (node.type === 'text') text += node.text;
      if (node.type === 'mention') text += `@[${node.attrs.label}](${node.attrs.id})`;
      if (node.type === 'paragraph' && text !== '') text += '\n';
      if (node.content) node.content.forEach(parseNode);
    }
    if (json.content) json.content.forEach(parseNode);
    return text.trim();
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ bold: false, italic: false, strike: false, code: false, codeBlock: false, heading: false, bulletList: false, orderedList: false, listItem: false, blockquote: false, horizontalRule: false }),
      Placeholder.configure({
        placeholder: t("postModal.writeComment") || "Tulis komentar...",
        emptyEditorClass: 'is-editor-empty text-gray-400',
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'text-blue-500 dark:text-blue-400 font-bold underline cursor-pointer bg-blue-50 dark:bg-blue-900/30 rounded px-1',
        },
        suggestion: getMentionSuggestion(),
      }),
    ],
    onUpdate: ({ editor }) => {
      setCommentText(getMentionsText(editor));
    },
    editorProps: {
      attributes: {
        class: 'w-full min-h-[24px] max-h-[120px] overflow-y-auto outline-none custom-scrollbar',
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          if (document.getElementById('mention-popup-container')) {
            return false;
          }
          event.preventDefault();
          if (commentText.trim() && !isSubmitting) {
            handleSubmitComment(event as any);
          }
          return true;
        }
        return false;
      }
    },
  });

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setIsEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      fetchComments();
    }
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isOpen, post.id]);

  // Auto-scroll to target comment from notification deep link
  useEffect(() => {
    if (!isOpen || !targetCommentId || comments.length === 0) return;
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(`comment-${targetCommentId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-blue-400', 'ring-offset-1', 'rounded-xl', 'transition-all');
        setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-1'), 2500);
      } else if (attempts < 12) {
        attempts++;
        setTimeout(tryScroll, 400);
      }
    };
    setTimeout(tryScroll, 300);
  }, [isOpen, targetCommentId, comments]);

  const fetchComments = async (cursor?: string) => {
    // If cache exists and this is an initial load (no cursor), use cache directly — no network call.
    if (!cursor) {
      const cached = commentsCache.get(post.id);
      if (cached) {
        setComments(cached.comments);
        setNextCursor(cached.nextCursor);
        setIsLoadingComments(false);
        return; // ← stop here, no fetch
      }
      setIsLoadingComments(true);
    }
    const res = await getComments("post", post.id, currentUser?.id, cursor, 20);
    if (res.success) {
      if (cursor) {
        setComments(prev => {
          const next = [...prev, ...(res.comments || [])];
          commentsCache.set(post.id, { comments: next, nextCursor: res.nextCursor });
          return next;
        });
      } else {
        commentsCache.set(post.id, { comments: res.comments || [], nextCursor: res.nextCursor });
        setComments(res.comments || []);
      }
      setNextCursor(res.nextCursor);
    }
    if (!cursor) setIsLoadingComments(false);
  };

  const handleLike = async () => {
    if (!currentUser) return;
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount((prev: number) => newLiked ? prev + 1 : Math.max(0, prev - 1));
    await toggleLike(currentUser.id, "post", post.id);
  };

  const handleInlineSubmit = async (text: string, parentId: string, rootId?: string) => {
    if (!currentUser) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const optimisticComment = {
      id: tempId,
      content: text,
      createdAt: new Date().toISOString(),
      parentId,
      authorId: currentUser.id,
      author: {
        id: currentUser.id,
        username: currentUser.username,
        profile: {
          displayName: currentUser.profile?.displayName || currentUser.username,
          avatarUrl: currentUser.profile?.avatarUrl || "/default-avatar.svg"
        }
      },
      _count: { likes: 0, replies: 0 },
      topReactions: [],
      myReaction: null,
      isOptimistic: true
    };

    // Recursive helper to append reply to parent or root
    const appendReply = (commentsList: any[], targetParentId: string, fallbackRootId?: string): { updated: boolean, list: any[] } => {
      let updated = false;
      const newList = commentsList.map(c => {
        if (c.id === targetParentId) {
          updated = true;
          return {
            ...c,
            _count: { ...c._count, replies: (c._count?.replies || 0) + 1 },
            optimisticReplies: [...(c.optimisticReplies || []), optimisticComment]
          };
        }
        if (c.optimisticReplies && c.optimisticReplies.length > 0) {
          const res = appendReply(c.optimisticReplies, targetParentId, fallbackRootId);
          if (res.updated) {
            updated = true;
            return {
              ...c,
              optimisticReplies: res.list
            };
          }
        }
        return c;
      });

      if (!updated && fallbackRootId) {
        return {
          updated: true,
          list: newList.map(c => {
            if (c.id === fallbackRootId) {
              return {
                ...c,
                _count: { ...c._count, replies: (c._count?.replies || 0) + 1 },
                optimisticReplies: [...(c.optimisticReplies || []), optimisticComment]
              };
            }
            return c;
          })
        };
      }

      return { updated, list: newList };
    };

    // Recursive helper to replace tempId with real comment or remove if failed
    const updateOrRemoveReply = (commentsList: any[], targetTempId: string, realItem: any | null): any[] => {
      return commentsList.map(c => {
        if (c.optimisticReplies && c.optimisticReplies.length > 0) {
          const hasTarget = c.optimisticReplies.some((r: any) => r.id === targetTempId);
          if (hasTarget) {
            const nextReplies = realItem
              ? c.optimisticReplies.map((r: any) => r.id === targetTempId ? realItem : r)
              : c.optimisticReplies.filter((r: any) => r.id !== targetTempId);
            return {
              ...c,
              _count: realItem ? c._count : { ...c._count, replies: Math.max(0, (c._count?.replies || 1) - 1) },
              optimisticReplies: nextReplies
            };
          }
          return {
            ...c,
            optimisticReplies: updateOrRemoveReply(c.optimisticReplies, targetTempId, realItem)
          };
        }
        return c;
      });
    };

    // 1. Instantly show reply in UI and close input box
    setComments(prev => appendReply(prev, parentId, rootId).list);
    setReplyingTo(null);

    // 2. Perform background request
    try {
      const res = await addComment(currentUser.id, "post", post.id, text, parentId);
      if (res.success && res.comment) {
        setComments(prev => updateOrRemoveReply(prev, tempId, res.comment));
      } else {
        setComments(prev => updateOrRemoveReply(prev, tempId, null));
      }
    } catch (err) {
      console.error("Error submitting inline reply:", err);
      setComments(prev => updateOrRemoveReply(prev, tempId, null));
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = commentText.trim();
    if (!textToSend || !currentUser || isSubmitting) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const optimisticComment = {
      id: tempId,
      content: textToSend,
      createdAt: new Date().toISOString(),
      parentId: null,
      authorId: currentUser.id,
      author: {
        id: currentUser.id,
        username: currentUser.username,
        profile: {
          displayName: currentUser.profile?.displayName || currentUser.username,
          avatarUrl: currentUser.profile?.avatarUrl || "/default-avatar.svg"
        }
      },
      _count: { likes: 0, replies: 0 },
      topReactions: [],
      myReaction: null,
      isOptimistic: true
    };

    // 1. Instantly clear input & show comment in list
    setCommentText("");
    if (editor) editor.commands.clearContent();
    setComments(prev => [optimisticComment, ...prev]);

    // 2. Perform background request
    setIsSubmitting(true);
    try {
      const res = await addComment(currentUser.id, "post", post.id, textToSend);
      if (res.success && res.comment) {
        setComments(prev => {
          const next = prev.map(c => c.id === tempId ? res.comment : c);
          commentsCache.set(post.id, { comments: next, nextCursor });
          return next;
        });
      } else {
        setComments(prev => prev.filter(c => c.id !== tempId));
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
      setComments(prev => prev.filter(c => c.id !== tempId));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string, reactionType: string = "LIKE") => {
    if (!currentUser) return;
    try {
      await toggleLike(currentUser.id, "comment", commentId, reactionType);
      // Optional: optimistic UI update for comment likes here
    } catch (error) {
      console.error("Error toggling comment like:", error);
    }
  };

  // fetchUsers function is now in mentionSuggestion

  const renderCommentContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(@\[.*?\]\([^\)]+\))/g);
    return parts.map((part, i) => {
      const match = part.match(/@\[(.*?)\]\(([^\)]+)\)/);
      if (match) {
        const username = match[2].split('/')[0];
        const id = match[2].split('/')[1] || username;
        const isCurrentUser = currentUser && (id === currentUser.id || username === currentUser.username);
        const colorClass = isCurrentUser ? "text-blue-500 font-semibold bg-blue-50 dark:bg-blue-900/30 px-1 rounded" : "text-sky-500 dark:text-sky-400";
        return <span key={i} className={`${colorClass} cursor-pointer hover:underline`} onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/p/${username}/${id}`); }}>@{match[1]}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-0 md:p-4 bg-black/40 dark:bg-black/60 overscroll-contain" onWheel={e => e.stopPropagation()}>

      <div className={`w-full ${isExpanded ? 'md:max-w-2xl' : 'md:max-w-4xl'} h-full md:h-[95vh] md:max-h-[95vh] bg-white dark:bg-[#242526] rounded-none md:rounded-xl flex flex-col md:flex-row overflow-hidden shadow-none md:shadow-2xl border-0 md:border border-gray-200 dark:border-[#3E4042] relative transition-all duration-300`} onClick={e => e.stopPropagation()}>

        {/* MOBILE TOP HEADER (MOBILE ONLY) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#3E4042] bg-white dark:bg-[#242526] shrink-0 z-10">
          <h2 className="font-bold text-[17px] text-gray-900 dark:text-white">
            {t("postModal.postHeader") || "Postingan"}
          </h2>
          <button 
            onClick={onClose} 
            aria-label={t("postModal.close") || "Close"} 
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#3A3B3C] hover:bg-gray-200 dark:hover:bg-[#4E4F50] text-gray-700 dark:text-[#E4E6EB] flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* LEFT COLUMN - POST CONTENT (DESKTOP ONLY) */}
        {!isExpanded && (
          <div className="hidden md:flex md:w-[50%] lg:w-[52%] flex-col overflow-y-auto border-r border-gray-200 dark:border-[#3E4042] custom-scrollbar bg-[#F3F2EF] dark:bg-[#18191A]">
            <div className="w-full shrink-0 min-h-full p-2 pb-4">
              <PostCard post={post} currentUser={currentUser} hideFooter={true} disableClicks={true} showAllReactions={true} />
            </div>
          </div>
        )}

        {/* RIGHT COLUMN - COMMENTS (DESKTOP) / UNIFIED POST & COMMENTS (MOBILE) */}
        <div className={`w-full flex-1 md:flex-initial min-h-0 flex flex-col md:h-full relative ${isExpanded ? 'md:w-full lg:w-full bg-gray-50 dark:bg-[#18191A]' : 'md:w-[50%] lg:w-[48%] bg-gray-50 dark:bg-[#18191A]'}`}>
          <div className="flex flex-col h-full w-full">
            {/* DESKTOP HEADER (HIDDEN ON MOBILE) */}
            <div className="hidden md:flex p-4 border-b border-gray-200 dark:border-[#3A3B3C] shrink-0 bg-white dark:bg-[#242526] items-center justify-between">
              <h2 className="font-bold text-[18px] text-gray-900 dark:text-white">{t("postModal.title") || "Komentar"}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsExpanded(!isExpanded)} aria-label="Expand" className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] hover:bg-gray-300 dark:hover:bg-[#4E4F50] text-gray-700 dark:text-[#E4E6EB] flex items-center justify-center transition-colors">
                  {isExpanded ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L3 21M9 15h-6M9 15v6M15 9l6-6M15 9h6M15 9v-6" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                  )}
                </button>
                <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] hover:bg-gray-300 dark:hover:bg-[#4E4F50] text-gray-700 dark:text-[#E4E6EB] flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-24 custom-scrollbar flex flex-col gap-4">
              {/* MOBILE ONLY: POST COMPONENT INTEGRATED AT TOP */}
              <div className="md:hidden -mx-4 -mt-4 mb-1 bg-[#F3F2EF] dark:bg-[#18191A] border-b border-gray-200 dark:border-[#3E4042]">
                <PostCard post={post} currentUser={currentUser} hideFooter={true} disableClicks={true} showAllReactions={true} />
              </div>

              {/* MOBILE ONLY: COMMENTS SECTION LABEL */}
              <div className="md:hidden font-bold text-[16px] text-gray-900 dark:text-white px-0 pt-1">
                {t("postModal.title") || "Komentar"}
              </div>
              {isLoadingComments ? (
                <>
                  {["w-3/4", "w-1/2", "w-2/3", "w-4/5"].map((w, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-[#3A3B3C] shrink-0" />
                      <div className="flex-1 mt-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="h-3 w-24 rounded bg-gray-300 dark:bg-[#4E4F50]" />
                          <div className="h-2.5 w-16 rounded bg-gray-200 dark:bg-[#3A3B3C]" />
                        </div>
                        <div className={`h-3 ${w} rounded bg-gray-300 dark:bg-[#4E4F50] mb-1.5`} />
                        <div className="h-3 w-1/3 rounded bg-gray-300 dark:bg-[#4E4F50] mb-2.5" />

                        <div className="flex items-center gap-4">
                          <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-[#3A3B3C]" />
                          <div className="h-4 w-12 rounded bg-gray-200 dark:bg-[#3A3B3C]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500 h-full">
                  <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <p>{t("postModal.noComments") || "Belum ada komentar. Jadilah yang pertama!"}</p>
                </div>
              ) : (
                <>
                  {comments.map(c => (
                    <CommentItem
                      key={c.id}
                      comment={{...c, globalTarget: { targetCommentId, targetParentId }}}
                      locale={locale}
                      t={t}
                      router={router}
                      currentUser={currentUser}
                      handleLikeComment={handleLikeComment}
                      handleReplyClick={handleReplyClick}
                      renderCommentContent={renderCommentContent}
                      replyingTo={replyingTo}
                      isExpanded={isExpanded}
                      traceInfo={traceInfo}
                      setTraceInfo={setTraceInfo}
                      rootId={c.id}
                      renderInput={(commentId: string) => {
                        if (replyingTo?.commentId !== commentId) return null;
                        return (
                          <InlineReplyInput
                            currentUser={currentUser}
                            t={t}
                            initialMention={{
                              username: (replyingTo as any).username,
                              id: (replyingTo as any).id,
                              displayName: replyingTo.name,
                              commentId: replyingTo.commentId
                            }}
                            onCancel={() => setReplyingTo(null)}
                            onSubmit={(text) => handleInlineSubmit(text, replyingTo.parentId!, replyingTo.rootId)}
                          />
                        );
                      }}
                    />
                  ))}
                  {nextCursor && (
                    <button
                      onClick={() => fetchComments(nextCursor)}
                      className="text-blue-500 hover:underline text-sm font-semibold text-center w-full py-2"
                    >
                      {t("postModal.loadMore") || "Muat lebih banyak"}
                    </button>
                  )}
                  <div ref={endOfCommentsRef} />
                </>
              )}
            </div>

            <CommentInput
              editor={editor}
              commentText={commentText}
              isSubmitting={isSubmitting}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              handleSubmitComment={handleSubmitComment}
              isEmojiOpen={isEmojiOpen}
              setIsEmojiOpen={setIsEmojiOpen}
              emojiRef={emojiRef}
              isOpen={isInputOpen}
              setIsOpen={setIsInputOpen}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
