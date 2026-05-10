/**
 * Seed minimal — l'app de suivi de performances ne nécessite aucune donnée initiale.
 */
async function main(): Promise<void> {
  console.log("[seed] Aucune donnée à insérer (suivi marketing simple).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
