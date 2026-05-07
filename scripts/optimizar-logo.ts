/**
 * Genera versiones optimizadas del logo a partir del PNG original
 * (que pesa varios MB) para distintos usos:
 *
 *   - public/logo.png        -> 256x256 (uso general en la web)
 *   - public/logo-256.png    -> 256x256 (alias para meta tags)
 *   - public/logo-512.png    -> 512x512 (uso de alta densidad)
 *   - src/app/icon.png       -> 256x256 (favicon, Next lo redimensiona)
 *   - src/app/apple-icon.png -> 180x180 (apple touch icon, tamano oficial)
 *
 * Uso:
 *   npx tsx scripts/optimizar-logo.ts
 *
 * Lee del PNG original en public/logo.png (que ya copiamos del Downloads
 * del usuario). Si le pasamos un argumento, lee de ahi.
 */
import path from "node:path";
import sharp from "sharp";

async function main() {
  const inputArg = process.argv[2];
  const cwd = process.cwd();
  const input = inputArg
    ? path.resolve(cwd, inputArg)
    : path.join(cwd, "public", "logo.png");

  console.log(`Leyendo: ${input}`);

  const targets: { ruta: string; lado: number }[] = [
    { ruta: "public/logo.png", lado: 256 },
    { ruta: "public/logo-256.png", lado: 256 },
    { ruta: "public/logo-512.png", lado: 512 },
    { ruta: "src/app/icon.png", lado: 256 },
    { ruta: "src/app/apple-icon.png", lado: 180 },
  ];

  // Leemos el PNG original UNA vez en memoria (es grande, 3+ MB).
  const orig = await sharp(input).png().toBuffer();

  for (const t of targets) {
    const out = path.join(cwd, t.ruta);
    const r = await sharp(orig)
      .resize(t.lado, t.lado, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(out);
    console.log(`  ${t.ruta.padEnd(28)} ${t.lado}x${t.lado}  ${(r.size / 1024).toFixed(1)} KB`);
  }

  console.log("\nListo.");
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
