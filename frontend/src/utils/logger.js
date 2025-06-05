class AppLogger {
  constructor() {
    this.logs = [];
    this.isEnabled = true;
    this.maxLogs = 1000;
  }

  log(level, component, functionName, message, data = null) {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component,
      functionName,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null,
      sequenceId: this.logs.length + 1
    };

    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with formatting
    const prefix = `[${logEntry.sequenceId}] ${timestamp} [${level}] ${component}::${functionName}`;
    
    switch (level) {
      case 'ERROR':
        console.error(`${prefix} - ${message}`, data || '');
        break;
      case 'WARN':
        console.warn(`${prefix} - ${message}`, data || '');
        break;
      case 'INFO':
        console.info(`${prefix} - ${message}`, data || '');
        break;
      case 'DEBUG':
        console.log(`${prefix} - ${message}`, data || '');
        break;
      case 'STATE':
        console.log(`🔄 ${prefix} - ${message}`, data || '');
        break;
      case 'FUNCTION':
        console.log(`📞 ${prefix} - ${message}`, data || '');
        break;
      default:
        console.log(`${prefix} - ${message}`, data || '');
    }
  }

  // Convenience methods
  error(component, functionName, message, data) {
    this.log('ERROR', component, functionName, message, data);
  }

  warn(component, functionName, message, data) {
    this.log('WARN', component, functionName, message, data);
  }

  info(component, functionName, message, data) {
    this.log('INFO', component, functionName, message, data);
  }

  debug(component, functionName, message, data) {
    this.log('DEBUG', component, functionName, message, data);
  }

  // Special logging for state changes
  stateChange(component, functionName, stateName, oldValue, newValue) {
    this.log('STATE', component, functionName, `${stateName} changed`, {
      from: oldValue,
      to: newValue
    });
  }

  // Special logging for function calls
  functionCall(component, functionName, params = null) {
    this.log('FUNCTION', component, functionName, 'Called', params);
  }

  // Function to get recent logs
  getRecentLogs(count = 50) {
    return this.logs.slice(-count);
  }

  // Function to get logs for a specific component
  getComponentLogs(component, count = 50) {
    return this.logs
      .filter(log => log.component === component)
      .slice(-count);
  }

  // Export logs as JSON
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  // Clear logs
  clear() {
    this.logs = [];
    console.clear();
    this.info('Logger', 'clear', 'Logs cleared');
  }

  // Enable/disable logging
  setEnabled(enabled) {
    this.isEnabled = enabled;
    this.info('Logger', 'setEnabled', `Logging ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create singleton instance
const logger = new AppLogger();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.appLogger = logger;
}

export default logger; 