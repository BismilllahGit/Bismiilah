"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectSlide {
  src: string;
  title: string;
  subtitle: string;
  tag: string;
  location?: string;
}

const SLIDES: ProjectSlide[] = [
  {
    src: "/slider/slide-1.jpg",
    title: "Farook Nagar Duplex Elevation",
    subtitle: "Contemporary twin duplex residence featuring curved balconies, wooden gates, and landscaped planters",
    tag: "Residential Elevation",
    location: "Tiruvannamalai",
  },
  {
    src: "/slider/slide-2.jpg",
    title: "Contemporary 3-Storey Villa",
    subtitle: "Stone-cladding exterior facade with warm ambient lighting, glass balustrades, and vertical louvers",
    tag: "Luxury Villa",
    location: "Architectural Build",
  },
  {
    src: "/slider/slide-3.jpg",
    title: "Modern Sunset Residence",
    subtitle: "Two-tier contemporary home with private terrace, integrated planter boxes, and evening illumination",
    tag: "Custom Architecture",
    location: "Premium Home",
  },
  {
    src: "/slider/slide-4.jpg",
    title: "Twilight Geometric Residence",
    subtitle: "Architectural framing with expansive vertical glazing, warm spotlighting, and wooden entry gate",
    tag: "Modern Facade",
    location: "Residential Project",
  },
  {
    src: "/slider/slide-5.jpg",
    title: "Duplex Perspective Elevation",
    subtitle: "Side elevation view showcasing perimeter boundary wall, dual car entrances, and upper terrace deck",
    tag: "Detailed Elevation",
    location: "Tiruvannamalai",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      nextSlide();
    }, 5500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, nextSlide]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* Mobile/Tablet Banner Slider (visible below lg) */}
      <div className="relative w-full h-56 sm:h-72 lg:hidden overflow-hidden bg-slate-950">
        {SLIDES.map((slide, idx) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <Image
              src={slide.src}
              alt={slide.title}
              fill
              priority={idx === 0}
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />
            
            <div className="absolute bottom-3 left-4 right-4 z-20 text-white">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 backdrop-blur-md mb-1">
                {slide.tag}
              </span>
              <h2 className="text-base font-semibold leading-tight drop-shadow-sm">{slide.title}</h2>
            </div>
          </div>
        ))}
        
        {/* Mobile slide indicator pills */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentSlide ? "w-5 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Left Column: Form Section */}
      <div className="w-full lg:w-[480px] xl:w-[540px] flex flex-col justify-between p-6 sm:p-10 lg:p-12 z-10 shrink-0">
        {/* Top Header */}
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-border/80 bg-white p-1 shadow-sm flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Bismillah Construction"
              width={40}
              height={40}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div>
            <div className="font-bold text-foreground text-base tracking-tight leading-none">
              Bismillah Construction
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Operations & Project Management
            </div>
          </div>
        </div>

        {/* Center: Login Form */}
        <div className="my-auto py-8 max-w-sm w-full mx-auto">
          <div className="space-y-1.5 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage projects, labour, and operations
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium animate-in fade-in">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label
                className="text-sm font-medium leading-none text-foreground flex items-center gap-2"
                htmlFor="email"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="owner@bismillah.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium leading-none text-foreground flex items-center gap-2"
                  htmlFor="password"
                >
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="flex h-11 w-full rounded-lg border border-input bg-background pl-3.5 pr-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold shadow-sm hover:shadow transition-all mt-2 cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                "Signing in..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Bismillah Construction</span>
          <span className="flex items-center gap-1.5 text-foreground/80 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Secure Portal
          </span>
        </div>
      </div>

      {/* Right Column: Interactive Project Slider (Desktop) */}
      <div
        className="relative hidden lg:flex flex-1 overflow-hidden bg-slate-950 select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Slides */}
        {SLIDES.map((slide, idx) => {
          const isActive = idx === currentSlide;
          return (
            <div
              key={slide.src}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              <div className={`relative h-full w-full transition-transform duration-[6000ms] ease-out ${
                isActive ? "scale-105" : "scale-100"
              }`}>
                <Image
                  src={slide.src}
                  alt={slide.title}
                  fill
                  priority={idx <= 1}
                  className="object-cover"
                  sizes="(min-width: 1024px) 60vw, 100vw"
                />
              </div>

              {/* Ambient gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/40" />
            </div>
          );
        })}

        {/* Top Floating Badge */}
        <div className="absolute top-8 left-8 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white text-xs font-medium shadow-lg">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>Bismillah Project Portfolio</span>
        </div>

        {/* Slide Counter (Top Right) */}
        <div className="absolute top-8 right-8 z-20 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white/90 text-xs font-mono">
          <span>0{currentSlide + 1}</span>
          <span className="text-white/40">/</span>
          <span className="text-white/60">0{SLIDES.length}</span>
        </div>

        {/* Bottom Project Caption & Controls */}
        <div className="absolute bottom-8 left-8 right-8 z-20 flex flex-col gap-6">
          {/* Glassmorphic Project Details Card */}
          <div className="p-6 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15 text-white max-w-xl shadow-2xl">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                {SLIDES[currentSlide].tag}
              </span>
              {SLIDES[currentSlide].location && (
                <span className="text-xs text-white/70 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {SLIDES[currentSlide].location}
                </span>
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-white tracking-tight leading-snug drop-shadow-sm">
              {SLIDES[currentSlide].title}
            </h2>
            
            <p className="text-sm text-white/80 mt-2 line-clamp-2 leading-relaxed">
              {SLIDES[currentSlide].subtitle}
            </p>
          </div>

          {/* Bottom Bar: Indicators & Arrow Controls */}
          <div className="flex items-center justify-between">
            {/* Interactive Progress Indicators */}
            <div className="flex items-center gap-2">
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Jump to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                    idx === currentSlide
                      ? "w-10 bg-white shadow-md shadow-white/30"
                      : "w-2 bg-white/35 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous slide"
                className="h-10 w-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next slide"
                className="h-10 w-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
