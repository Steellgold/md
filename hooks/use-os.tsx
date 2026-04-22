import * as React from "react";

type OsState = {
  isWindows: boolean;
  isApple: boolean;
  isOther: boolean;
};

const getPlatform = (): string => {
  if (typeof navigator === "undefined") {
    return "";
  }

  return `${navigator.platform ?? ""} ${navigator.userAgent ?? ""}`.toLowerCase();
};

export const useOs = (): OsState => {
  const platform = React.useSyncExternalStore(
    () => () => {},
    getPlatform,
    () => ""
  );

  const isWindows = platform.includes("win");
  const isApple =
    platform.includes("mac") ||
    platform.includes("iphone") ||
    platform.includes("ipad") ||
    platform.includes("ipod");

  return {
    isWindows,
    isApple,
    isOther: !isWindows && !isApple,
  };
};