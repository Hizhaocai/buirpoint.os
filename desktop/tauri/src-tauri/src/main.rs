#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};
use std::{
    net::{TcpStream, ToSocketAddrs},
    process::Command,
    sync::mpsc,
    thread,
    time::Duration,
};
use tauri::{
    utils::config::WebviewUrl,
    webview::{DownloadEvent, NewWindowResponse, WebviewWindowBuilder},
    Manager, Url,
};
use tauri_plugin_notification::NotificationExt;

const APP_HOST: &str = "os.buirpoint.top";
const APP_URL: &str = "https://os.buirpoint.top";
const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
static SUMMARY_REQUEST_IN_FLIGHT: AtomicBool = AtomicBool::new(false);
static SUMMARY_RESOLVED: AtomicBool = AtomicBool::new(false);
static TOMORROW_NOTIFICATION_SENT: AtomicBool = AtomicBool::new(false);

const TOMORROW_SUMMARY_SCRIPT: &str = r#"
(() => {
  if (window.__BUIR_TOMORROW_SUMMARY_STARTED__) return;
  window.__BUIR_TOMORROW_SUMMARY_STARTED__ = true;

  const report = (state, shootCount) => {
    const result = new URL("buir-summary://result");
    result.searchParams.set("state", state);
    if (Number.isInteger(shootCount)) result.searchParams.set("shootCount", String(shootCount));
    window.location.href = result.toString();
  };

  const timeout = window.setTimeout(() => report("error"), 8000);
  fetch("/api/desktop/tomorrow-summary", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      window.clearTimeout(timeout);
      if (response.status === 401 || response.status === 403) {
        report("unauthorized");
        return;
      }
      if (!response.ok) {
        report("error");
        return;
      }

      const payload = await response.json();
      if (!Number.isInteger(payload.shootCount) || payload.shootCount < 0) {
        report("error");
        return;
      }
      report("success", payload.shootCount);
    })
    .catch(() => {
      window.clearTimeout(timeout);
      report("error");
    });
})();
"#;

