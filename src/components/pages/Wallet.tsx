import { CatalogPage } from "./CatalogPage";
import { VanityPage } from "./Vanity";

/** Wallet tools + vanity grind in one place. */
export function WalletPage() {
  return (
    <div className="space-y-6">
      <CatalogPage page="wallet" />
      <VanityPage />
    </div>
  );
}
