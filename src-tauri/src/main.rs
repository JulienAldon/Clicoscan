// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

extern crate nfc;
use nfc::context;

pub mod models;
pub mod errors;

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
fn find_nfc_device() -> String {
	let mut context = context::new();
	let mut connstrings: [i8; 1024] = [0; 1024];

	if context.is_null() {
        println!("Unable to initialize new NFC context!");
		return String::from("No device found");
    }

	nfc::init(&mut context);
	nfc::list_devices(context, &mut connstrings, 1024);

	if connstrings[0] == 0 {
        println!("Unable to open new NFC device!");
		return String::from("No device found");
    }

	println!("Device found");
	return String::from("Device found");
}

#[tauri::command(async)]
fn scan() -> String {
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
    }
	println!("Init libnfc...");
	println!("List devices...");
	println!("Open device");

	nfc::init(&mut context);
	nfc::list_devices(context, &mut connstrings, 1024);
	let device = nfc::open(context,  &connstrings);

	if device.is_null() {
        print!("Unable to open new NFC device!");
        nfc::exit(context);
    }
	
	println!("Init device");
	let boxed_device: Box<*mut nfc::ffi::nfc_device> = Box::new(device);

	if nfc::initiator::init(boxed_device) < 0 {
    	println!("{}", nfc::error::strerror(device));
        nfc::close(device);
        nfc::exit(context);
    }

	nfc::initiator::poll_target(device, &modulation, 1, 20, 2, &mut target);
	println!("{}", nfc::error::strerror(device));
	
	let string: [u8; 10] = unsafe { (*target.nti.nai()).abtUid };
	let card_id = hex_code_from_string(string);

	nfc::close(device);
	nfc::exit(context);
	
	return card_id;
}

fn hex_code_from_string(string: [u8; 10]) -> String {
	let mut card_id = String::from("");

	for a in string {
		if a != 0 {
			card_id.push_str(&format!("{:02X}", a));
		}
	}
	return card_id;
}

#[tauri::command]
async fn get_api_sessions() -> models::APIResult<Vec<models::Session>> {
	let resp = Client::new()
		.get("http://localhost:8000/api/sessions")
		.header("Authorization".to_string(), "".to_string())
		.send()
		.await?
		.json::<models::Sessions>()
		.await?
		.result;
	Ok(resp)
}

#[tauri::command]
async fn authenticate(handle: tauri::AppHandle) {
	let hand = handle.clone();
	let auth = hand.state::<models::AuthState>();
    let (auth_url, _) = auth
        .client
        .authorize_url(|| auth.csrf_token.clone())
        .add_scope(Scope::new("openid".to_string()))
        .add_scope(Scope::new("email".to_string()))
        .set_pkce_challenge(auth.pkce.0.clone())
        .url();

	println!("{}", "Authenticate function".to_string());

	let (tx, rx) =  tokio::sync::mpsc::channel(1000);

	println!("{}", "Created Channels".to_string());

	let signal = models::Signal {
		rx: Arc::new(Mutex::new(rx)),
		tx: tx,
	};

	let server_handle = tauri::async_runtime::spawn(async move { 
		println!("{}", "Run server".to_string());
		let _ = run_server(handle, signal).await;
	});
	
	open::that(auth_url.to_string()).unwrap();
}

async fn authorize(handle: Extension<tauri::AppHandle>, signal: Extension<tokio::sync::mpsc::Sender<String>>, query: Query<models::CallbackQuery>) -> impl IntoResponse {
    let auth = handle.state::<models::AuthState>();

	if query.state.secret() != auth.csrf_token.secret() {
        println!("Suspected Man in the Middle attack!");
        return "authorized".to_string();
    }

    let token = auth
        .client
        .exchange_code(query.code.clone())
        .set_pkce_verifier(PkceCodeVerifier::new(auth.pkce.1.clone()))
        .request_async(async_http_client)
        .await
		.unwrap();
	
	println!("Token is there");

	let mut state_token = auth.token.lock().await;
	*state_token = token.access_token().secret().to_string();

	println!("token : {state_token}");

	let _ = signal.0.send("1".to_string()).await;	

	return "authorized".to_string();
}

async fn run_server(handle: tauri::AppHandle, signal: models::Signal) -> Result<(), axum::Error> {

	println!("{}", "inside run_server".to_string());

	let models::Signal {rx, tx} = signal;

    let app = Router::new()
        .route("/auth", get(authorize))
        .layer(Extension(handle.clone()))
		.layer(Extension(tx));

	println!("start run server");

    let _ = axum::Server::bind(&handle.state::<models::AuthState>().socket_addr.clone())
        .serve(app.into_make_service())
		.with_graceful_shutdown(async {
			let a = rx.lock().await.recv().await;
		}).await;

	println!("end run server");

    Ok(())
}

fn create_client(redirect_url: RedirectUrl) -> BasicClient {
    let client_id = ClientId::new("05545068-ecb5-4188-8656-2f4dc5826cbd".to_string());
    let auth_url = AuthUrl::new("https://login.microsoftonline.com/901cb4ca-b862-4029-9306-e5cd0f6d9f86/oauth2/v2.0/authorize".to_string());
    let token_url = TokenUrl::new("https://login.microsoftonline.com/901cb4ca-b862-4029-9306-e5cd0f6d9f86/oauth2/v2.0/token".to_string());
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
	let (pkce_code_challenge,pkce_code_verifier) = PkceCodeChallenge::new_random_sha256();
    let socket_addr = get_available_addr();
	let redirect_url = format!("http://{socket_addr}/auth").to_string();

    let state = models::AuthState {
        csrf_token: CsrfToken::new_random(),
        pkce: Arc::new((pkce_code_challenge, PkceCodeVerifier::secret(&pkce_code_verifier).to_string())),
        client: Arc::new(create_client(RedirectUrl::new(redirect_url).unwrap())),
        socket_addr,
		token: Arc::new(Mutex::new("".to_string())),
    };

    tauri::Builder::default()
		.manage(state)
        .invoke_handler(tauri::generate_handler![scan, find_nfc_device, get_api_sessions, authenticate])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}