const CONNECTION_ERROR_HTML: &str = r#"<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BUIR Studio OS</title>
  <style>
    :root { color-scheme: dark; font-family: "Segoe UI", "Microsoft YaHei", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #101112; color: #f5f5f2; }
    main { width: min(520px, calc(100vw - 48px)); padding: 48px; border: 1px solid #303236; background: #181a1d; }
    p { margin: 0; color: #9ea2a8; font-size: 13px; letter-spacing: .12em; text-transform: uppercase; }
    h1 { margin: 16px 0 12px; font-size: clamp(28px, 5vw, 42px); line-height: 1.1; }
    .message { margin: 0 0 28px; color: #c7c9cc; font-size: 16px; line-height: 1.7; }
    a { display: inline-block; padding: 11px 18px; border: 1px solid #f5f5f2; color: #f5f5f2; text-decoration: none; }
    a:focus-visible { outline: 2px solid #ffffff; outline-offset: 4px; }
  </style>
</head>
<body>
  <main>
    <p>BUIR Studio OS</p>
    <h1>应用无法连接服务器。</h1>
    <div class="message">无法连接服务，请检查网络。</div>
    <a href="https://os.buirpoint.top">重新连接</a>
  </main>
</body>
</html>"#;

fn production_site_reachable() -> bool {
    let (sender, receiver) = mpsc::channel();

    thread::spawn(move || {
        let reachable = (APP_HOST, 443)
            .to_socket_addrs()
            .map(|addresses| {
                addresses.take(2).any(|address| {
                    TcpStream::connect_timeout(&address, Duration::from_secs(2)).is_ok()
                })
            })
            .unwrap_or(false);

        let _ = sender.send(reachable);
    });

    receiver.recv_timeout(CONNECT_TIMEOUT).unwrap_or(false)
}

fn initial_url() -> WebviewUrl {
    if production_site_reachable() {
        WebviewUrl::External(APP_URL.parse().expect("production URL must be valid"))
    } else {
        WebviewUrl::CustomProtocol(
            "buir-error://localhost/connection"
                .parse()
                .expect("fallback URL must be valid"),
        )
    }
}

fn is_internal_url(url: &Url) -> bool {
    url.scheme() == "https" && url.host_str() == Some(APP_HOST)
}

fn is_external_url(url: &Url) -> bool {
    matches!(url.scheme(), "http" | "https")
        && !is_internal_url(url)
        && !is_connection_error_url(url)
}

fn is_connection_error_url(url: &Url) -> bool {
    url.scheme() == "buir-error" || url.host_str() == Some("buir-error.localhost")
}

fn open_external_url(url: &Url) {
    if !is_external_url(url) {
        return;
    }

    #[cfg(target_os = "windows")]
    let result = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;

        Command::new("rundll32.exe")
            .args(["url.dll,FileProtocolHandler", url.as_str()])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
    };

    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(url.as_str()).spawn();

    #[cfg(all(unix, not(target_os = "macos")))]
    let result = Command::new("xdg-open").arg(url.as_str()).spawn();

    if let Err(error) = result {
        eprintln!("failed to open external URL: {error}");
    }
}

fn send_tomorrow_notification(app: &tauri::AppHandle, shoot_count: u32) {
    let notification = app.notification();
    let permission = match notification.permission_state() {
        Ok(tauri::plugin::PermissionState::Granted) => tauri::plugin::PermissionState::Granted,
        Ok(tauri::plugin::PermissionState::Prompt)
        | Ok(tauri::plugin::PermissionState::PromptWithRationale) => {
            match notification.request_permission() {
                Ok(permission) => permission,
                Err(error) => {
                    eprintln!("notification permission request failed: {error}");
                    return;
                }
            }
        }
        Ok(tauri::plugin::PermissionState::Denied) => {
            eprintln!("notification permission denied");
            return;
        }
        Err(error) => {
            eprintln!("notification permission check failed: {error}");
            return;
        }
    };

    eprintln!("notification permission state: {permission}");

    if permission == tauri::plugin::PermissionState::Granted {
        if let Err(error) = notification
            .builder()
            .title("BUIR Studio OS")
            .body(tomorrow_notification_body(shoot_count))
            .show()
        {
            eprintln!("tomorrow shoot notification failed: {error}");
        }
    }
}

fn tomorrow_notification_body(shoot_count: u32) -> String {
    format!("明日有 {shoot_count} 场拍摄")
}

#[derive(Debug, PartialEq, Eq)]
enum SummaryResult {
    Success(u32),
    Unauthorized,
    Failure,
}

fn is_summary_result_url(url: &Url) -> bool {
    url.scheme() == "buir-summary" && url.host_str() == Some("result")
}

fn parse_summary_result(url: &Url) -> SummaryResult {
    let mut state = None;
    let mut shoot_count = None;

    for (key, value) in url.query_pairs() {
        match key.as_ref() {
            "state" => state = Some(value.into_owned()),
            "shootCount" => shoot_count = value.parse::<u32>().ok(),
            _ => {}
        }
    }

    match state.as_deref() {
        Some("success") => shoot_count
            .map(SummaryResult::Success)
            .unwrap_or(SummaryResult::Failure),
        Some("unauthorized") => SummaryResult::Unauthorized,
        _ => SummaryResult::Failure,
    }
}

fn handle_summary_result(app: &tauri::AppHandle, result: SummaryResult) {
    if !SUMMARY_REQUEST_IN_FLIGHT.swap(false, Ordering::SeqCst) {
        eprintln!("ignored unexpected tomorrow summary result");
        return;
    }

    match result {
        SummaryResult::Success(shoot_count) => {
            SUMMARY_RESOLVED.store(true, Ordering::SeqCst);
            if shoot_count > 0 && !TOMORROW_NOTIFICATION_SENT.swap(true, Ordering::SeqCst) {
                send_tomorrow_notification(app, shoot_count);
            }
        }
        SummaryResult::Unauthorized => {
            eprintln!("tomorrow summary skipped: user is not authenticated or authorized");
        }
        SummaryResult::Failure => {
            eprintln!("tomorrow summary request failed");
        }
    }
}

fn request_tomorrow_summary(window: &tauri::WebviewWindow) {
    if SUMMARY_RESOLVED.load(Ordering::SeqCst)
        || SUMMARY_REQUEST_IN_FLIGHT
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
    {
        return;
    }

    if let Err(error) = window.eval(TOMORROW_SUMMARY_SCRIPT) {
        SUMMARY_REQUEST_IN_FLIGHT.store(false, Ordering::SeqCst);
        eprintln!("failed to start tomorrow summary request: {error}");
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .register_uri_scheme_protocol("buir-error", |_context, _request| {
            tauri::http::Response::builder()
                .header(
                    tauri::http::header::CONTENT_TYPE,
                    "text/html; charset=utf-8",
                )
                .header(tauri::http::header::CACHE_CONTROL, "no-store")
                .body(CONNECTION_ERROR_HTML.as_bytes().to_vec())
                .expect("connection error response must be valid")
        })
        .setup(|app| {
            let mut window_config = app
                .config()
                .app
                .windows
                .first()
                .cloned()
                .ok_or("main window configuration is missing")?;
            window_config.url = initial_url();

            let navigation_app_handle = app.handle().clone();
            let new_window_app_handle = app.handle().clone();

            WebviewWindowBuilder::from_config(app.handle(), &window_config)?
                .on_navigation(move |url| {
                    if is_summary_result_url(url) {
                        handle_summary_result(&navigation_app_handle, parse_summary_result(url));
                        false
                    } else if is_external_url(url) {
                        open_external_url(url);
                        false
                    } else {
                        is_internal_url(url) || is_connection_error_url(url)
                    }
                })
                .on_new_window(move |url, _features| {
                    if is_internal_url(&url) {
                        if let Some(window) = new_window_app_handle.get_webview_window("main") {
                            let _ = window.navigate(url);
                        }
                    } else {
                        open_external_url(&url);
                    }

                    NewWindowResponse::Deny
                })
                .on_download(|_webview, event| match event {
                    DownloadEvent::Requested { url, .. } if is_external_url(&url) => {
                        open_external_url(&url);
                        false
                    }
                    _ => true,
                })
                .on_page_load(|window, payload| {
                    if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished)
                        && is_internal_url(payload.url())
                    {
                        request_tomorrow_summary(&window);
                    }
                })
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running BUIR Studio OS");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_success_summary() {
        let url = Url::parse("buir-summary://result?state=success&shootCount=2").unwrap();
        assert_eq!(parse_summary_result(&url), SummaryResult::Success(2));
    }

    #[test]
    fn rejects_invalid_success_summary() {
        let url = Url::parse("buir-summary://result?state=success&shootCount=private").unwrap();
        assert_eq!(parse_summary_result(&url), SummaryResult::Failure);
    }

    #[test]
    fn parses_unauthorized_summary() {
        let url = Url::parse("buir-summary://result?state=unauthorized").unwrap();
        assert_eq!(parse_summary_result(&url), SummaryResult::Unauthorized);
    }

    #[test]
    fn notification_contains_only_count_summary() {
        assert_eq!(tomorrow_notification_body(1), "明日有 1 场拍摄");
        assert_eq!(tomorrow_notification_body(3), "明日有 3 场拍摄");
    }
}
