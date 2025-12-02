import React, { useState, useEffect } from "react";
import { LoginForm } from "./features/auth/LoginForm";
import { RegisterForm } from "./features/auth/RegisterForm";
import { ForgotPasswordForm } from "./features/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "./features/auth/ResetPasswordForm";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { RulesSection } from "./features/rules/RulesSection";
import { HitsSection } from "./features/dashboard/HitsSection";
import { EventsSection } from "./features/events/EventsSection";
import { CamerasSection } from "./features/cameras/CamerasSection";
import { ProfilePage } from "./features/profile/ProfilePage";
import { OnboardingWizard } from "./features/onboarding/OnboardingWizard";
import { LandingPageV0 } from "./features/landing/LandingPageV0";
import DiagnosticsPage from "./features/diagnostics/DiagnosticsPage";
import { Button } from "./components/ui/Button";
import { ToastProvider } from "./context/ToastContext";
import "./styles/responsive.css";
import "./styles/typography.css";
import "./styles/layout.css";

function App() {
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [view, setView] = useState(() => {
    // Check for reset password URL first
    if (window.location.pathname === "/reset-password") {
      return "reset-password";
    }
    const savedView = localStorage.getItem("view");
    if (savedView === "landing") return "landing";
    return token ? "dashboard" : "landing";
  });
  const [tab, setTab] = useState("cameras");

  const handleLoginSuccess = (newToken) => {
    setToken(newToken);
    localStorage.setItem("adminToken", newToken);
    setView("dashboard");
  };

  // Manejar callback de OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const username = urlParams.get("username");
    const email = urlParams.get("email");

    if (token && username && !window.location.pathname.includes("reset-password")) {
      // Guardar datos del usuario en localStorage
      const userData = {
        username: username,
        email: email || "",
        whatsapp_number: ""
      };
      localStorage.setItem("userData", JSON.stringify(userData));

      handleLoginSuccess(token);
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userData");
    localStorage.setItem("view", "landing");
    setToken("");
    setView("landing");
  };

  const handleGetStarted = () => {
    localStorage.setItem("view", "login");
    setView("login");
  };

  // Check for debug mode
  const urlParams = new URLSearchParams(window.location.search);
  const debugMode = urlParams.get('debug') === 'true';

  if (debugMode) {
    return (
      <ToastProvider>
        <DiagnosticsPage />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      {view === "landing" ? (
        <LandingPageV0
          onGetStarted={handleGetStarted}
          onLogin={() => {
            localStorage.setItem("view", "login");
            setView("login");
          }}
          onRegister={() => {
            localStorage.setItem("view", "register");
            setView("register");
          }}
        />
      ) : view === "login" ? (
        <div
          style={{
            minHeight: "100vh",
            background: "radial-gradient(circle at top, #e0f2fe 0, #f5f5f7 40%)",
          }}
        >
          <LoginForm
            onLoginSuccess={handleLoginSuccess}
            onBackToLanding={() => {
              localStorage.setItem("view", "landing");
              setView("landing");
            }}
            onNavigateToRegister={() => {
              localStorage.setItem("view", "register");
              setView("register");
            }}
            onForgotPassword={() => {
              localStorage.setItem("view", "forgot-password");
              setView("forgot-password");
            }}
          />
        </div>
      ) : view === "register" ? (
        <div
          style={{
            minHeight: "100vh",
            background: "radial-gradient(circle at top, #d1fae5 0, #f5f5f7 40%)",
          }}
        >
          <RegisterForm
            onRegisterSuccess={handleLoginSuccess}
            onBackToLogin={() => {
              localStorage.setItem("view", "login");
              setView("login");
            }}
            onBackToLanding={() => {
              localStorage.setItem("view", "landing");
              setView("landing");
            }}
          />
        </div>
      ) : view === "forgot-password" ? (
        <div className="min-h-screen bg-background">
          <ForgotPasswordForm
            onBackToLogin={() => {
              localStorage.setItem("view", "login");
              setView("login");
            }}
          />
        </div>
      ) : view === "reset-password" ? (
        <div className="min-h-screen bg-background">
          <ResetPasswordForm
            token={new URLSearchParams(window.location.search).get("token")}
            onResetSuccess={() => {
              // Limpiar URL y volver al login
              window.history.replaceState({}, document.title, "/");
              localStorage.setItem("view", "login");
              setView("login");
            }}
            onBackToLogin={() => {
              window.history.replaceState({}, document.title, "/");
              localStorage.setItem("view", "login");
              setView("login");
            }}
          />
        </div>
      ) : (
        <div
          style={{
            minHeight: "100vh",
            background: "#f8fafc",
          }}
        >
          <DashboardLayout
            onLogout={handleLogout}
            onNavigateToProfile={() => setTab("profile")}
            onNavigateToLanding={() => {
              localStorage.setItem("view", "landing");
              setView("landing");
            }}
          >
            {/* Mostrar tabs de navegación solo si no estamos en perfil */}
            {tab !== "profile" && (
              <div
                className="sticky-tabs"
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: 8,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  border: "1px solid #e2e8f0",
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 4,
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                  marginBottom: "clamp(24px, 4vw, 40px)",
                }}
              >
                <TabButton active={tab === "cameras"} onClick={() => setTab("cameras")}>
                  📷 Cámaras
                </TabButton>
                <TabButton active={tab === "rules"} onClick={() => setTab("rules")}>
                  ⚙️ Reglas
                </TabButton>
                <TabButton active={tab === "hits"} onClick={() => setTab("hits")}>
                  🔔 Activaciones
                </TabButton>
                <TabButton
                  active={tab === "events"}
                  onClick={() => setTab("events")}
                >
                  📊 Eventos
                </TabButton>
              </div>
            )}

            {/* Contenido */}
            <div style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
            }}>
              {tab === "cameras" && <CamerasSection />}
              {tab === "rules" && <RulesSection />}
              {tab === "hits" && <HitsSection />}
              {tab === "events" && <EventsSection />}
              {tab === "profile" && <ProfilePage onBack={() => setTab("cameras")} />}
            </div>
          </DashboardLayout>
        </div>
      )}
    </ToastProvider>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "1 1 0",
        width: "100%",
        minWidth: 0,
        padding: "14px 16px",
        fontSize: "clamp(13px, 1.6vw, 15px)",
        fontWeight: active ? 600 : 500,
        fontFamily: "var(--font-family-base)",
        background: active
          ? "linear-gradient(135deg, #059669ff 0%, #10b981ff 100%)"
          : "transparent",
        color: active ? "#fff" : "#64748b",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        whiteSpace: "nowrap",
        position: "relative",
        outline: "none",
        letterSpacing: "-0.01em",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      onMouseOver={(e) => {
        if (!active) {
          e.currentTarget.style.background = "#f1f5f9";
          e.currentTarget.style.color = "#475569";
        }
      }}
      onMouseOut={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#64748b";
        }
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = "2px solid #3b82f6";
        e.currentTarget.style.outlineOffset = "2px";
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = "none";
      }}
    >
      {children}
      {active && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "40%",
            height: 3,
            background: "#fff",
            borderRadius: "2px 2px 0 0",
            boxShadow: "0 -2px 4px rgba(255,255,255,0.3)",
          }}
        />
      )}
    </button>
  );
}

export default App;
