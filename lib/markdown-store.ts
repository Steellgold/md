"use client";

import { createMarkdownStore } from "@/lib/markdown-store-implementation";
import { type MarkdownStore } from "@/types/markdown";
import { create } from "zustand";

export const useMarkdownStore = create<MarkdownStore>(createMarkdownStore);
