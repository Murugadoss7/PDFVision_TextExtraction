import { useEffect, useRef, useCallback } from 'react';
import logger from '../utils/logger';

// Hook to log state changes - FIXED to prevent infinite loops
export const useStateLogger = (componentName, stateName, value) => {
  const prevValue = useRef(value);
  const stableComponentName = useRef(componentName);
  const stableStateName = useRef(stateName);
  
  useEffect(() => {
    if (prevValue.current !== value) {
      logger.stateChange(stableComponentName.current, 'useState', stableStateName.current, prevValue.current, value);
      prevValue.current = value;
    }
  }, [value]); // Only depend on value, not the component/state names
};

// Hook to log function calls with parameters - FIXED
export const useFunctionLogger = (componentName) => {
  const stableComponentName = useRef(componentName);
  
  return useCallback((functionName, params = null) => {
    logger.functionCall(stableComponentName.current, functionName, params);
  }, []); // Empty dependency array since we use ref
};

// Hook to log component lifecycle - FIXED to prevent constant logging
export const useComponentLogger = (componentName) => {
  const mountedRef = useRef(false);
  const stableComponentName = useRef(componentName);
  
  useEffect(() => {
    if (!mountedRef.current) {
      logger.info(stableComponentName.current, 'useEffect', 'Component mounted');
      mountedRef.current = true;
    }
    
    return () => {
      logger.info(stableComponentName.current, 'useEffect', 'Component unmounting');
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // REMOVED the re-render logging that was causing the loop
};

export default { useStateLogger, useFunctionLogger, useComponentLogger }; 