import React, { useState, useEffect } from "react";
import { LoginForm } from "./features/auth/LoginForm";
import { RegisterForm } from "./features/auth/RegisterForm";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { RulesSection } from "./features/rules/RulesSection";
import { HitsSection } from "./features/dashboard/HitsSection";
import { EventsSection } from "./features/events/EventsSection";
import { CamerasSection } from "./features/cameras/CamerasSection";
import { OnboardingWizard } from "./features/onboarding/OnboardingWizard";
import { LandingPage } from "./features/landing/LandingPage";
import DiagnosticsPage from "./features/diagnostics/DiagnosticsPage";
import { Button } from "./components/ui/Button";
import { ToastProvider } from "./context/ToastContext";
import "./styles/responsive.css";
import "./styles/typography.css";
import "./styles/layout.css";

function App() {
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [view, setView] = useState(() => {
    const savedView = localStorage.getItem("view");
    if (savedView === "landing") return "landing";
    return token ? "dashboard" : "landing";
  });
  const [tab, setTab] = useState("cameras");
  const [showOnboarding, setShowOnboarding] = useState(
    !localStorage.getItem("onboarding_completed") && token ? true : false
  );

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

    if (token && username) {
      handleLoginSuccess(token);
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
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
        <LandingPage onGetStarted={handleGetStarted} />
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
          />
        </div>
      ) : showOnboarding ? (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      ) : (
        <div
          style={{
            minHeight: "100vh",
            background: "#f8fafc",
          }}
        >
          <DashboardLayout onLogout={handleLogout}>
            {/* Tabs de Navegación */}
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
          ? "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)"
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
