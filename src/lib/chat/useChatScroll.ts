"use client";

import { useLayoutEffect, useRef } from "react";

/** Within this many pixels of the bottom counts as "reading the latest", so new messages scroll into view. */
const STICK_TO_BOTTOM_PX = 80;

/**
 * Keeps the reading position in a chat list: older pages prepend without
 * jumping, and new messages scroll in only if you're already at the bottom.
 */
export function useChatScroll(messages: { id: string }[] | null, loadOlder: () => Promise<number>) {
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const restoreScroll = useRef<{ height: number; top: number; firstId: string | undefined } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const restore = restoreScroll.current;
    if (restore) {
      // Wait until the older page has actually been added above the first message.
      if (messages?.[0]?.id !== restore.firstId) {
        list.scrollTop = list.scrollHeight - restore.height + restore.top;
        restoreScroll.current = null;
      }
    } else if (stickToBottom.current) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  function onScroll() {
    const list = listRef.current;
    if (list) stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < STICK_TO_BOTTOM_PX;
  }

  function showOlder() {
    const list = listRef.current;
    if (list) restoreScroll.current = { height: list.scrollHeight, top: list.scrollTop, firstId: messages?.[0]?.id };
    void loadOlder().then((added) => {
      if (added === 0) restoreScroll.current = null;
    });
  }

  /** Call before sending: your own message should always come into view. */
  function scrollToLatest() {
    stickToBottom.current = true;
  }

  return { listRef, onScroll, showOlder, scrollToLatest };
}
