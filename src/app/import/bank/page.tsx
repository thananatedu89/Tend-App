import { Suspense } from "react";
import { BankImportClient } from "./BankImportClient";

export default function BankImportPage() {
  return (
    <Suspense>
      <BankImportClient />
    </Suspense>
  );
}
