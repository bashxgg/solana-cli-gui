import { CatalogPage } from "./CatalogPage";
import { KeyConvertPage } from "./KeyConvert";
import { VanityPage } from "./Vanity";

/** Wallet tools + key convert + vanity grind. */
export function WalletPage() {
  return (
    <div className="space-y-6">
      <CatalogPage page="wallet" />
      <KeyConvertPage />
      <VanityPage />
    </div>
  );
}
