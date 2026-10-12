import { Suspense } from "react";
import { AppView } from "./AppView";
import {
  useWorkspaceController,
  type AppProps,
} from "./controller/useWorkspaceController";

export default function App(props: AppProps) {
  return (
    <Suspense fallback={null}>
      <Workspace {...props} />
    </Suspense>
  );
}

function Workspace(props: AppProps) {
  const vm = useWorkspaceController(props);
  return <AppView vm={vm} />;
}
