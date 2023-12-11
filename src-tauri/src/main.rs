// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Window;
use tauri::Manager;
use std::fs;
extern crate nfc;
use nfc::context;

pub mod models;
pub mod errors;

use std::env;
use reqwest::Client;
use std::net::{
	TcpListener, 
	SocketAddr
};
use std::sync::Arc;
use tokio::sync::Mutex;
use axum::{
	Router,
	Extension,
	response::IntoResponse,
	routing::get,
	extract::Query
};
use oauth2::{
	PkceCodeChallenge, 
	CsrfToken, 
	RedirectUrl,
	PkceCodeVerifier,
	ClientId,
	AuthUrl,
	TokenUrl,
	reqwest::async_http_client,
	basic::BasicClient,
	TokenResponse,
	Scope,
};

#[tauri::command(async)]
fn find_nfc_device() -> models::APIResult<String> {
	let mut context = context::new();
	let mut connstrings: [i8; 1024] = [0; 1024];

	if context.is_null() {
        println!("Unable to initialize new NFC context!");
		let res = Err(errors::TauriError {
			detail: "No device found"
		});
		return res;
    }

	nfc::init(&mut context);
	nfc::list_devices(context, &mut connstrings, 1024);

	if connstrings[0] == 0 {
        println!("Unable to open new NFC device!");
		let res = Err(errors::TauriError {
			detail: "No device found"
		});
		return res;
	}

	println!("Device found");
	let res = String::from_utf8(connstrings.iter().map(|&c| c as u8).collect()).unwrap();
	return Ok(String::from(res));
}

/// Get the hex code and returns a string
/// # Arguments
/// - `string`: hex code.
pub fn hex_code_from_string(string: [u8; 10]) -> String {
	let mut card_id = String::from("");

	for a in string {
		if a != 0 {
			card_id.push_str(&format!("{:02X}", a));
		}
	}
	return card_id;
}

async fn scanner_loop(window: Window, abort_signal: Arc<std::sync::atomic::AtomicBool>)
{
	let mut string: [u8; 10];
    let mut context = context::new();
	let modulation = nfc::ffi::nfc_modulation {
		nmt: nfc::ffi::nfc_modulation_type::NMT_ISO14443A,
		nbr: nfc::ffi::nfc_baud_rate::NBR_106
	};
	
	let mut target = nfc::ffi::nfc_target {
		nti: nfc::ffi::nfc_target_info {
			_bindgen_data_: [0; 283]
		},
		nm:	modulation
	};
	let mut connstrings: [i8; 1024] = [0; 1024];

    if context.is_null() {
        println!("Unable to initialize new NFC context!");
		window.emit("card-init-scan", models::Payload { message: "error_context".to_string()}).unwrap();
		return;
    }

	nfc::init(&mut context);
	nfc::list_devices(context, &mut connstrings, 1024);
	let device = nfc::open(context,  &connstrings);

	if device.is_null() {
        nfc::exit(context);
		window.emit("card-init-scan", models::Payload { message: "error_device".to_string()}).unwrap();
		return;
    }
	
	let boxed_device: Box<*mut nfc::ffi::nfc_device> = Box::new(device);

	if nfc::initiator::init(boxed_device) < 0 {
    	println!("{}", nfc::error::strerror(device));
        nfc::close(device);
        nfc::exit(context);
		window.emit("card-init-scan", models::Payload { message: "error_device".to_string()}).unwrap();
		return;
    }

	while !abort_signal.load(std::sync::atomic::Ordering::SeqCst) {
		if nfc::error::device_get_last_error(device) != 0 {
			window.emit("card-scan", models::Payload { message: "error_scan".to_string()}).unwrap();
			return;
		}
		if nfc::initiator::poll_target(device, &modulation, 1, 1, 5, &mut target) > 0 {	
			string = unsafe { (*target.nti.nai()).abtUid };
			let card_id = hex_code_from_string(string);
			window.emit("card-scan", models::Payload { message: card_id}).unwrap();
			std::thread::sleep(std::time::Duration::from_millis(1500));
		}
	}
}

#[tauri::command(async)]
async fn start_scan(handle: tauri::AppHandle, window: Window) -> models::APIResult<String> {
	let scan = handle.state::<models::ScannerState>();
	let task_handle = Arc::clone(&scan.handle);
	let signal = scan.signal.clone();
	signal.store(false, std::sync::atomic::Ordering::SeqCst);
	let task = tauri::async_runtime::spawn(async move {
		println!("start scan");
		let _result = scanner_loop(window, signal).await;
	});
	
	*task_handle.lock().await = Some(task);
    Ok("Scanner successfully started".to_string())
}

