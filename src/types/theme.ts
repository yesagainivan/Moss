export interface ThemeColors {
    primary: string;
    primary_dark?: string;
    secondary: string;
    secondary_dark?: string;
    accent: string;
    accent_dark?: string;

    background: string;
    background_subtle?: string;
    surface: string;
    surface_highlight?: string;
    elevated_surface?: string;
    foreground: string;
    subtle_foreground: string;
    outline: string;
    outline_subtle?: string;
}

export interface ThemeUtilityColors {
    background: string;
    foreground: string;
    border: string;
    subtle_background: string;
}

export interface ThemeUtilities {
    alert: ThemeUtilityColors;
    success: ThemeUtilityColors;
    warning: ThemeUtilityColors;
    info: ThemeUtilityColors;
}

export interface ThemeTypography {
    font_family: string;
    base_size: string;
}

export interface ThemeLayout {
    content_width: string;
    sidebar_width: string;
}

export interface ThemeBranding {
    custom_css?: string;
}

export interface Theme {
    version: string;
    name: string;
    description: string;
    colors: ThemeColors;
    utility: ThemeUtilities;
    dark?: Partial<ThemeColors>;
    typography?: ThemeTypography;
    layout?: ThemeLayout;
    branding?: ThemeBranding;
}
