import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Mail, ArrowRight, Activity } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Conta criada! Aguarde a aprovação do administrador para acessar o sistema.");
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Email ou senha incorretos.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">

      {/* ── Background glows ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{
          position: "absolute", top: "-20%", right: "-10%",
          width: 800, height: 600,
          background: "radial-gradient(ellipse, rgba(0,229,255,0.08) 0%, transparent 65%)",
          filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute", bottom: "-15%", left: "-15%",
          width: 700, height: 500,
          background: "radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 65%)",
          filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "30%",
          width: 400, height: 300,
          background: "radial-gradient(ellipse, rgba(240,69,200,0.06) 0%, transparent 65%)",
          filter: "blur(40px)",
          transform: "translateY(-50%)",
        }} />
        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
      </div>

      {/* ── Left panel (branding) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] p-14 relative">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "rgba(0,229,255,0.09)",
            border: "1px solid rgba(0,229,255,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(0,229,255,0.2)",
          }}>
            <Activity style={{ width: 18, height: 18, color: "#00e5ff" }} />
          </div>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, fontSize: 17,
            color: "rgba(240,240,255,0.95)",
            letterSpacing: "-0.02em",
          }}>
            LibertyAds
          </span>
        </div>

        {/* Center content */}
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "4px 12px", borderRadius: 20,
            background: "rgba(0,229,255,0.07)",
            border: "1px solid rgba(0,229,255,0.18)",
            marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e5ff", boxShadow: "0 0 8px #00e5ff" }} className="animate-pulse-dot" />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#00e5ff", letterSpacing: "0.1em" }}>
              SISTEMA OPERACIONAL
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "3.2rem", fontWeight: 800,
            lineHeight: 1.08, letterSpacing: "-0.04em",
            color: "rgba(240,240,255,0.95)",
            marginBottom: 20,
          }}>
            Inteligência<br />
            <span style={{
              background: "linear-gradient(135deg, #00e5ff 0%, #8b5cf6 55%, #f045c8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              em tempo real.
            </span>
          </h1>

          <p style={{ fontSize: 15, color: "rgba(160,160,200,0.75)", lineHeight: 1.7, maxWidth: 380 }}>
            Dashboard de performance para campanhas de Facebook Ads. Dados, métricas e decisões — tudo centralizado.
          </p>

          {/* Stats */}
          <div style={{ display: "flex", gap: 32, marginTop: 44 }}>
            {[
              { label: "Métricas", value: "20+" },
              { label: "Tempo real", value: "Live" },
              { label: "Contas BM", value: "Multi" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 22, fontWeight: 700,
                  color: "rgba(240,240,255,0.9)",
                  letterSpacing: "-0.04em",
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "rgba(140,140,180,0.6)", marginTop: 2, letterSpacing: "0.05em" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom line */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, rgba(0,229,255,0.3), transparent)" }} />
          <span style={{ fontSize: 11, color: "rgba(120,120,160,0.5)", letterSpacing: "0.1em" }}>
            LIBERTY ADS INTELLIGENCE
          </span>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-16 lg:px-16 relative">

        {/* Vertical separator on large screens */}
        <div className="absolute left-0 top-[10%] bottom-[10%] w-px hidden lg:block" style={{
          background: "linear-gradient(180deg, transparent, rgba(0,229,255,0.12) 30%, rgba(0,229,255,0.12) 70%, transparent)",
        }} />

        <div className="w-full max-w-[400px] animate-scale-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: "rgba(0,229,255,0.09)",
              border: "1px solid rgba(0,229,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Activity style={{ width: 16, height: 16, color: "#00e5ff" }} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "rgba(240,240,255,0.9)" }}>
              LibertyAds
            </span>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1.7rem", fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "rgba(240,240,255,0.95)",
              marginBottom: 6,
            }}>
              {isSignUp ? "Criar conta" : "Entrar"}
            </h2>
            <p style={{ fontSize: 14, color: "rgba(140,140,180,0.65)" }}>
              {isSignUp
                ? "Preencha os dados para solicitar acesso"
                : "Acesse sua conta para continuar"}
            </p>
          </div>

          {/* Form card */}
          <div style={{
            background: "rgba(10,10,26,0.85)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            padding: "28px 28px 24px",
            boxShadow: "0 24px 64px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset",
          }}
            className="animate-border-glow"
          >
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(160,160,200,0.7)", textTransform: "uppercase" }}>
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(120,120,180,0.45)" }} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    style={{
                      paddingLeft: 40,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 9,
                      color: "rgba(240,240,255,0.9)",
                      fontSize: 14,
                      height: 42,
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(0,229,255,0.4)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0,229,255,0.08)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(160,160,200,0.7)", textTransform: "uppercase" }}>
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(120,120,180,0.45)" }} />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    style={{
                      paddingLeft: 40,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 9,
                      color: "rgba(240,240,255,0.9)",
                      fontSize: 14,
                      height: 42,
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(0,229,255,0.4)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0,229,255,0.08)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Feedback */}
              {error && (
                <div className="badge-danger rounded-lg px-3 py-2.5 text-sm flex items-center gap-2">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff2d6e", flexShrink: 0 }} />
                  {error}
                </div>
              )}
              {message && (
                <div className="badge-success rounded-lg px-3 py-2.5 text-sm flex items-center gap-2">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88", flexShrink: 0 }} />
                  {message}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 9,
                  border: "none",
                  background: loading
                    ? "rgba(0,229,255,0.12)"
                    : "linear-gradient(135deg, rgba(0,229,255,0.9) 0%, rgba(0,180,220,0.85) 100%)",
                  color: loading ? "rgba(0,229,255,0.6)" : "#040410",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.02em",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 4px 24px rgba(0,229,255,0.3), 0 1px 0 rgba(255,255,255,0.15) inset",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.target as HTMLButtonElement).style.boxShadow = "0 6px 32px rgba(0,229,255,0.45), 0 1px 0 rgba(255,255,255,0.15) inset";
                    (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    (e.target as HTMLButtonElement).style.boxShadow = "0 4px 24px rgba(0,229,255,0.3), 0 1px 0 rgba(255,255,255,0.15) inset";
                    (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                  }
                }}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(0,229,255,0.2)", borderTopColor: "#00e5ff" }} />
                    Aguarde...
                  </>
                ) : (
                  <>
                    {isSignUp ? "Criar Conta" : "Entrar"}
                    <ArrowRight style={{ width: 15, height: 15 }} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Toggle */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }}
              style={{
                fontSize: 13,
                color: "rgba(140,140,180,0.6)",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = "#00e5ff"; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = "rgba(140,140,180,0.6)"; }}
            >
              {isSignUp ? "Ja tem conta? Entrar" : "Nao tem conta? Criar conta"}
            </button>
          </div>

          {/* Footer */}
          <p style={{ textAlign: "center", fontSize: 10.5, color: "rgba(100,100,140,0.4)", marginTop: 32, letterSpacing: "0.12em" }}>
            LIBERTY ADS INTELLIGENCE v2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
