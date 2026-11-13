import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Reader from "./pages/Reader";
import SearchPage from "./pages/Search";
import Messages from "./pages/Messages";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/busca" component={SearchPage} />
      <Route path="/mensagens" component={Messages} />
      <Route path="/leitura/:book/:chapter" component={Reader} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
