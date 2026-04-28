import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { err: Error | null };

/** Evita tela em branco silenciosa quando algum filho lança na renderização. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[Criador de Ficha]", err, info.componentStack);
  }

  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            maxWidth: 520,
            margin: "2rem auto",
            padding: "1.25rem",
            background: "#fff5f5",
            border: "1px solid #d4a0a0",
            borderRadius: 8,
          }}
        >
          <h1 style={{ fontSize: "1.1rem", marginTop: 0 }}>Algo quebrou ao carregar a interface</h1>
          <p style={{ color: "#333" }}>{this.state.err.message}</p>
          <p style={{ fontSize: "0.9rem", color: "#555" }}>
            Abra o console do navegador (F12) para ver o stack completo. Se acabou de editar o{" "}
            <code>.env</code>, confira <code>SUPABASE_URL</code> em <code>web/.env</code> e reinicie{" "}
            <code>npm run dev</code>.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
