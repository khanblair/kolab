import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import queryClient from "@/query-client";
import "@/index.css";
import { useAuth } from "@/components/providers/auth-provider/hooks/use-auth";
import { KeyboardShortcutsHelp } from "./components/keyboard-shortcuts-help";
import AuthProvider from "./components/providers/auth-provider";
import { ThemeProvider } from "./components/providers/theme-provider";
import { KeyboardShortcutsProvider } from "./hooks/use-keyboard-shortcuts";
import { captureCheckoutIntent } from "./lib/checkout-intent";
import { useSupabaseAuthForConvex } from "./lib/convex-auth";
import { AppI18nProvider } from "./lib/i18n/provider";
import { routeTree } from "./routeTree.gen";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Capture a pricing-page `?checkout=<plan>-<interval>` deep link before the
// router runs and strips it across the sign-up → onboarding redirect chain.
captureCheckoutIntent();

console.log(`
                     ////////
              /////  ////////
            //////// ////////
  //////// ///////// ///////
  //////// ///////// //////
  //////// ///////// ////
  //////// ///////// ///
  //////// ///////// /////
  //////// ///////// //////
  //////// ///////// ////////
  //////// ///////// ////////
  //////// ///////// ////////
  //////// ////////
  ////////  /////
  ///////


  All you need. Nothing you don't.
`);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  context: {
    user: null,
    queryClient,
  },
});

function App() {
  const { user } = useAuth();

  return <RouterProvider router={router} context={{ user }} />;
}

const rootElement = document.getElementById("root") as HTMLElement;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ConvexProviderWithAuth
        client={convex}
        useAuth={useSupabaseAuthForConvex}
      >
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <AppI18nProvider>
                <KeyboardShortcutsProvider>
                  <App />
                  <KeyboardShortcutsHelp />
                </KeyboardShortcutsProvider>
              </AppI18nProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ConvexProviderWithAuth>
    </StrictMode>,
  );
}
