/**
 * Application configuration for LifeMap
 */

export interface AppConfig {
  // Application metadata
  app: {
    name: string;
    domain: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    debug: boolean;
  };
  
  // Google Drive storage configuration
  storage: {
    provider: 'google-drive';
    googleDrive: {
      clientId: string;
      apiKey: string;
      discoveryDocs: string[];
      scopes: string[];
      
      // Folder structure
      rootFolderName: string;
      folderStructure: {
        createOnInit: boolean;
        folders: Record<string, string>; // category -> folder name
      };
      
      // Advanced settings
      maxFileSize: number;              // In bytes
      allowedMimeTypes: string[];
      autoCreateFolders: boolean;
      syncInterval?: number;            // In milliseconds
    };
  };
  
  // Authentication configuration
  auth: {
    providers: Array<'google' | 'microsoft' | 'email'>;
    sessionTimeout: number;             // In milliseconds
    rememberMeDuration: number;         // In milliseconds
    twoFactorEnabled: boolean;
  };
  
  // Features configuration
  features: {
    offlineMode: boolean;
    autoSave: boolean;
    autoSaveInterval: number;           // In milliseconds
    encryptionEnabled: boolean;
    searchIndexing: boolean;
    visualTesting: boolean;
    developerMode: boolean;
  };
  
  // UI configuration
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    defaultView: 'graph' | 'list' | 'grid';
    animations: boolean;
  };
  
  // API configuration
  api: {
    baseUrl: string;
    timeout: number;                    // In milliseconds
    retryAttempts: number;
    retryDelay: number;                 // In milliseconds
  };
  
  // Monitoring and analytics
  monitoring: {
    enabled: boolean;
    providers: Array<'google-analytics' | 'mixpanel' | 'custom'>;
    errorReporting: boolean;
    performanceTracking: boolean;
  };
}

// Default configuration
export const defaultConfig: AppConfig = {
  app: {
    name: 'LifeMap',
    domain: 'lifemap.au',
    version: '2.0.0',
    environment: 'development',
    debug: true
  },
  
  storage: {
    provider: 'google-drive',
    googleDrive: {
      clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
      apiKey: process.env.REACT_APP_GOOGLE_API_KEY || '',
      discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
      ],
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.appdata',
        'https://www.googleapis.com/auth/drive.metadata'
      ],
      
      rootFolderName: 'LifeMap Documents',
      folderStructure: {
        createOnInit: true,
        folders: {
          'identity': 'Identity Documents',
          'health': 'Health Records',
          'finance': 'Financial Documents',
          'property': 'Property & Assets',
          'vehicle': 'Vehicle Documents',
          'insurance': 'Insurance Policies',
          'education': 'Education Records',
          'work': 'Work & Career',
          'travel': 'Travel Documents',
          'pets': 'Pet Records',
          'subscriptions': 'Subscriptions & Memberships',
          'other': 'Other Documents'
        }
      },
      
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ],
      autoCreateFolders: true,
      syncInterval: 5 * 60 * 1000 // 5 minutes
    }
  },
  
  auth: {
    providers: ['google', 'email'],
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    rememberMeDuration: 30 * 24 * 60 * 60 * 1000, // 30 days
    twoFactorEnabled: false
  },
  
  features: {
    offlineMode: true,
    autoSave: true,
    autoSaveInterval: 30 * 1000, // 30 seconds
    encryptionEnabled: false,
    searchIndexing: true,
    visualTesting: false,
    developerMode: process.env.NODE_ENV === 'development'
  },
  
  ui: {
    theme: 'auto',
    language: 'en-US',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    defaultView: 'graph',
    animations: true
  },
  
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'https://api.lifemap.au',
    timeout: 30 * 1000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000 // 1 second
  },
  
  monitoring: {
    enabled: process.env.NODE_ENV === 'production',
    providers: ['google-analytics'],
    errorReporting: true,
    performanceTracking: true
  }
};

// Environment-specific overrides
const envConfigs: Record<string, Partial<AppConfig>> = {
  development: {
    app: {
      domain: 'localhost:3000',
      debug: true
    },
    features: {
      developerMode: true,
      visualTesting: true
    },
    monitoring: {
      enabled: false
    }
  },
  
  staging: {
    app: {
      domain: 'staging.lifemap.au',
      debug: false
    },
    api: {
      baseUrl: 'https://api-staging.lifemap.au'
    }
  },
  
  production: {
    app: {
      domain: 'lifemap.au',
      debug: false
    },
    features: {
      developerMode: false,
      visualTesting: false
    },
    monitoring: {
      enabled: true
    }
  }
};

// Configuration manager
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  
  private constructor() {
    this.config = this.loadConfig();
  }
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  getConfig(): AppConfig {
    return this.config;
  }
  
  updateConfig(updates: Partial<AppConfig>): void {
    this.config = this.deepMerge(this.config, updates);
    this.saveConfig();
  }
  
  private loadConfig(): AppConfig {
    // Start with default config
    let config = { ...defaultConfig };
    
    // Apply environment-specific overrides
    const env = process.env.NODE_ENV || 'development';
    if (envConfigs[env]) {
      config = this.deepMerge(config, envConfigs[env]);
    }
    
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('lifemap-config');
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          config = this.deepMerge(config, parsed);
        } catch (error) {
          console.error('Failed to parse saved config:', error);
        }
      }
    }
    
    // Apply environment variables
    this.applyEnvironmentVariables(config);
    
    return config;
  }
  
  private saveConfig(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lifemap-config', JSON.stringify(this.config));
    }
  }
  
  private applyEnvironmentVariables(config: AppConfig): void {
    // Override with environment variables if present
    if (process.env.REACT_APP_DOMAIN) {
      config.app.domain = process.env.REACT_APP_DOMAIN;
    }
    
    if (process.env.REACT_APP_GOOGLE_CLIENT_ID) {
      config.storage.googleDrive.clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    }
    
    if (process.env.REACT_APP_GOOGLE_API_KEY) {
      config.storage.googleDrive.apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
    }
    
    if (process.env.REACT_APP_API_URL) {
      config.api.baseUrl = process.env.REACT_APP_API_URL;
    }
  }
  
  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
  
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance().getConfig();

// Helper functions
export function getGoogleDriveConfig() {
  return config.storage.googleDrive;
}

export function getAppDomain() {
  return config.app.domain;
}

export function isProduction() {
  return config.app.environment === 'production';
}

export function isDevelopment() {
  return config.app.environment === 'development';
}

export function getApiUrl(endpoint: string) {
  return `${config.api.baseUrl}${endpoint}`;
}