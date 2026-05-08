export interface MobileSearchResponse {
  data: {
    data: Array<{
      data: Array<{
        app_info: MobileAppInfo;
      }>;
    }>;
  };
}

export interface MobileAppInfo {
  package_name: string;
  title: string;
  icon_url?: string;
  version_name?: string;
  description_short?: string;
  category?: string;
  developer?: string;
  rating?: string;
}

export interface MobileDetailResponse {
  app_detail: {
    title: string;
    package_name: string;
    version_name: string;
    version_code?: number;
    description_short?: string;
    description?: string;
    icon_url?: string;
    category?: string;
    developer?: string;
    rating?: string;
    size?: number;
    asset?: {
      url: string;
      type: string;
    };
    screenshots?: string[];
    update_date?: string;
    requires_android?: string;
  };
}

export interface MobileConfig {
  apiBase: string;
  authKey: string;
  signSecret: string;
  userAgent: string;
}
