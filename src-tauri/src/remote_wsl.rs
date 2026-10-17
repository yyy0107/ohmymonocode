//! WSL is a Linux Host, never a Windows process pointed at a Linux path.
//! The desktop keeps one `wsl.exe` process per distribution. Its stdio is
//! relayed to the Host's private Unix socket by `wsl-bridge.mjs`, so neither
//! TCP forwarding nor the device credential is needed on the Windows side.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct WslTarget {
    pub distribution: String,
}

/// First setup copies the runtime from the Windows installation into WSL.
const SETUP_TIMEOUT: Duration = Duration::from_secs(300);
const INCOMPLETE: &str = "The host request did not complete. Retry to confirm its result.";

fn decode(bytes: &[u8]) -> String {
    if bytes.starts_with(&[0xff, 0xfe]) || bytes.iter().skip(1).step_by(2).any(|b| *b == 0) {
        String::from_utf16_lossy(
            &bytes
                .as_chunks::<2>()
                .0
                .iter()
                .map(|b| u16::from_le_bytes([b[0], b[1]]))
                .collect::<Vec<_>>(),
        )
        .trim_start_matches('\u{feff}')
        .to_string()
    } else {
        String::from_utf8_lossy(bytes)
            .trim_start_matches('\u{feff}')
            .to_string()
    }
}

fn wsl_command() -> Result<Command, String> {
    if !cfg!(windows) {
        return Err("WSL environments require Windows.".into());
    }
    let mut command = Command::new("wsl.exe");
    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    crate::hide_window_console(&mut command);
    Ok(command)
}

fn spawn(command: &mut Command) -> Result<Child, String> {
    command
        .spawn()
        .map_err(|_| "Could not start WSL. Install WSL and a Linux distribution first.".into())
}

/// Keeps the most recent output so a failed setup can report its last error.
fn capture(reader: impl Read + Send + 'static) -> Arc<Mutex<Vec<u8>>> {
    let tail = Arc::new(Mutex::new(Vec::new()));
    let sink = tail.clone();
    std::thread::spawn(move || {
        let mut reader = reader;
        let mut chunk = [0u8; 4096];
        while let Ok(read) = reader.read(&mut chunk) {
            if read == 0 {
                break;
            }
            if let Ok(mut tail) = sink.lock() {
                tail.extend_from_slice(&chunk[..read]);
                let excess = tail.len().saturating_sub(64 * 1024);
                tail.drain(..excess);
            }
        }
    });
    tail
}

#[tauri::command(async)]
pub fn wsl_distributions() -> Result<Vec<String>, String> {
    let mut child = spawn(wsl_command()?.args(["--list", "--quiet"]))?;
    let stdout = capture(child.stdout.take().unwrap());
    let stderr = capture(child.stderr.take().unwrap());
    drop(child.stdin.take());
    let deadline = Instant::now() + Duration::from_secs(20);
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if Instant::now() < deadline => std::thread::sleep(Duration::from_millis(50)),
            _ => {
                let _ = child.kill();
                let _ = child.wait();
                return Err("WSL did not respond. Check the WSL installation and retry.".into());
            }
        }
    };
    // Readers finish at EOF, shortly after the process exits.
    std::thread::sleep(Duration::from_millis(50));
    let output = decode(&stdout.lock().map(|b| b.clone()).unwrap_or_default());
    if !status.success() {
        let error = decode(&stderr.lock().map(|b| b.clone()).unwrap_or_default());
        return Err(if error.trim().is_empty() {
            output
        } else {
            error
        }
        .trim()
        .to_string());
    }
    Ok(output
        .lines()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
        .collect())
}

/// The versioned Linux runtime: bundled with Windows releases, or built by
/// `npm run host:wsl-runtime` for development.
fn runtime(app: &AppHandle) -> Result<PathBuf, String> {
    #[cfg(debug_assertions)]
    {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../build/wsl-host");
        if root.join("SHA256SUMS").is_file() {
            return Ok(root);
        }
    }
    let root = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("desktop-host")
        .join("wsl");
    if root.join("SHA256SUMS").is_file() {
        Ok(root)
    } else {
        Err("The WSL Host runtime is missing from this installation.".into())
    }
}

pub enum Reply {
    Response {
        status: u16,
        body: Value,
    },
    /// The bridge or Host was gone before the request was delivered.
    Unreachable,
    Failed(String),
}

fn reply(frame: &Value) -> Reply {
    if frame.get("unreachable").and_then(Value::as_bool) == Some(true) {
        return Reply::Unreachable;
    }
    if let Some(error) = frame.get("error").and_then(Value::as_str) {
        return Reply::Failed(if error == "incomplete" {
            INCOMPLETE.into()
        } else {
            error.into()
        });
    }
    match (
        frame.get("status").and_then(Value::as_u64),
        frame.get("body"),
    ) {
        (Some(status), Some(body)) => Reply::Response {
            status: status as u16,
            body: body.clone(),
        },
        _ => Reply::Failed("Invalid host response".into()),
    }
}

