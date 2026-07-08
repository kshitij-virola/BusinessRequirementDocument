import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Send, Paperclip, Sparkles } from "lucide-react";
import { toast } from "@/store/toastStore";
import { useMe } from "@/lib/api/hooks";

interface MessageInputProps {
  onSend: (
    content: string,
    images: File[],
    mode: string,
    usePromptImprover: boolean,
  ) => void;
  disabled?: boolean;
  isFirstMessage?: boolean;
  hideSuggestion?: boolean;
}
const placeholder = [
  "Build an app that…",
  "Create a website for…",
  "Generate a image…",
  "Design a wireframe for…",
  "Generate a Theme...",
];

const modes = [
  {
    value: "website",
    label: "Website",
    icon: "🌐",
    description: "Full website",
  },
  { value: "ui", label: "UI Only", icon: "🎨", description: "UI components" },
  {
    value: "wordpress_divi_child",
    label: "WordPress",
    icon: "📝",
    description: "Divi theme",
    img: "/image/wordPress.svg",
  },
  {
    value: "reactjs",
    label: "ReactJS",
    icon: "⚛️",
    description: "React app",
    img: "/image/react.svg",
  },
  {
    value: "angular",
    label: "Angular",
    icon: "🅰️",
    description: "Angular app",
    img: "/image/angular.svg",
  },
  {
    value: "vuejs",
    label: "VueJS",
    icon: "💚",
    description: "Vue app",
    img: "/image/vue.svg",
  },
];

const promptSuggestions = [
  "Create a modern SaaS dashboard with sidebar navigation and analytics charts",
  "Build a landing page with hero section, features grid, and pricing cards",
  "Design an e-commerce product listing page with filters and cart",
  "Generate a blog homepage with featured posts and newsletter signup",
];

export const MessageInput = ({
  onSend,
  disabled,
  isFirstMessage,
  hideSuggestion = false,
}: MessageInputProps) => {
  const { data: me } = useMe();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const isFreePlan = me?.subscription.plan === "free";
  const [mode, setMode] = useState<
    "website" | "ui" | "wordpress_divi_child" | "reactjs" | "angular" | "vuejs"
  >("website");
  const [usePromptImprover, setUsePromptImprover] = useState(true);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(() =>
    placeholder.length > 0 ? placeholder[0].split(" ")[0] : "",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let isMounted = true;
    let currentStringIndex = 0;
    let currentWordIndex = 1;
    let timer: NodeJS.Timeout;

    const animate = () => {
      if (!isMounted) return;
      const currentText = placeholder[currentStringIndex];
      const words = currentText.split(" ");

      if (currentWordIndex <= words.length) {
        const text = words.slice(0, currentWordIndex).join(" ");
        setCurrentPlaceholder(text);
        currentWordIndex++;
        timer = setTimeout(animate, 300); // Wait 300ms before adding the next word
      } else {
        timer = setTimeout(() => {
          if (!isMounted) return;
          currentStringIndex = (currentStringIndex + 1) % placeholder.length;
          currentWordIndex = 1;
          animate();
        }, 2000); // Pause for 2s after full sentence is shown
      }
    };

    // Start typing animation after a brief delay if not the first word
    timer = setTimeout(animate, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (isFreePlan && mode !== "ui") setMode("ui");
  }, [isFreePlan, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) return;
    if (disabled) return;

    onSend(content, images, mode, usePromptImprover);
    setContent("");
    setImages([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    setImages([...images, ...files.slice(0, 5 - images.length)]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-border bg-background shrink-0">
      <div className="max-w-3xl mx-auto p-4">
        {/* Mode Selection (first message only) */}
        {isFirstMessage && (
          <div className="mb-4 space-y-3">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Generation Mode{" "}
              {isFreePlan && "(Free plan is limited to UI Only generation)"}
            </label>
            {!isFreePlan && (
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                {modes.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value as typeof mode)}
                    className={cn(
                      "p-3 rounded-xl text-left transition-all border",
                      mode === m.value
                        ? "bg-primary/20 border-primary/60 text-primary"
                        : "bg-card border-border text-gray-400 hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    {m.img ? (
                      <img
                        src={m.img}
                        alt={m.label}
                        height="20"
                        width="20"
                        className="mb-1"
                      />
                    ) : (
                      <div className="text-xl mb-1">{m.icon}</div>
                    )}
                    <div className="text-xl font-semibold leading-tight">
                      {m.label}
                    </div>
                    <div className="text-md opacity-60 hidden sm:block">
                      {m.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {(mode === "ui" ||
              mode === "reactjs" ||
              mode === "angular" ||
              mode === "vuejs") && (
              <label className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl border border-primary/20 cursor-pointer">
                <input
                  type="checkbox"
                  id="usePromptImprover"
                  checked={usePromptImprover}
                  onChange={(e) => setUsePromptImprover(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    AI Prompt Enhancer
                  </span>
                  <span className="text-xs text-gray-500 block">
                    AI will refine and optimize your prompt
                  </span>
                </div>
              </label>
            )}
          </div>
        )}
        {/* Suggestion */}
        {!hideSuggestion && (
          <div className="relative rounded-xl border border-border bg-card focus-within:border-primary/60 transition-colors p-4 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Suggestions
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {promptSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setContent(s);
                      textareaRef.current?.focus();
                    }}
                    className="text-left rounded-lg border border-border bg-card px-3 py-2 text-sm text-gray-500 hover:border-primary/50 hover:text-gray-200 hover:bg-[#1a1a2e] transition-colors line-clamp-2"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {isFreePlan && (
          <p className="text-xs text-gray-500 mb-4">
            Free plan is limited to UI Only generation.{" "}
            <Link href="/billing" className="text-primary hover:underline">
              Upgrade your plan
            </Link>{" "}
            to unlock all modes.
          </p>
        )}
        {/* Image Preview */}
        {images.length > 0 && (
          <div className="mb-3 flex gap-2 flex-wrap">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Upload ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Input Form */}
        <form onSubmit={handleSubmit}>
          <div className="relative rounded-xl border border-border bg-card focus-within:border-primary/60 transition-colors">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isFirstMessage
                  ? currentPlaceholder
                  : "Refine or modify the theme..."
              }
              disabled={disabled}
              rows={3}
              className="w-full resize-none rounded-xl bg-transparent px-4 pt-3 pb-10 text-sm text-foreground placeholder:text-gray-500 focus:outline-none max-h-[180px]"
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 180) + "px";
              }}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || images.length >= 5}
                title={
                  images.length >= 5 ? "Maximum 5 images" : "Attach images"
                }
                className="p-1.5 rounded-lg text-gray-400 hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={disabled || (!content.trim() && images.length === 0)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white hover:bg-primary-hover px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95"
              >
                {disabled ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {disabled ? "Sending" : "Send"}
              </button>
            </div>
          </div>
        </form>

        <p className="mt-2 text-xs text-gray-500 text-center">
          <kbd className="px-1.5 py-0.5 bg-secondary rounded border border-border font-mono text-xs">
            Enter
          </kbd>{" "}
          to send,{" "}
          <kbd className="px-1.5 py-0.5 bg-secondary rounded border border-border font-mono text-xs">
            Shift+Enter
          </kbd>{" "}
          for new line
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageSelect}
        className="hidden"
      />
    </div>
  );
};
