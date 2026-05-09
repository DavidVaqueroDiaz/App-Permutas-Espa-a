/**
 * OG image dinamica para PermutaES.
 *
 * Cuando alguien comparte la URL en WhatsApp / Twitter / Telegram /
 * Slack / cualquier red social, esta es la imagen del preview. Sin
 * ella el preview sale vacio (= se ignora) y baja el CTR.
 *
 * Next 15+ recoge automaticamente este archivo como /opengraph-image
 * y lo asocia al `metadata.openGraph.images` de la home. Lo generamos
 * con `next/og` (basado en Satori) — no requiere puppeteer ni assets
 * externos, todo se renderiza con JSX en el edge.
 *
 * Tamano estandar para OG: 1200x630 px.
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PermutaES — Bolsa de permutas para funcionarios públicos en España";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #0d4a3a 0%, #0f6e56 60%, #1a7d68 100%)",
          color: "#ffffff",
          padding: "70px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Badge superior */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(93, 202, 165, 0.25)",
            border: "1px solid rgba(93, 202, 165, 0.5)",
            color: "#a7e9cf",
            padding: "10px 20px",
            borderRadius: "999px",
            fontSize: "22px",
            fontWeight: 500,
            alignSelf: "flex-start",
          }}
        >
          Para funcionarios públicos en toda España
        </div>

        {/* Logo + nombre */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginTop: "50px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "80px",
              height: "80px",
              background: "rgba(93, 202, 165, 0.18)",
              border: "1px solid rgba(93, 202, 165, 0.4)",
              borderRadius: "20px",
            }}
          >
            <svg viewBox="0 0 32 32" width="56" height="56">
              <path
                d="M8 13 L16 6 L24 13 L24 25 L19 25 L19 18 L13 18 L13 25 L8 25 Z"
                fill="#5dcaa5"
              />
              <circle cx="22" cy="9" r="2.2" fill="#5dcaa5" />
            </svg>
          </div>
          <div
            style={{
              fontSize: "56px",
              fontWeight: 700,
              letterSpacing: "-1px",
              display: "flex",
            }}
          >
            PermutaES
          </div>
        </div>

        {/* Titular principal */}
        <div
          style={{
            fontSize: "76px",
            fontWeight: 700,
            lineHeight: 1.05,
            marginTop: "40px",
            maxWidth: "1000px",
            display: "flex",
          }}
        >
          Encuentra tu permuta
        </div>

        {/* Subtitulo */}
        <div
          style={{
            fontSize: "28px",
            color: "#a7e9cf",
            marginTop: "20px",
            maxWidth: "950px",
            lineHeight: 1.35,
            display: "flex",
          }}
        >
          Detección automática de cadenas a 2, 3 y 4 personas. Docencia,
          sanidad SNS, AGE, autonómicos, locales, habilitados nacionales
          y policía local.
        </div>

        {/* Pie */}
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "70px",
            right: "70px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "20px",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <div style={{ display: "flex" }}>
            Gratis · Sin publicidad · RGPD completo
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
