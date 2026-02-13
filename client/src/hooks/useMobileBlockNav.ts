import { useState, useCallback } from "react";
import { useIsMobile } from "@/components/ui/use-mobile";

export function useMobileBlockNav<T = string>(initialBlock: T = "list" as T) {
  const isMobile = useIsMobile();
  const [activeBlock, setActiveBlock] = useState<T>(initialBlock);

  const navigate = useCallback((block: T) => {
    setActiveBlock(block);
  }, []);

  const goBack = useCallback((fallback: T = "list" as T) => {
    setActiveBlock(fallback);
  }, []);

  return {
    isMobile,
    activeBlock,
    navigate,
    goBack,
    setActiveBlock,
  };
}