struct Bridge {
    child: Mutex<Child>,
    stdin: Mutex<ChildStdin>,
    pending: Arc<Mutex<HashMap<u64, mpsc::Sender<Reply>>>>,
    open: Arc<AtomicBool>,
    next: AtomicU64,
}

impl Bridge {
    fn start(runtime: &std::path::Path, distribution: &str) -> Result<Bridge, String> {
        let mut child = spawn(wsl_command()?.args([
            "--distribution",
            distribution,
            "--cd",
            "~",
            "--exec",
            "bash",
            "-lc",
            "exec bash -s -- \"$@\"",
            "monocode-wsl",
            &runtime.to_string_lossy(),
        ]))?;
        let stderr = capture(child.stderr.take().unwrap());
        let stdout = child.stdout.take().unwrap();
        let mut stdin = child.stdin.take().unwrap();
        let script = include_str!("wsl_bootstrap.sh").replace("\r\n", "\n");
        if let Err(error) = stdin.write_all(format!("{}\n", script.trim_end()).as_bytes()) {
            let _ = child.kill();
            let _ = child.wait();
            return Err(error.to_string());
        }
        let pending: Arc<Mutex<HashMap<u64, mpsc::Sender<Reply>>>> = Arc::default();
        let open = Arc::new(AtomicBool::new(true));
        let (ready_tx, ready_rx) = mpsc::channel::<()>();
        {
            let pending = pending.clone();
            let open = open.clone();
            std::thread::spawn(move || {
                let mut reader = BufReader::new(stdout);
                let mut line = Vec::new();
                let mut ready = Some(ready_tx);
                while reader
                    .read_until(b'\n', &mut line)
                    .is_ok_and(|read| read > 0)
                {
                    let frame: Option<Value> = serde_json::from_slice(&line).ok();
                    line.clear();
                    let Some(frame) = frame else { continue };
                    if ready.is_some() {
                        // Login profiles may print before the bridge starts.
                        if frame.get("ready").is_some() {
                            let _ = ready.take().unwrap().send(());
                        }
                        continue;
                    }
                    let Some(id) = frame.get("id").and_then(Value::as_u64) else {
                        continue;
                    };
                    if let Some(sender) = pending.lock().ok().and_then(|mut p| p.remove(&id)) {
                        let _ = sender.send(reply(&frame));
                    }
                }
                open.store(false, Ordering::SeqCst);
                // Requests still in flight may have run before the bridge ended.
                if let Ok(mut pending) = pending.lock() {
                    for (_, sender) in pending.drain() {
                        let _ = sender.send(Reply::Failed(INCOMPLETE.into()));
                    }
                }
            });
        }
        match ready_rx.recv_timeout(SETUP_TIMEOUT) {
            Ok(()) => Ok(Bridge {
                child: Mutex::new(child),
                stdin: Mutex::new(stdin),
                pending,
                open,
                next: AtomicU64::new(1),
            }),
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                if matches!(error, mpsc::RecvTimeoutError::Timeout) {
                    return Err("WSL setup timed out. Check the distribution and retry.".into());
                }
                std::thread::sleep(Duration::from_millis(50));
                let output = decode(&stderr.lock().map(|b| b.clone()).unwrap_or_default());
                Err(output
                    .lines()
                    .map(str::trim)
                    .rfind(|line| !line.is_empty())
                    .unwrap_or("Could not start the WSL Host.")
                    .to_string())
            }
        }
    }

    fn send(&self, request: &Value, timeout: Duration) -> Reply {
        if !self.open.load(Ordering::SeqCst) {
            return Reply::Unreachable;
        }
        let id = self.next.fetch_add(1, Ordering::SeqCst);
        let (sender, receiver) = mpsc::channel();
        match self.pending.lock() {
            Ok(mut pending) => pending.insert(id, sender),
            Err(_) => return Reply::Failed("WSL connection is unavailable".into()),
        };
        // The reader may have ended before this request was registered.
        if !self.open.load(Ordering::SeqCst) {
            self.forget(id);
            return Reply::Unreachable;
        }
        let line = format!("{}\n", json!({ "id": id, "request": request }));
        let written = self.stdin.lock().map_err(|_| ()).and_then(|mut stdin| {
            stdin
                .write_all(line.as_bytes())
                .and_then(|_| stdin.flush())
                .map_err(|_| ())
        });
        if written.is_err() {
            self.forget(id);
            self.open.store(false, Ordering::SeqCst);
            return Reply::Unreachable;
        }
        match receiver.recv_timeout(timeout) {
            Ok(reply) => reply,
            Err(_) => {
                self.forget(id);
                Reply::Failed(INCOMPLETE.into())
            }
        }
    }

    fn forget(&self, id: u64) {
        if let Ok(mut pending) = self.pending.lock() {
            pending.remove(&id);
        }
    }
}

