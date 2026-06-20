import { Link } from "@tanstack/react-router";
import { Bell, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

export function CtaSection() {
  const isBn = useLanguage().lang === "bn";
  return (
    <section className="px-4 lg:px-8 pb-12 max-w-7xl mx-auto">
      <div
        className="relative overflow-hidden rounded-2xl border border-primary/20 shadow-elegant"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--primary) 90%, transparent) 0%, color-mix(in oklab, var(--primary) 60%, var(--accent)) 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-40"
          style={{ background: "color-mix(in oklab, var(--accent) 70%, transparent)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-30"
          style={{ background: "color-mix(in oklab, var(--primary-foreground) 30%, transparent)" }}
        />
        <div className="relative px-6 py-10 lg:px-12 lg:py-14 text-center text-primary-foreground">
          <h2 className="text-2xl lg:text-4xl font-bold tracking-tight">
            {isBn ? "আমাদের কমিউনিটিতে যোগ দিন" : "Join our growing community"}
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-sm lg:text-base text-primary-foreground/85">
            {isBn
              ? "নোটিশ পড়ুন, ইভেন্টে অংশ নিন এবং একসাথে শিখুন।"
              : "Stay updated with notices, attend events, and learn together."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="shadow-soft">
              <Link to="/notices">
                <Bell className="mr-1.5 h-4 w-4" />
                {isBn ? "নোটিশ দেখুন" : "See notices"}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="bg-background text-foreground hover:bg-background/90"
            >
              <Link to="/signup">
                <Users className="mr-1.5 h-4 w-4" />
                {isBn ? "কমিউনিটিতে যোগ দিন" : "Join the community"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