#[tauri::command(async)]
async fn stop_scan(handle: tauri::AppHandle) -> models::APIResult<String> {
	let scan = handle.state::<models::ScannerState>();
	match scan.handle.lock().await.take() {
		Some(h) => {
			println!("abort");
			h.abort();
			scan.signal.store(true, std::sync::atomic::Ordering::SeqCst);
		}
		None => {println!("none")}
	};
	println!("stop scan");
    Ok("Scanner successfully stopped".to_string())
}

/// Get all sessions names, ids and datetime.
/// # Arguments
/// - `handle`: AppHandle containing application state.
#[tauri::command]
async fn get_api_sessions(handle: tauri::AppHandle) -> models::APIResult<Vec<models::Session>> {
	let auth = handle.state::<models::AuthState>();
	let token = auth.token.lock().await;
	let bearer = "Bearer ".to_string() + &token.to_string();
	let resp = Client::new()
		.get(format!("{}/api/sessions", auth.back_addr))
		.header("Authorization".to_string(), bearer)
		.send()
		.await?
		.json::<models::Sessions>()
		.await?
		.result;

	Ok(resp)
}

/// Get a single session informations and students.
/// # Arguments
/// - `handle`: AppHandle containing application state.
/// - `session_id`: Id of the session to retrieve.
#[tauri::command]
async fn get_api_session(handle: tauri::AppHandle, session_id: String) -> models::APIResult<models::SessionResponse> {
	let auth = handle.state::<models::AuthState>();
	let token = auth.token.lock().await;
	let bearer = "Bearer ".to_string() + &token.to_string();

	let json_string = Client::new()
		.get(format!("{}/api/session/", auth.back_addr).to_owned() + session_id.as_str())
		.header("Authorization".to_string(), bearer)
		.send()
		.await?
		.text()
		.await?;

	let json: Result<models::SessionResponse, serde_json::Error> = serde_json::from_str(json_string.as_str());

	match json {
		Ok(value) => {
			Ok(value)
		},
		Err(_error) => {
			Err(errors::TauriError {
				detail: "Error with the request serialization"
			})
		},	 
	}
}

/// Save clikodrome session, this function save the attendance list for the current session.
/// # Arguments
/// - `handle`: AppHandle containing application state.
/// - `students`: List of students to modify.
/// - `session_id`: Id of the session to save.
#[tauri::command]
async fn put_api_session(handle: tauri::AppHandle, students: Vec<models::Student>, session_id: String) -> models::APIResult<models::ModifySessionResponse> {
	let auth = handle.state::<models::AuthState>();
	let token = auth.token.lock().await;
	let bearer = "Bearer ".to_string() + &token.to_string();
	let body = models::ModifySessionBody {
		data: students
	};
	let json_string = Client::new()
		.put(format!("{}/api/session/", auth.back_addr).to_owned() + session_id.as_str())
		.header("Authorization".to_string(), bearer)
		.json(&body)
		.send()
		.await?
		.text()
		.await?;

	let json: Result<models::ModifySessionResponse, serde_json::Error> = serde_json::from_str(json_string.as_str());

	match json {
		Ok(_value) => {
			Ok(_value)
		},
		Err(_error) => {
			Err(errors::TauriError {
				detail: "Error with the request serialization"
			})
		},	 
	}
}

/// Authenticate the user by initializing microsoft oauth2 flow.
/// # Arguments
/// - `handle`: AppHandle containing application state.
#[tauri::command]
async fn authenticate(handle: tauri::AppHandle) -> Result<String, errors::TauriError>{
	let hand = handle.clone();
	let auth = hand.state::<models::AuthState>();
    let (auth_url, _) = auth
        .client
        .authorize_url(|| auth.csrf_token.clone())
        .add_scope(Scope::new("openid".to_string()))
        .add_scope(Scope::new("email".to_string()))
        .add_scope(Scope::new(format!("api://{}/Attendance.Read", env!("client_id"))))
        .set_pkce_challenge(auth.pkce.0.clone())
        .url();

	let (tx, rx) =  tokio::sync::mpsc::channel(1000);

	let signal = models::Signal {
		rx: Arc::new(Mutex::new(rx)),
		tx: tx,
	};

	let sig = signal.clone();

	let _server_handle = tauri::async_runtime::spawn(async move { 
		let _ = run_server(handle, signal).await;
	});
	
	open::that(auth_url.to_string()).unwrap();
	
	let _ = sig.rx.lock().await.recv().await;
	let _ = sig.tx.send("2".to_string()).await;

	let token = auth.token.lock().await;

	if *token == "" {
		let error = errors::TauriError {
			detail: "Token does not exist, something went wrong with the login."
		};
		return Err(error);
	}
	
	Ok(token.clone())
}

async fn read_file_content(file_path: String) -> String {
	let contents = fs::read_to_string(file_path)
		.expect("file missing in the source tree");
	return contents;
}

