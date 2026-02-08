import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { GITHUB_NEW_ISSUE_URL } from '../utils/constants';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    // Reload the page to reset the application state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            p: 2,
          }}
        >
          <Paper sx={{ p: 3, maxWidth: 600, width: '100%', textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom color="error">
              Une erreur est survenue
            </Typography>
            <Typography variant="h6" component="h2" gutterBottom>
              Désolé, quelque chose s'est mal passé.
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              L'application a rencontré une erreur inattendue. Veuillez recharger la page pour
              continuer.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReload}
                sx={{ mt: 2 }}
              >
                Recharger la page
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  const errorDetails = this.state.error
                    ? `Erreur: ${this.state.error.toString()}\n\nStack: ${this.state.error.stack || 'N/A'}`
                    : 'Erreur inconnue';
                  const githubUrl = `${GITHUB_NEW_ISSUE_URL}?body=${encodeURIComponent(errorDetails)}`;
                  window.open(githubUrl, '_blank');
                }}
              >
                Signaler un bug
              </Button>
            </Box>

            {/* Show error details in development mode */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mt: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Détails de l'erreur:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                >
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
