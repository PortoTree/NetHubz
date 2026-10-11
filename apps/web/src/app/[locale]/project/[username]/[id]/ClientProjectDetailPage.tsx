"use client";

import React, { useEffect, useState, useCallback, use, useRef } from "react";
import { useTranslations } from "next-intl";
import { getProjectById } from "@/app/actions/projects";
import { getOptimizedUrl } from "@/utils/cloudinary";
import { getProfile } from "@/app/actions/profile";
import { toggleLike, addComment, getComments, getCommentReplies, checkInteractionState, toggleSave } from "@/app/actions/interactions";
import { interactionsCache } from "@/utils/cache";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import Link from "next/link";
import { MediaRenderer } from "@/components/MediaRenderer";
import { useRouter } from "next/navigation";
import FloatingUserMenu from "@/components/FloatingUserMenu";
import FloatingProjectHubBtn from "@/components/FloatingProjectHubBtn";
import { ReactionButton, ReactionType } from "@/components/ReactionButton";
import { ProjectReactionListDropdown } from "@/components/ProjectReactionListDropdown";
import { formatPostTime } from "@/components/PostCard";
import { CommentItem, InlineReplyInput } from "@/components/PostDetailModal";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { getMentionSuggestion } from "@/utils/mentionSuggestion";
import toast from "react-hot-toast";
import SaveToFolderModal from "@/components/SaveToFolderModal";
import { useShareModal } from "@/contexts/ShareContext";


// ─── Gallery ─────────────────────────────────────────────────────────────────

