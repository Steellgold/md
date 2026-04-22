"use client";

import { useOs } from "@/hooks/use-os";

export const useCtrlKey = () => {
  const { isApple } = useOs();

  return isApple ? "Cmd" : "Ctrl";
};
