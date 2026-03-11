export function formatError(e: any): string {
  const msg: string = e?.shortMessage || e?.reason || e?.message || "Unknown error";

  // Extract the human-readable part before technical details
  if (msg.includes("user rejected") || msg.includes("User denied")) {
    return "Transaction rejected by user";
  }
  if (msg.includes("insufficient funds")) {
    return "Insufficient funds for transaction";
  }
  if (msg.includes("nonce")) {
    return "Transaction nonce error — try resetting MetaMask activity";
  }

  // Trim long messages: take first sentence or first 120 chars
  const firstSentence = msg.split(/[.(]/)[0].trim();
  if (firstSentence.length > 10 && firstSentence.length < 150) {
    return firstSentence;
  }
  return msg.length > 120 ? msg.slice(0, 120) + "..." : msg;
}
