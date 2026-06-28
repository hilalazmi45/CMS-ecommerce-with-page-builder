import { useState } from 'react';
import { registerWidget } from '../registry';
import type {
    WidgetDefinition,
    WidgetEditorProps,
    WidgetPreviewProps,
    WidgetSettingsPanelProps,
} from '../types';

interface BannerSlide {
    imageUrl: string;
    title: string;
    subtitle: string;
    buttonText: string;
    buttonUrl: string;
}

const DEFAULT_SLIDES: BannerSlide[] = [
    {
        imageUrl: '',
        title: 'Mega Sale — Up to 70% Off',
        subtitle: 'Shop top electronics brands at the best prices.',
        buttonText: 'Shop Now',
        buttonUrl: '/shop',
    },
    {
        imageUrl: '',
        title: 'New Arrivals Are Here',
        subtitle: 'Be the first to own the latest gadgets.',
        buttonText: 'Explore',
        buttonUrl: '/new-arrivals',
    },
];

function SlideView({ slide, index }: { slide: BannerSlide; index: number }) {
    const colors = ['from-blue-700 to-blue-500', 'from-indigo-700 to-purple-500', 'from-sky-700 to-cyan-500'];
    const gradient = colors[index % colors.length];
    return (
        <div
            className={`relative flex min-h-64 w-full items-center overflow-hidden rounded-xl ${!slide.imageUrl ? `bg-gradient-to-r ${gradient}` : ''}`}
        >
            {slide.imageUrl && (
                <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}
            <div className="absolute inset-0 bg-black/35" />
            <div className="relative z-10 flex flex-col gap-3 p-10">
                {slide.title && (
                    <h2 className="text-3xl font-extrabold text-white drop-shadow-sm">{slide.title}</h2>
                )}
                {slide.subtitle && (
                    <p className="max-w-lg text-white/90 drop-shadow-sm">{slide.subtitle}</p>
                )}
                {slide.buttonText && (
                    <a
                        href={slide.buttonUrl}
                        onClick={(e) => e.preventDefault()}
                        className="mt-1 inline-block w-fit rounded-lg bg-white px-6 py-2 text-sm font-semibold text-blue-700 shadow hover:bg-blue-50"
                    >
                        {slide.buttonText}
                    </a>
                )}
            </div>
        </div>
    );
}

function Preview({ component }: WidgetPreviewProps) {
    const rawSlides = component.settings.slides as BannerSlide[] | undefined;
    const slides: BannerSlide[] = rawSlides && rawSlides.length > 0 ? rawSlides : DEFAULT_SLIDES;
    const [current, setCurrent] = useState(0);
    const safeIndex = current < slides.length ? current : 0;
    const activeSlide = slides[safeIndex] ?? slides[0];

    const prev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrent((c) => (c - 1 + slides.length) % slides.length);
    };
    const next = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrent((c) => (c + 1) % slides.length);
    };

    if (!activeSlide) return null;

    return (
        <div className="relative w-full">
            <SlideView slide={activeSlide} index={safeIndex} />

            {/* Prev / Next */}
            <button
                onClick={prev}
                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow hover:bg-white"
            >
                ‹
            </button>
            <button
                onClick={next}
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow hover:bg-white"
            >
                ›
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                        className={`h-2 rounded-full transition-all ${i === safeIndex ? 'w-5 bg-white' : 'w-2 bg-white/50'}`}
                    />
                ))}
            </div>
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
        >
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange, onStyleChange: _onStyleChange }: WidgetSettingsPanelProps) {
    const rawSlides = component.settings.slides as BannerSlide[] | undefined;
    const slides: BannerSlide[] = rawSlides && rawSlides.length > 0 ? rawSlides : DEFAULT_SLIDES;

    const updateSlide = (index: number, field: keyof BannerSlide, value: string) => {
        const updated = slides.map((s, i) => (i === index ? { ...s, [field]: value } : s));
        onChange({ ...component.settings, slides: updated });
    };

    const addSlide = () => {
        onChange({
            ...component.settings,
            slides: [
                ...slides,
                { imageUrl: '', title: 'New Slide', subtitle: '', buttonText: 'Learn More', buttonUrl: '/' },
            ],
        });
    };

    const removeSlide = (index: number) => {
        if (slides.length <= 1) return;
        onChange({ ...component.settings, slides: slides.filter((_, i) => i !== index) });
    };

    return (
        <div className="space-y-4 p-3">
            {slides.map((slide, index) => (
                <div key={index} className="rounded border border-gray-200 p-2 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">Slide {index + 1}</span>
                        <button
                            onClick={() => removeSlide(index)}
                            className="text-xs text-red-400 hover:text-red-600"
                        >
                            Remove
                        </button>
                    </div>
                    {(['imageUrl', 'title', 'subtitle', 'buttonText', 'buttonUrl'] as const).map((field) => (
                        <div key={field}>
                            <label className="block text-xs text-gray-500 capitalize">{field}</label>
                            <input
                                type="text"
                                value={slide[field]}
                                onChange={(e) => updateSlide(index, field, e.target.value)}
                                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                            />
                        </div>
                    ))}
                </div>
            ))}
            <button
                onClick={addSlide}
                className="w-full rounded border border-dashed border-blue-400 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
            >
                + Add Slide
            </button>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'banner-carousel',
    version: 1,
    category: 'commerce',
    label: 'Banner Carousel',
    icon: '🎠',
    hasChildren: false,
    defaultSettings: { slides: DEFAULT_SLIDES },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
