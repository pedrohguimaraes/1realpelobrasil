import QRCode from "qrcode";
import { randomUUID } from "crypto";

/**
 * Gera cobrança Pix mock (copia e cola + QR em base64) para desenvolvimento.
 * Substitua pela resposta do gateway real.
 */
export async function buildMockPixPayload(amountCents: number): Promise<{
  gatewayTxId: string;
  pixCopiaCola: string;
  pixQrcodeBase64: string;
}> {
  const gatewayTxId = randomUUID();
  const brl = (amountCents / 100).toFixed(2).replace(".", ",");
  const pixCopiaCola =
    `00020126580014BR.GOV.BCB.PIX0136${gatewayTxId.replace(/-/g, "")}` +
    `52040000530398654${String(brl.length + 4).padStart(2, "0")}${brl}` +
    `5802BR59251 REAL PELO BRASIL6009SAO PAULO62070503***6304MOCK`;

  const dataUrl = await QRCode.toDataURL(pixCopiaCola, {
    margin: 2,
    width: 280,
    errorCorrectionLevel: "M",
  });
  const pixQrcodeBase64 = dataUrl.replace(/^data:image\/png;base64,/, "");

  return { gatewayTxId, pixCopiaCola, pixQrcodeBase64 };
}
