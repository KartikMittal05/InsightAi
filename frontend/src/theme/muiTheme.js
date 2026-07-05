import { createTheme } from "@mui/material/styles";

const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1f2937",
      contrastText: "#f8fafc",
    },
    secondary: {
      main: "#4b5563",
      contrastText: "#f8fafc",
    },
    background: {
      default: "#f3f5f8",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: "IBM Plex Sans, Segoe UI, Tahoma, sans-serif",
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontWeight: 600, letterSpacing: "-0.01em" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { boxShadow: "none" },
      },
    },
  },
});

export default muiTheme;
