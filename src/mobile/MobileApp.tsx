import { MobileAppView } from "./app/MobileAppView";
import { useMobileAppController } from "./app/useMobileAppController";

export function MobileApp() {
  const vm = useMobileAppController();
  return <MobileAppView vm={vm} />;
}