const ProjectGallery = ({ mediaUrls }: { mediaUrls: string[] }) => {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  if (!mediaUrls || mediaUrls.length === 0) return null;

  const handleNext = (e?: React.MouseEvent) => { e?.stopPropagation(); if (selectedMediaIndex !== null) setSelectedMediaIndex((selectedMediaIndex + 1) % mediaUrls.length); };
  const handlePrev = (e?: React.MouseEvent) => { e?.stopPropagation(); if (selectedMediaIndex !== null) setSelectedMediaIndex((selectedMediaIndex - 1 + mediaUrls.length) % mediaUrls.length); };

  const renderGrid = () => {
    if (mediaUrls.length === 1) return (
      <div onClick={() => setSelectedMediaIndex(0)} className="w-full aspect-video bg-black rounded-none overflow-hidden mb-8 shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
        <MediaRenderer url={mediaUrls[0]} className="w-full h-full object-contain mx-auto" variant="detail" />
      </div>
    );
    if (mediaUrls.length === 2) return (
      <div className="grid grid-cols-2 gap-1 mb-8 aspect-[2/1]">
        {mediaUrls.map((url, i) => <div key={i} onClick={() => setSelectedMediaIndex(i)} className="w-full h-full bg-black rounded-none overflow-hidden shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"><MediaRenderer url={url} className="w-full h-full object-cover mx-auto" variant="detail" /></div>)}
      </div>
    );
    if (mediaUrls.length === 3) return (
      <div className="grid grid-cols-3 grid-rows-2 gap-1 mb-8 aspect-[2/1]">
        <div onClick={() => setSelectedMediaIndex(0)} className="col-span-2 row-span-2 bg-black rounded-none overflow-hidden shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"><MediaRenderer url={mediaUrls[0]} className="w-full h-full object-cover mx-auto" variant="detail" /></div>
        <div onClick={() => setSelectedMediaIndex(1)} className="col-span-1 row-span-1 bg-black rounded-none overflow-hidden shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"><MediaRenderer url={mediaUrls[1]} className="w-full h-full object-cover mx-auto" variant="detail" /></div>
        <div onClick={() => setSelectedMediaIndex(2)} className="col-span-1 row-span-1 bg-black rounded-none overflow-hidden shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"><MediaRenderer url={mediaUrls[2]} className="w-full h-full object-cover mx-auto" variant="detail" /></div>
      </div>
    );
    return (
      <div className="flex flex-col gap-1 mb-8">
        <div onClick={() => setSelectedMediaIndex(0)} className="w-full aspect-[2/1] bg-black rounded-none overflow-hidden shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"><MediaRenderer url={mediaUrls[0]} className="w-full h-full object-contain mx-auto" variant="detail" /></div>
        <div className="grid grid-cols-4 gap-1 aspect-[4/1]">
          {mediaUrls.slice(1, 5).map((url, i) => (
            <div key={i} onClick={() => setSelectedMediaIndex(i + 1)} className="relative w-full h-full bg-black rounded-none overflow-hidden shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer group">
              <MediaRenderer url={url} className="w-full h-full object-cover mx-auto group-hover:opacity-75 transition-opacity" variant="detail" />
              {i === 3 && mediaUrls.length > 5 && (<div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm"><span className="text-white font-bold text-xl md:text-2xl">+{mediaUrls.length - 5}</span></div>)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderGrid()}
      {selectedMediaIndex !== null && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col justify-between items-center backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200" onClick={() => setSelectedMediaIndex(null)}>
          <button className="absolute top-6 right-6 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedMediaIndex(null); }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="relative flex-1 w-full flex items-center justify-center px-12 md:px-24">
            {mediaUrls.length > 1 && (<button className="absolute left-4 md:left-10 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" onClick={handlePrev}><svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>)}
            <div className="w-full max-w-6xl h-[75vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <MediaRenderer url={mediaUrls[selectedMediaIndex]} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" variant="detail" />
            </div>
            {mediaUrls.length > 1 && (<button className="absolute right-4 md:right-10 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" onClick={handleNext}><svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>)}
          </div>
          {mediaUrls.length > 1 && (
            <div className="w-full pb-8 pt-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 snap-x max-w-full no-scrollbar">
                {mediaUrls.map((url, idx) => (
                  <button key={idx} onClick={() => setSelectedMediaIndex(idx)} className={`relative w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-lg overflow-hidden snap-center transition-all duration-200 ${selectedMediaIndex === idx ? 'ring-2 ring-purple-500 scale-110 opacity-100 z-10' : 'opacity-50 hover:opacity-100'}`}>
                    <MediaRenderer url={url} className="w-full h-full object-cover" variant="thumb" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientProjectDetailPage({ 
  locale, username, id, initialProject 
}: { 
  locale: string; username: string; id: string; initialProject: any 
}) {
  
  const decodedUsername = decodeURIComponent(username);
  const t = useTranslations("project");
  const tGlobal = useTranslations();
  const router = useRouter();
  const { openShareModal } = useShareModal();

  const [project, setProject] = useState<any>(initialProject);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Like
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [isInteractionLoading, setIsInteractionLoading] = useState(true);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Save
  const [isSaved, setIsSaved] = useState(initialProject?.hasSaved || false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);


  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string, name: string, parentId?: string, username?: string, id?: string, rootId?: string } | null>(null);
  const [traceInfo, setTraceInfo] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorHeight, setEditorHeight] = useState(40);

  const handleEditorMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = editorHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      // moving up decreases clientY, which means deltaY is positive, so height increases
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(40, Math.min(200, startHeight + deltaY));
      setEditorHeight(newHeight);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [editorHeight]);

  // Collab
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [collabMessage, setCollabMessage] = useState("");
  const [isCollabMessageSent, setIsCollabMessageSent] = useState(false);

  // Close emoji picker on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setIsEmojiOpen(false);
      }
    }
    if (isEmojiOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEmojiOpen]);

  const [isUserLoaded, setIsUserLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = payload.sub || payload.id || payload._id || payload.userId || "1";
        setUser({ id: userId, username: payload.username || "Guest" });
        getProfile(userId).then(res => {
          if (res?.success && res?.profile) setUser((prev: any) => ({ ...prev, profile: res.profile }));
        });
      } catch (e) { console.error("Invalid token"); }
    }
    setIsUserLoaded(true);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") { setIsDarkMode(false); document.documentElement.classList.remove("dark"); }
    else { setIsDarkMode(true); document.documentElement.classList.add("dark"); }
    setThemeLoaded(true);
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;
    if (isDarkMode) { document.documentElement.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { document.documentElement.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }, [isDarkMode, themeLoaded]);

  const fetchComments = useCallback(async (cursor?: string) => {
    if (!cursor) setIsLoadingComments(true);
    const res = await getComments("project", id, user?.id, cursor, 20);
    if (res.success) {
      if (cursor) setComments(prev => [...prev, ...(res.comments || [])]);
      else setComments(res.comments || []);
      setNextCursor(res.nextCursor);
    }
    if (!cursor) setIsLoadingComments(false);
  }, [id, user?.id]);

  const loadInteractions = useCallback(() => {
    if (!isUserLoaded) return;
    const cacheKey = `interaction_project_${id}_${user?.id || 'guest'}`;
    if (interactionsCache.has(cacheKey)) {
      const cached = interactionsCache.get(cacheKey);
      setMyReaction(cached.myReaction);
      setLikeCount(cached.likeCount);
      setCommentCount(cached.commentCount);
      setIsSaved(cached.hasSaved);
      setIsInteractionLoading(false);
    } else {
      setIsInteractionLoading(true);
    }
    // SWR for interactions
    checkInteractionState(user?.id, "project", id).then(interaction => {
      if (interaction.success) {
        setMyReaction(interaction.myReaction as ReactionType | null);
        setLikeCount(interaction.likeCount || 0);
        setCommentCount(interaction.commentCount || 0);
        setIsSaved(interaction.hasSaved || false);
        const existing = interactionsCache.get(cacheKey) || {};
        interactionsCache.set(cacheKey, {
          ...existing,
          myReaction: interaction.myReaction as ReactionType | null,
          likeCount: interaction.likeCount || 0,
          commentCount: interaction.commentCount || 0,
          hasSaved: interaction.hasSaved || false,
          topReactions: interaction.topReactions || existing.topReactions || []
        });
      }
      setIsInteractionLoading(false);
    }).catch(() => setIsInteractionLoading(false));
  }, [id, user?.id, isUserLoaded]);

  useEffect(() => {
    loadInteractions();
    fetchComments();
    const handleRefresh = () => { loadInteractions(); fetchComments(); };
    window.addEventListener("refresh_projects", handleRefresh);
    return () => window.removeEventListener("refresh_projects", handleRefresh);
  }, [loadInteractions, fetchComments]);

  useEffect(() => {
    if (!isLoading && window.location.hash === '#comments') {
      const timer = setTimeout(() => { const el = document.getElementById('comments'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 150);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const handleLike = async (reactionType: ReactionType = "LIKE") => {
    if (!user || isLikeLoading) return;
    const previousReaction = myReaction;
    const isRemoving = previousReaction === reactionType;
    const newReaction = isRemoving ? null : reactionType;

    const cacheKey = `interaction_project_${id}_${user.id}`;
    
    const cached = interactionsCache.get(cacheKey) || {};
    let newTopReactions = cached.topReactions || [];
    if (!previousReaction && newReaction && !newTopReactions.includes(newReaction)) {
      newTopReactions = [newReaction, ...newTopReactions].slice(0, 3);
    }

    setMyReaction(newReaction);
    if (!previousReaction && newReaction) {
      setLikeCount((prev: number) => {
        const next = prev + 1;
        interactionsCache.set(cacheKey, { ...cached, myReaction: newReaction, likeCount: next, topReactions: newTopReactions });
        return next;
      });
    } else if (previousReaction && !newReaction) {
      setLikeCount((prev: number) => {
        const next = Math.max(0, prev - 1);
        interactionsCache.set(cacheKey, { ...cached, myReaction: newReaction, likeCount: next });
        return next;
      });
    } else if (previousReaction && newReaction && previousReaction !== newReaction) {
        if (!newTopReactions.includes(newReaction)) {
           newTopReactions = [newReaction, ...newTopReactions].slice(0, 3);
        }
        interactionsCache.set(cacheKey, { ...cached, myReaction: newReaction, topReactions: newTopReactions });
    }
    
    setIsLikeLoading(true);
    const res = await toggleLike(user.id, "project", id, reactionType);
    if (!res.success) { 
      setMyReaction(previousReaction); 
      if (!previousReaction && newReaction) {
        setLikeCount((prev: number) => {
            const next = Math.max(0, prev - 1);
            interactionsCache.set(cacheKey, { ...interactionsCache.get(cacheKey), myReaction: previousReaction, likeCount: next });
            return next;
        });
      } else if (previousReaction && !newReaction) {
        setLikeCount((prev: number) => {
            const next = prev + 1;
            interactionsCache.set(cacheKey, { ...interactionsCache.get(cacheKey), myReaction: previousReaction, likeCount: next });
            return next;
        });
      } else if (previousReaction && newReaction && previousReaction !== newReaction) {
          interactionsCache.set(cacheKey, { ...interactionsCache.get(cacheKey), myReaction: previousReaction });
      }
    } else {
        window.dispatchEvent(new Event("refresh_projects"));
    }
    setIsLikeLoading(false);
  };

  const handleShare = () => {
    openShareModal({
      id,
      type: "PROJECT",
      title: project?.title || undefined,
      text: project?.description || undefined,
      url: typeof window !== "undefined" ? window.location.href : "",
      authorName: project?.user?.profile?.displayName || project?.user?.username,
      authorUsername: project?.user?.username,
      authorAvatar: project?.user?.profile?.avatarUrl,
    });
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert("Silakan login untuk menyimpan.");
      return;
    }
    if (isSaveLoading) return;
    setIsSaveLoading(true);
    
    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);
    
    const cacheKey = `interaction_project_${id}_${user.id}`;
    if (interactionsCache.has(cacheKey)) {
      interactionsCache.set(cacheKey, {
        ...interactionsCache.get(cacheKey),
        hasSaved: newIsSaved
      });
    }
    
    const res = await toggleSave(user.id, "project", id);
    if (!res.success) {
      setIsSaved(!newIsSaved);
      if (interactionsCache.has(cacheKey)) {
        interactionsCache.set(cacheKey, {
          ...interactionsCache.get(cacheKey),
          hasSaved: !newIsSaved
        });
      }
      console.error(res.error);
    } else if (res.action === "saved") {
      const savedMsg = tGlobal("saveFolderModal.savedToast");
      const titleMsg = tGlobal("saveFolderModal.title");
      toast.custom((toastItem) => (
        <div className={`${toastItem.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-[#0A3622]/95 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-lg pointer-events-auto flex ring-1 ring-black/20 border border-emerald-600/30 backdrop-blur-md`}>
          <div className="flex-1 w-0 p-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">{savedMsg}</span>
              <button 
                onClick={() => { 
                  toast.dismiss(toastItem.id);
                  setIsSaveModalOpen(true);
                }} 
                className="text-emerald-300 hover:text-emerald-200 font-bold ml-4 transition-colors"
              >
                {titleMsg}
              </button>
            </div>
          </div>
        </div>
      ), { duration: 4000 });
    }
    setIsSaveLoading(false);
  };

  const handleLikeComment = async (commentId: string, reactionType: string = "LIKE") => {
    if (!user) return;
    await toggleLike(user.id, "comment", commentId, reactionType);
  };

  const handleReplyClick = (uname: string, uid: string, displayName: string, exactCommentId: string, parentIdForDB?: string, rootId?: string) => {
    setReplyingTo({ commentId: exactCommentId, name: displayName, parentId: parentIdForDB, username: uname, id: uid, rootId });
  };

  const handleInlineSubmit = async (text: string, parentId: string) => {
    if (!user) return;
    const res = await addComment(user.id, "project", id, text, parentId);
    if (res.success && res.comment) {
      const appendReply = (list: any[], pid: string): any[] => list.map(c => {
        if (c.id === pid) return { ...c, optimisticReplies: [...(c.optimisticReplies || []), res.comment] };
        if (c.optimisticReplies) return { ...c, optimisticReplies: appendReply(c.optimisticReplies, pid) };
        return c;
      });
      setComments(prev => appendReply(prev, parentId));
      setReplyingTo(null);
    }
  };

  const getMentionsText = (ed: any) => {
    const json = ed.getJSON();
    let text = '';
    const parseNode = (node: any) => {
      if (node.type === 'text') text += node.text;
      if (node.type === 'mention') text += `@[${node.attrs.label}](${node.attrs.id})`;
      if (node.content) node.content.forEach(parseNode);
    };
    if (json.content) json.content.forEach(parseNode);
    return text.trim();
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ bold: false, italic: false, strike: false, code: false, codeBlock: false, heading: false, bulletList: false, orderedList: false, listItem: false, blockquote: false, horizontalRule: false }),
      Placeholder.configure({
        placeholder: t("writeComment") || "Tulis komentar...",
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
      setCommentInput(getMentionsText(editor));
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
          handleTopLevelSubmit();
          return true;
        }
        return false;
      },
    },
  });

  const handleTopLevelSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !commentInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const res = await addComment(user.id, "project", id, commentInput);
    if (res.success && res.comment) { 
      setComments(prev => [res.comment, ...prev]); 
      setCommentCount(prev => prev + 1);
      setCommentInput(""); 
      if (editor) editor.commands.clearContent();
    }
    setIsSubmitting(false);
  };
  const renderCommentContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(@\[.*?\]\([^\)]+\))/g);
    return parts.map((part, i) => {
      const match = part.match(/@\[(.*?)\]\(([^\)]+)\)/);
      if (match) {
        const matchedUsername = match[2].split('/')[0];
        const idStr = match[2].split('/')[1] || matchedUsername;
        const isCurrentUser = user && (idStr === user.id || matchedUsername === user.username);
        const colorClass = isCurrentUser ? "text-blue-500 font-semibold bg-blue-50 dark:bg-blue-900/30 px-1 rounded" : "text-sky-500 dark:text-sky-400";
        return <span key={i} className={`${colorClass} cursor-pointer hover:underline`} onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/p/${matchedUsername}/${idStr}`); }}>@{match[1]}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };


  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F0F2F5] dark:bg-[#18191A] pt-20 pb-10">
        <div className="max-w-[900px] mx-auto w-full px-4 animate-pulse">
          <div className="w-48 h-6 bg-gray-300 dark:bg-[#3A3B3C] rounded mb-6"></div>
          <div className="w-full aspect-[16/9] md:aspect-[21/9] bg-gray-300 dark:bg-[#3A3B3C] rounded-2xl mb-10"></div>
          <div className="flex flex-col gap-4"><div className="w-3/4 h-10 bg-gray-300 dark:bg-[#3A3B3C] rounded-lg"></div><div className="w-full h-4 bg-gray-300 dark:bg-[#3A3B3C] rounded"></div></div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const p = project;
  const profileUser = p.user;
  const displayName = profileUser.profile?.displayName || profileUser.username;
  const avatar = profileUser.profile?.avatarUrl ? getOptimizedUrl(profileUser.profile.avatarUrl, 'thumb') : null;
  const statusKey = ({ RELEASED: "statusReleased", IN_PROGRESS: "statusInProgress", OPEN_SOURCE: "statusOpenSource", SEARCHING_TEAM: "statusSearchingTeam" } as Record<string, string>)[p.status] || "statusReleased";

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F5] dark:bg-[#18191A] pt-20 pb-20">
      <FloatingProjectHubBtn customHref={`/${locale}/project/${decodedUsername}`} customText={`${displayName}'s Projects`} variant="with-dropdown" />
      <FloatingUserMenu isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      <div className="max-w-[900px] mx-auto w-full px-4">

        <ProjectGallery mediaUrls={p.mediaUrls?.length ? p.mediaUrls : p.coverUrls || []} />

        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-6 border-b border-gray-200 dark:border-[#3A3B3C] pb-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-[#E4E6EB]">{p.title}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  {p.category && (<span className="inline-flex items-center px-2.5 py-1 rounded-md text-[13px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">{p.category === "OTHER" ? p.customCategory : t(`cat_${p.category}` as any)}</span>)}
                  {p.isForSale && (<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[13px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>FOR SALE</span>)}
                </div>
              </div>
              <span className={"shrink-0 px-2.5 py-1 rounded-md text-[13px] font-semibold " + (p.status === "RELEASED" ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : p.status === "IN_PROGRESS" ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" : p.status === "OPEN_SOURCE" ? "bg-white dark:bg-[#242526] text-gray-700 dark:text-gray-300 border border-dashed border-gray-400 dark:border-gray-500" : p.status === "SEARCHING_TEAM" ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" : "bg-gray-100 text-gray-700")}>{t(statusKey)}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link href={`/${locale}/p/${profileUser.username}/${profileUser.id}`} className="flex items-center gap-4 group w-fit">
                {avatar ? <img src={avatar} alt={displayName} className="w-14 h-14 rounded-full object-cover shadow-sm" /> : <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-xl">{displayName[0].toUpperCase()}</div>}
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900 dark:text-[#E4E6EB] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{displayName}</h3>
                  <p className="text-[14px] text-gray-500 dark:text-[#B0B3B8]">@{profileUser.username}</p>
                </div>
              </Link>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-white dark:bg-[#242526] px-5 py-2.5 rounded-full shadow-sm border border-gray-100 dark:border-[#3A3B3C]">
                  <div className="flex items-center relative">
                    {isInteractionLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" />
                        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <ProjectReactionListDropdown targetId={id} count={likeCount} />
                        <ReactionButton myReaction={myReaction} onReact={handleLike} count={likeCount} />
                      </div>
                    )}
                  </div>
                  <div className="w-px h-5 bg-gray-200 dark:bg-[#4E4F50]"></div>
                  <button onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 font-semibold transition-colors text-[14px]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    {isInteractionLoading ? <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" /> : <span>{commentCount}</span>}
                  </button>
                  <div className="w-px h-5 bg-gray-200 dark:bg-[#4E4F50]"></div>
                  {isInteractionLoading ? (
                    <div className="w-6 h-6 bg-gray-200 dark:bg-[#4E4F50] rounded-full animate-pulse mx-1" />
                  ) : (
                    <button 
                      onClick={handleSave} 
                      disabled={isSaveLoading}
                      className="flex items-center gap-2 font-semibold transition-colors text-[14px]"
                    >
                      <svg className={`w-5 h-5 ${isSaved ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`} fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isSaved ? 0 : 2} d={isSaved ? "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" : "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"} />
                      </svg>
                    </button>
                  )}
                </div>
                
                <button onClick={handleShare} className="flex items-center gap-2 bg-white dark:bg-[#242526] px-5 py-2.5 rounded-full shadow-sm border border-gray-100 dark:border-[#3A3B3C] text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 font-semibold transition-colors text-[14px]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  {t("share") || "Share"}
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-[#E4E6EB] mb-4">{t("aboutProject") || "About this Project"}</h3>
            <p className="text-gray-700 dark:text-[#B0B3B8] text-[16px] leading-relaxed whitespace-pre-line">{p.description}</p>
          </div>

          {p.roleNeeded && p.status === "SEARCHING_TEAM" && (
            <div className="p-5 bg-purple-50 dark:bg-purple-500/10 rounded-2xl border border-purple-100 dark:border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-[16px] font-bold text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>{t("roleNeeded")}</h3>
                <p className="text-purple-700 dark:text-purple-400 text-[15px]">{p.roleNeeded}</p>
              </div>
              <button onClick={() => { setCollabMessage(t("collabMessageDefault") || "Halo, saya tertarik untuk berkolaborasi dalam project ini."); setIsCollabMessageSent(false); setIsCollabModalOpen(true); }} className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-purple-200 dark:shadow-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                {t("sendMessage") || "Kirim pesan"}
              </button>
            </div>
          )}

          {p.techStack && p.techStack.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-[#E4E6EB] mb-4">{t("technologies") || "Technologies"}</h3>
              <div className="flex flex-wrap gap-2">{p.techStack.map((tech: string) => <span key={tech} className="px-4 py-2 rounded-xl text-[14px] font-semibold bg-gray-200 text-gray-800 dark:bg-[#3A3B3C] dark:text-[#E4E6EB]">{tech}</span>)}</div>
            </div>
          )}

          {(p.repoUrl || p.demoUrl) && (
            <div className="flex flex-wrap items-center gap-4 pt-4">
              {p.repoUrl && (<a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>{t("viewRepo")}</a>)}
              {p.demoUrl && (<a href={p.demoUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm shadow-purple-200 dark:shadow-none"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>{t("viewDemo")}</a>)}
            </div>
          )}

          <hr className="border-gray-200 dark:border-[#3A3B3C] my-8" />

          {/* Comments Section */}
          <div id="comments" className="pt-2 pb-10">
            <div className="flex flex-col lg:flex-row gap-8">

              {/* Left Column: Comments */}
              <div className="flex-1 lg:max-w-[60%] border border-gray-200 dark:border-[#3A3B3C] rounded-2xl bg-white dark:bg-[#242526] flex flex-col h-[500px] min-h-[500px] max-h-[1200px] resize-y overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-[#3A3B3C] bg-gray-50 dark:bg-[#1f2021] rounded-t-2xl">
                  <h3 className="text-[17px] font-bold text-gray-900 dark:text-[#E4E6EB] flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                    {t("comments") || "Comments"} <span className="text-gray-500 dark:text-[#B0B3B8] font-medium">({comments.length})</span>
                  </h3>
                </div>

                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                  {isLoadingComments ? (
                    [1,2,3].map(i => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] shrink-0" />
                        <div className="flex-1 flex flex-col gap-2 pt-1"><div className="h-3 bg-gray-200 dark:bg-[#3A3B3C] rounded w-1/4" /><div className="h-3 bg-gray-200 dark:bg-[#3A3B3C] rounded w-3/4" /></div>
                      </div>
                    ))
                  ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 flex-1">
                      <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      <p className="text-gray-500 dark:text-[#B0B3B8] font-medium text-[15px]">{t("noCommentsYet") || "Belum ada komentar."}</p>
                    </div>
                  ) : (
                    <>
                      {comments.map(c => (
                        <CommentItem
                          key={c.id}
                          comment={c}
                          locale={locale}
                          t={tGlobal}
                          router={router}
                          currentUser={user}
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
                                currentUser={user}
                                t={tGlobal}
                                initialMention={{
                                  username: (replyingTo as any).username,
                                  id: (replyingTo as any).id,
                                  displayName: replyingTo.name,
                                  commentId: replyingTo.commentId
                                }}
                                onCancel={() => setReplyingTo(null)}
                                onSubmit={async (text: string) => { await handleInlineSubmit(text, replyingTo?.parentId || commentId); }}
                              />
                            );
                          }}
                        />
                      ))}
                      {nextCursor && (
                        <button onClick={() => fetchComments(nextCursor)} className="text-purple-500 hover:underline text-[13px] font-semibold mt-2 self-center">
                          Muat lebih banyak komentar
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Comment Input */}
                <div className="p-4 border-t border-gray-200 dark:border-[#3A3B3C] bg-white dark:bg-[#242526] rounded-b-2xl">
                  <div className="flex items-end gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-gray-200 dark:bg-[#3A3B3C] overflow-hidden flex items-center justify-center mb-0.5">
                      {user?.profile?.avatarUrl ? <img src={getOptimizedUrl(user.profile.avatarUrl, 'thumb')} alt="You" className="w-full h-full object-cover" /> : <span className="text-gray-500 font-bold text-sm">{user?.username?.[0]?.toUpperCase() || "?"}</span>}
                    </div>
                    <div className="flex-1 flex gap-2 items-end">
                      <form 
                        className="flex-1 bg-gray-100 dark:bg-[#3A3B3C] rounded-xl flex flex-col text-[14px] text-gray-900 dark:text-[#E4E6EB] border border-transparent focus-within:border-purple-300 dark:focus-within:border-purple-500/50 transition-colors cursor-text"
                        onClick={() => editor?.chain().focus().run()}
                        onSubmit={handleTopLevelSubmit}
                      >
                        {/* Top drag handle */}
                        <div 
                          onMouseDown={handleEditorMouseDown}
                          className="w-full flex justify-center py-1 cursor-ns-resize hover:bg-gray-200/50 dark:hover:bg-[#4E4F50]/50 transition-colors group shrink-0 rounded-t-xl"
                        >
                          <div className="w-8 h-1 rounded-full bg-gray-300 dark:bg-gray-500 group-hover:bg-gray-400 dark:group-hover:bg-gray-400" />
                        </div>
                        
                        <div 
                          className="px-3 pb-2 w-full flex flex-row items-end" 
                          style={{ height: `${editorHeight}px`, minHeight: `${editorHeight}px`, maxHeight: `${editorHeight}px` }}
                        >
                          {/* Emoji Button */}
                          <div ref={emojiRef} className="relative shrink-0 mr-2 self-end">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setIsEmojiOpen(o => !o); }} className="text-gray-400 hover:text-purple-500 transition-colors">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                            {isEmojiOpen && (
                              <div className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden picker-container">
                                <style>{`.picker-container em-emoji-picker{height:280px !important;min-height:280px !important;max-height:280px !important;width:328px !important;max-width:calc(100vw - 2rem) !important;}`}</style>
                                <Picker data={data} onEmojiSelect={(e: any) => {
                                  if (editor) {
                                    editor.chain().focus().insertContent(e.native).run();
                                    setIsEmojiOpen(false);
                                  }
                                }} theme={typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"} previewPosition="none" skinTonePosition="search" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 overflow-y-auto custom-scrollbar h-full pt-1">
                            <style>{`
                              .ProseMirror { outline: none; white-space: pre-wrap; word-break: break-word; color: #111827; min-height: 100%; }
                              :is(.dark .ProseMirror) { color: #E4E6EB; }
                              .ProseMirror p.is-editor-empty:first-child::before { color: #9ca3af; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
                              .ProseMirror p { margin: 0; }
                            `}</style>
                            <EditorContent editor={editor} className="h-full" />
                          </div>
                        </div>
                      </form>
                      <button
                        onClick={handleTopLevelSubmit}
                        disabled={!commentInput.trim() || isSubmitting}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-[14px] transition-colors shrink-0 self-end h-[40px] flex items-center justify-center"
                      >
                        {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Profile CTA */}
              <div className="w-full lg:w-[40%] shrink-0">
                <div className="sticky top-24 flex flex-col items-center text-center">
                  {avatar ? <img src={avatar} alt={displayName} className="w-24 h-24 rounded-full object-cover shadow-sm ring-4 ring-white dark:ring-[#18191A] mb-4" /> : <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-3xl ring-4 ring-white dark:ring-[#18191A] mb-4">{displayName[0].toUpperCase()}</div>}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-[#E4E6EB] leading-tight">{displayName}</h3>
                  <p className="text-[15px] text-gray-500 dark:text-[#B0B3B8] mt-1 mb-6">@{profileUser.username}</p>
                  <div className="flex flex-col gap-3 w-full max-w-[280px]">
                    <Link href={`/${locale}/p/${profileUser.username}/${profileUser.id}`} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-center text-[15px] transition-all hover:-translate-y-0.5 shadow-sm shadow-purple-200 dark:shadow-none">{t("viewProfile") || "Lihat Profil"}</Link>
                    <Link href={`/${locale}/project/${profileUser.username}`} className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-gray-800 dark:text-[#E4E6EB] font-bold rounded-xl text-[14px] text-center transition-colors">{t("viewOtherProjects") || "Project Lain"}</Link>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 mt-6 w-fit mx-auto">
                    <div className="flex items-center gap-1 bg-white dark:bg-[#242526] px-3 py-1.5 rounded-full shadow-sm border border-gray-100 dark:border-[#3A3B3C]">
                      {isInteractionLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" />
                          <div className="w-10 h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <ProjectReactionListDropdown targetId={id} count={likeCount} />
                          <ReactionButton myReaction={myReaction} onReact={handleLike} count={likeCount} containerClassName="!flex-none" />
                        </div>
                      )}
                    </div>
                    <button onClick={handleShare} className="flex shrink-0 items-center justify-center w-10 h-10 bg-white dark:bg-[#242526] rounded-2xl shadow-sm border border-gray-100 dark:border-[#3A3B3C] text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors">
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="mt-20 flex justify-center pb-8">
        <img src="/logo-horizontal.png" alt="Mencari" className="h-16 grayscale opacity-50 dark:opacity-40" />
      </div>

      {/* Collaboration Message Modal */}
      {isCollabModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#242526] w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {!isCollabMessageSent && (<div className="p-4 border-b border-gray-100 dark:border-[#3A3B3C] flex justify-between items-center bg-gray-50 dark:bg-[#1f2021]"><h3 className="font-bold text-gray-900 dark:text-[#E4E6EB]">{t("sendCollabTitle") || "Kirim Pesan Kolaborasi"}</h3><button onClick={() => setIsCollabModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>)}
            <div className="p-5">
              {!isCollabMessageSent ? (
                <>
                  <p className="text-[14px] text-gray-600 dark:text-gray-400 mb-4">Kirim pesan ke <span className="font-bold text-gray-900 dark:text-gray-200">@{profileUser.username}</span> terkait project <span className="font-bold">"{p.title}"</span>.</p>
                  <textarea value={collabMessage} onChange={(e) => setCollabMessage(e.target.value)} className="w-full bg-gray-100 dark:bg-[#3A3B3C] border-none rounded-xl p-3 text-[14px] text-gray-900 dark:text-[#E4E6EB] focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y min-h-[100px]" placeholder="Tulis pesan Anda disini..." />
                  <div className="mt-5 flex justify-end gap-3">
                    <button onClick={() => setIsCollabModalOpen(false)} className="px-4 py-2 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors">Batal</button>
                    <button onClick={() => setIsCollabMessageSent(true)} className="px-4 py-2 font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm">{t("send") || "Kirim"}</button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                  <h4 className="font-bold text-gray-900 dark:text-[#E4E6EB] mb-2 text-xl">Pesan terkirim!</h4>
                  <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-8 mt-1">{t("messageSentSubtext") || "Cek menu obrolan secara berkala"}</p>
                  <button onClick={() => setIsCollabModalOpen(false)} className="px-6 py-2 font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm">{t("viewProject") || "Lihat project"}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {user && (
        <SaveToFolderModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          userId={user.id}
          targetType="project"
          targetId={id}
        />
      )}
    </div>
  );
}