/// Authorize the user when microsoft redirects him on the local server.
/// The function will ask the token from microsoft by exchanging a code provided by the redirection.
/// Returns anything that implements IntoResponse (in this case `axum::response::Html`).
/// # Arguments
/// - `handle`: AppHandle containing application state.
/// - `signal`: Signal structure to receive the stop signal from the tauri command.
/// - `query`: Query of the user redirected to the local server.
async fn authorize(handle: Extension<tauri::AppHandle>, signal: Extension<tokio::sync::mpsc::Sender<String>>, query: Query<models::CallbackQuery>) -> impl IntoResponse {
    let auth = handle.state::<models::AuthState>();
	let code = query.code.clone();
	let template_ok = handle
		.path_resolver()
		.resolve_resource("../template/authorized.html")
		.expect("error loading file");
	let template_err = handle
		.path_resolver()
		.resolve_resource("../template/error.html")
		.expect("error loading file");
	if query.state.secret() != auth.csrf_token.secret() {
        println!("Suspected Man in the Middle attack!");
		let res = axum::response::Html(read_file_content(template_ok.to_str().unwrap().to_string()).await);
		return res;
    }
	
    let token = auth
        .client
        .exchange_code(code)
        .set_pkce_verifier(PkceCodeVerifier::new(auth.pkce.1.clone()))
        .request_async(async_http_client)
        .await;

	let token = match token {
		Ok(e) => {e.access_token().secret().to_string()},
		Err(_e) => {_e.to_string()}
	};
	
	if token == "" {
		let res = axum::response::Html(read_file_content(template_err.to_str().unwrap().to_string()).await);
		return res;
	}
	let mut state_token = auth.token.lock().await;
	*state_token = token;

	let _ = signal.0.send("1".to_string()).await;	
	
	let res = axum::response::Html(read_file_content(template_ok.to_str().unwrap().to_string()).await);
	return res;
}

/// Create and run a local server to catch the microsoft redirection.
/// > **_NOTE:_** This server will be stopped by a signal sent when the user get a token.
/// # Arguments
/// - `handle`: AppHandle containing application state.
/// - `signal`: Signal structure to receive the stop signal from the tauri command.
async fn run_server(handle: tauri::AppHandle, signal: models::Signal) -> Result<(), axum::Error> {
	let models::Signal {rx, tx} = signal;

    let app = Router::new()
        .route("/auth", get(authorize))
        .layer(Extension(handle.clone()))
		.layer(Extension(tx));

    let _ = axum::Server::bind(&handle.state::<models::AuthState>().socket_addr.clone())
        .serve(app.into_make_service())
		.with_graceful_shutdown(async {
			let _ = rx.lock().await.recv().await;
		}).await;

    Ok(())
}

/// Returns a oauth2 BasicClient configured with all configuration URI.
/// # Arguments
/// - `redirect_url` : local url to which microsoft will redirect.
fn create_client(redirect_url: RedirectUrl) -> BasicClient {
	let cli_id = env!("client_id").to_string();
	let tenant_id = env!("tenant_id").to_string();
	
	let client_id = ClientId::new(cli_id);
    let auth_url = AuthUrl::new(format!("https://login.microsoftonline.com/{}/oauth2/v2.0/authorize", tenant_id));
    let token_url = TokenUrl::new(format!("https://login.microsoftonline.com/{}/oauth2/v2.0/token", tenant_id));
    BasicClient::new(client_id, None, auth_url.unwrap(), token_url.ok())
        .set_redirect_uri(redirect_url)
}

fn get_available_addr() -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let addr = listener.local_addr().unwrap();
    drop(listener);

    addr
}

fn main() {
	let addr = env!("back_url").to_string();
	let (pkce_code_challenge,pkce_code_verifier) = PkceCodeChallenge::new_random_sha256();
    let socket_addr = get_available_addr();
	let redirect_url = format!("http://{socket_addr}/auth").to_string();
    let state = models::AuthState {
        csrf_token: CsrfToken::new_random(),
        pkce: Arc::new((pkce_code_challenge, PkceCodeVerifier::secret(&pkce_code_verifier).to_string())),
        client: Arc::new(create_client(RedirectUrl::new(redirect_url).unwrap())),
        socket_addr,
		token: Arc::new(Mutex::new("".to_string())),
		back_addr: addr,
    };

	let scanner_state = models::ScannerState {
		handle: Arc::new(Mutex::new(None)),
		signal: Arc::new(std::sync::atomic::AtomicBool::new(false))
	};

    tauri::Builder::default()
		.manage(state)
		.manage(scanner_state)
        .invoke_handler(tauri::generate_handler![
			// scan,
			start_scan,
			stop_scan,
			find_nfc_device,
			get_api_sessions,
			get_api_session,
			put_api_session,
			authenticate
		])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}