impl Drop for Bridge {
    /// Ends only the bridge. The Host keeps running its sessions in WSL.
    fn drop(&mut self) {
        if let Ok(child) = self.child.get_mut() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

#[derive(Default)]
pub struct WslBridges {
    bridges: Mutex<HashMap<String, Arc<Bridge>>>,
    setup: Mutex<()>,
}

impl WslBridges {
    fn bridge(&self, app: &AppHandle, distribution: &str) -> Result<Arc<Bridge>, String> {
        let open = |bridges: &HashMap<String, Arc<Bridge>>| {
            bridges
                .get(distribution)
                .filter(|bridge| bridge.open.load(Ordering::SeqCst))
                .cloned()
        };
        if let Some(bridge) = open(&*self.bridges.lock().map_err(|_| "WSL is unavailable")?) {
            return Ok(bridge);
        }
        let _setup = self.setup.lock().map_err(|_| "WSL setup is unavailable")?;
        if let Some(bridge) = open(&*self.bridges.lock().map_err(|_| "WSL is unavailable")?) {
            return Ok(bridge);
        }
        if !wsl_distributions()?.iter().any(|name| name == distribution) {
            return Err("The selected WSL distribution is no longer installed.".into());
        }
        let bridge = Arc::new(Bridge::start(&runtime(app)?, distribution)?);
        self.bridges
            .lock()
            .map_err(|_| "WSL is unavailable")?
            .insert(distribution.into(), bridge.clone());
        Ok(bridge)
    }

    fn discard(&self, distribution: &str, bridge: &Arc<Bridge>) {
        if let Ok(mut bridges) = self.bridges.lock() {
            if bridges
                .get(distribution)
                .is_some_and(|b| Arc::ptr_eq(b, bridge))
            {
                bridges.remove(distribution);
            }
        }
    }

    /// Sends one RPC body. An undelivered request restarts setup (which also
    /// restarts a stopped Host) and is retried once.
    pub fn request(
        &self,
        app: &AppHandle,
        distribution: &str,
        request: &Value,
        timeout: Duration,
    ) -> Result<(u16, Value), String> {
        for attempt in 0..2 {
            let bridge = self.bridge(app, distribution)?;
            match bridge.send(request, timeout) {
                Reply::Response { status, body } => return Ok((status, body)),
                Reply::Failed(error) => return Err(error),
                Reply::Unreachable => {
                    self.discard(distribution, &bridge);
                    if attempt == 1 {
                        break;
                    }
                }
            }
        }
        Err("The WSL Host is unreachable. Check the distribution and retry.".into())
    }

    pub fn close(&self, distribution: &str) {
        if let Ok(mut bridges) = self.bridges.lock() {
            bridges.remove(distribution);
        }
    }

    pub fn shutdown(&self) {
        if let Ok(mut bridges) = self.bridges.lock() {
            bridges.clear();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn reads_utf16_wsl_names_and_utf8_linux_output() {
        let names = "Ubuntu-26.04\r\n开发环境\r\n";
        let utf16: Vec<u8> = names.encode_utf16().flat_map(u16::to_le_bytes).collect();
        assert_eq!(decode(&utf16), names);
        assert_eq!(decode("Linux ✓".as_bytes()), "Linux ✓");
    }

    #[test]
    fn bridge_frames_distinguish_undelivered_and_incomplete_requests() {
        assert!(matches!(
            reply(&json!({ "id": 1, "unreachable": true })),
            Reply::Unreachable
        ));
        assert!(
            matches!(reply(&json!({ "id": 1, "error": "incomplete" })), Reply::Failed(e) if e == INCOMPLETE)
        );
        assert!(matches!(
            reply(&json!({ "id": 1, "status": 401, "body": { "error": "revoked" } })),
            Reply::Response { status: 401, .. }
        ));
        assert!(matches!(reply(&json!({ "id": 1 })), Reply::Failed(_)));
    }

    #[test]
    fn bootstrap_ends_with_the_bridge_exec() {
        // Bash reads the script from the same stdin the bridge then owns, so
        // nothing may follow the final exec.
        let script = include_str!("wsl_bootstrap.sh").replace("\r\n", "\n");
        let last = script.trim_end().lines().last().unwrap();
        assert!(last.starts_with("exec \"$RUNTIME/bin/node\" \"$RUNTIME/wsl-bridge.mjs\" bridge"));
    }
}
