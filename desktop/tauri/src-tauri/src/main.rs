#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(debug_assertions)]
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
#[cfg(debug_assertions)]
use tauri_plugin_notification::NotificationExt;

const APP_HOST: &str = "os.buirpoint.top";
const APP_URL: &str = "https://os.buirpoint.top";
const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
#[cfg(debug_assertions)]
static NOTIFICATION_TEST_SENT: AtomicBool = AtomicBool::new(false);

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

#[cfg(debug_assertions)]
fn notification_test_on_minimize() -> bool {
    std::env::var("BUIR_NOTIFICATION_TEST_TRIGGER").as_deref() == Ok("minimize")
}

#[cfg(debug_assertions)]
fn send_notification_test(app: &tauri::AppHandle) {
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
            .body("桌面通知功能已启用")
            .show()
        {
            eprintln!("notification test failed: {error}");
        }
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

            let app_handle = app.handle().clone();

            WebviewWindowBuilder::from_config(app.handle(), &window_config)?
                .on_navigation(|url| {
                    if is_external_url(url) {
                        open_external_url(url);
                        false
                    } else {
                        is_internal_url(url) || is_connection_error_url(url)
                    }
                })
                .on_new_window(move |url, _features| {
                    if is_internal_url(&url) {
                        if let Some(window) = app_handle.get_webview_window("main") {
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
                    #[cfg(debug_assertions)]
                    if !notification_test_on_minimize()
                        && matches!(payload.event(), tauri::webview::PageLoadEvent::Finished)
                        && !NOTIFICATION_TEST_SENT.swap(true, Ordering::SeqCst)
                    {
                        send_notification_test(window.app_handle());
                    }
                })
                .build()?;

            Ok(())
        })
        .on_window_event(|window, event| {
            #[cfg(debug_assertions)]
            if notification_test_on_minimize()
                && matches!(event, tauri::WindowEvent::Resized(_))
                && window.is_minimized().unwrap_or(false)
                && !NOTIFICATION_TEST_SENT.swap(true, Ordering::SeqCst)
            {
                send_notification_test(window.app_handle());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running BUIR Studio OS");
}
