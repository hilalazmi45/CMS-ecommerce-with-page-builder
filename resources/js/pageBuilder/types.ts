export interface ComponentStyle {
    // Spacing — shorthand and longhands (prefer longhands for per-side control)
    padding?: string;
    paddingTop?: string;
    paddingRight?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    margin?: string;
    marginTop?: string;
    marginRight?: string;
    marginBottom?: string;
    marginLeft?: string;
    // Background
    background?: string;
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
    backgroundAttachment?: string;
    // Typography
    color?: string;
    fontSize?: string;
    fontFamily?: string;
    fontWeight?: string;
    lineHeight?: string;
    letterSpacing?: string;
    wordSpacing?: string;
    textAlign?: string;
    textTransform?: string;
    textDecoration?: string;
    direction?: string;
    // Border
    border?: string;
    borderWidth?: string;
    borderStyle?: string;
    borderColor?: string;
    borderRadius?: string;
    borderTopLeftRadius?: string;
    borderTopRightRadius?: string;
    borderBottomRightRadius?: string;
    borderBottomLeftRadius?: string;
    boxShadow?: string;
    // Effects
    opacity?: string;
    filter?: string;
    mixBlendMode?: string;
    transform?: string;
    // Layout / sizing
    width?: string;
    height?: string;
    minHeight?: string;
    maxWidth?: string;
    display?: string;
    flexDirection?: string;
    gap?: string;
    alignItems?: string;
    justifyContent?: string;
    overflow?: string;
    zIndex?: string;
    [key: string]: string | undefined;
}

export interface ResponsiveStyles {
    desktop?: ComponentStyle;
    tablet?: ComponentStyle;
    mobile?: ComponentStyle;
}

export interface PageComponent {
    id: string;
    type: string;
    version: number;
    settings: Record<string, unknown>;
    styles: ResponsiveStyles;
    children?: PageComponent[];
}

export interface PageSchema {
    schemaVersion: number;
    components: PageComponent[];
}

export interface WidgetDefinition {
    type: string;
    version: number;
    category: 'layout' | 'basic' | 'content' | 'commerce' | 'form';
    label: string;
    icon: string;
    defaultSettings: Record<string, unknown>;
    defaultStyles: ResponsiveStyles;
    hasChildren: boolean;
    EditorComponent: React.ComponentType<WidgetEditorProps>;
    PreviewComponent: React.ComponentType<WidgetPreviewProps>;
    SettingsPanel: React.ComponentType<WidgetSettingsPanelProps>;
    /**
     * Optional: for container widgets, the CSS applied to the editor drop zone
     * that holds the children — lets the admin canvas mirror the real layout
     * (e.g. a multi-column grid) instead of stacking children vertically.
     */
    getChildrenContainerStyle?: (component: PageComponent, device?: 'desktop' | 'tablet' | 'mobile') => React.CSSProperties | undefined;
}

export interface WidgetEditorProps {
    component: PageComponent;
    isSelected: boolean;
    onSelect: () => void;
    /**
     * Optional callback for inline text editing (A7).
     * When provided, double-clicking the widget's text area
     * commits the edited text back to the component settings.
     * The key identifies which settings field to update (e.g. "text").
     */
    onUpdateText?: (key: string, value: string) => void;
    children?: React.ReactNode;
}

export interface WidgetPreviewProps {
    component: PageComponent;
    children?: React.ReactNode;
}

export interface WidgetSettingsPanelProps {
    component: PageComponent;
    onChange: (settings: Record<string, unknown>) => void;
    onStyleChange: (styles: ResponsiveStyles) => void;
}
