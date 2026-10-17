import { useEffect, useState } from "react";
import { COMPOSER_RUNNER_CHANGE_EVENT, loadComposerRunner } from "../../settings/model/settings";

/** Whether the runner strip is enabled and still showing for the current turn. */
export function useComposerRunner(busy: boolean) {
  const [runnerEnabled, setRunnerEnabled] = useState(loadComposerRunner);
  const [runnerLive, setRunnerLive] = useState(
    () => busy && loadComposerRunner(),
  );
  useEffect(() => {
    const refresh = () => setRunnerEnabled(loadComposerRunner());
    window.addEventListener(COMPOSER_RUNNER_CHANGE_EVENT, refresh);
    return () =>
      window.removeEventListener(COMPOSER_RUNNER_CHANGE_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!runnerEnabled) {
      setRunnerLive(false);
      return;
    }
    if (busy) setRunnerLive(true);
  }, [busy, runnerEnabled]);

  return { runnerEnabled, runnerLive, setRunnerLive };
}
