import { alpha, createTheme } from "@mui/material/styles";

const colors = {
  bg0: "#071017",
  panel: "#10222c",
  panelStrong: "#0f202b",
  lineStrong: "#315469",
  text: "#f4f7f8",
  textMuted: "#93a7b5",
  accentPrimary: "#ff7a1a",
  accentPrimarySoft: "#ff9a4d",
  accentSecondary: "#59d3ff",
  accentLive: "#9df871",
  accentDanger: "#ff6b57",
};

const headingFont = '"Space Grotesk", "IBM Plex Sans", sans-serif';
const bodyFont = '"IBM Plex Sans", sans-serif';
const monoFont = '"IBM Plex Mono", monospace';

const appTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: colors.accentPrimary,
      light: colors.accentPrimarySoft,
      dark: "#d95d00",
      contrastText: colors.bg0,
    },
    secondary: {
      main: colors.accentSecondary,
      light: "#9ce6ff",
      dark: "#1ca5d9",
      contrastText: colors.bg0,
    },
    success: {
      main: colors.accentLive,
      contrastText: colors.bg0,
    },
    error: {
      main: colors.accentDanger,
    },
    info: {
      main: colors.accentSecondary,
    },
    background: {
      default: colors.bg0,
      paper: alpha(colors.panelStrong, 0.9),
    },
    divider: alpha(colors.lineStrong, 0.65),
    text: {
      primary: colors.text,
      secondary: colors.textMuted,
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: bodyFont,
    h1: {
      fontFamily: headingFont,
      fontWeight: 700,
      letterSpacing: "-0.04em",
    },
    h2: {
      fontFamily: headingFont,
      fontWeight: 700,
      letterSpacing: "-0.04em",
    },
    h3: {
      fontFamily: headingFont,
      fontWeight: 700,
      letterSpacing: "-0.04em",
    },
    h4: {
      fontFamily: headingFont,
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h5: {
      fontFamily: headingFont,
      fontWeight: 600,
      letterSpacing: "-0.03em",
    },
    h6: {
      fontFamily: headingFont,
      fontWeight: 600,
      letterSpacing: "-0.02em",
    },
    subtitle1: {
      fontFamily: bodyFont,
      fontWeight: 500,
      letterSpacing: "-0.01em",
    },
    subtitle2: {
      fontFamily: monoFont,
      fontSize: "0.85rem",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
    },
    body1: {
      fontFamily: bodyFont,
      lineHeight: 1.6,
    },
    body2: {
      fontFamily: bodyFont,
      lineHeight: 1.5,
    },
    button: {
      fontFamily: bodyFont,
      fontWeight: 600,
      fontSize: "0.98rem",
      letterSpacing: "0.01em",
      textTransform: "none",
    },
    caption: {
      fontFamily: monoFont,
      color: colors.textMuted,
    },
    overline: {
      fontFamily: monoFont,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          colorScheme: "dark",
        },
        "*, *::before, *::after": {
          boxSizing: "border-box",
        },
        "::selection": {
          backgroundColor: alpha(colors.accentPrimary, 0.35),
          color: colors.text,
        },
        body: {
          margin: 0,
          minWidth: 320,
          minHeight: "100vh",
          backgroundColor: colors.bg0,
          backgroundImage: [
            "radial-gradient(circle at top left, rgba(89, 211, 255, 0.14), transparent 34%)",
            "radial-gradient(circle at 82% 14%, rgba(255, 122, 26, 0.18), transparent 28%)",
            "linear-gradient(180deg, rgba(19, 34, 45, 0.96) 0%, rgba(7, 16, 23, 1) 100%)",
          ].join(", "),
          backgroundAttachment: "fixed",
          color: colors.text,
          fontFamily: bodyFont,
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "#root": {
          minHeight: "100vh",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 999,
          paddingInline: "1.2rem",
          transition:
            "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease, border-color 160ms ease",
        },
        contained: {
          boxShadow: `0 14px 36px ${alpha(colors.bg0, 0.34)}`,
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${colors.accentPrimarySoft} 0%, ${colors.accentPrimary} 100%)`,
          color: colors.bg0,
          "&:hover": {
            background: `linear-gradient(135deg, ${colors.accentPrimarySoft} 0%, ${colors.accentPrimary} 100%)`,
            boxShadow: `0 18px 40px ${alpha(colors.accentPrimary, 0.28)}`,
            transform: "translateY(-1px)",
          },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, #7be2ff 0%, ${colors.accentSecondary} 100%)`,
          color: colors.bg0,
          "&:hover": {
            background: `linear-gradient(135deg, #7be2ff 0%, ${colors.accentSecondary} 100%)`,
            boxShadow: `0 18px 40px ${alpha(colors.accentSecondary, 0.24)}`,
            transform: "translateY(-1px)",
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: colors.text,
          textDecorationColor: alpha(colors.accentSecondary, 0.45),
          textUnderlineOffset: "0.2em",
          transition: "color 160ms ease, text-decoration-color 160ms ease",
          "&:hover": {
            color: colors.accentSecondary,
            textDecorationColor: colors.accentSecondary,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: colors.textMuted,
          "&.Mui-focused": {
            color: colors.accentSecondary,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: alpha(colors.panel, 0.78),
          transition:
            "background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(colors.lineStrong, 0.85),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(colors.accentSecondary, 0.7),
          },
          "&.Mui-focused": {
            backgroundColor: alpha(colors.panel, 0.94),
            boxShadow: `0 0 0 4px ${alpha(colors.accentSecondary, 0.12)}`,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.accentSecondary,
          },
        },
        input: {
          color: colors.text,
          fontFamily: monoFont,
          fontVariantNumeric: "tabular-nums",
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: colors.accentSecondary,
          height: 4,
        },
        rail: {
          opacity: 1,
          backgroundColor: alpha(colors.lineStrong, 0.8),
        },
        track: {
          border: "none",
          boxShadow: `0 0 18px ${alpha(colors.accentSecondary, 0.28)}`,
        },
        thumb: {
          width: 14,
          height: 14,
          backgroundColor: colors.text,
          border: `3px solid ${colors.accentSecondary}`,
          boxShadow: `0 0 0 6px ${alpha(colors.accentSecondary, 0.12)}`,
          "&:hover, &.Mui-focusVisible": {
            boxShadow: `0 0 0 8px ${alpha(colors.accentSecondary, 0.2)}`,
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          color: colors.textMuted,
          "&.Mui-checked": {
            color: colors.accentLive,
          },
          "&.Mui-checked + .MuiSwitch-track": {
            backgroundColor: alpha(colors.accentLive, 0.55),
            opacity: 1,
          },
        },
        track: {
          backgroundColor: alpha(colors.lineStrong, 0.95),
          opacity: 1,
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          color: colors.text,
          fontWeight: 500,
        },
      },
    },
  },
});

export default appTheme;
