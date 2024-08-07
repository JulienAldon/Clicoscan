use super::errors::TauriError;
use serde::Deserialize;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Mutex;
use oauth2::{
	PkceCodeChallenge, 
	CsrfToken, 
    AuthorizationCode,
	basic::BasicClient,
};

#[derive(Deserialize, serde::Serialize)]
pub struct Student {
    pub id: u64,
    pub login: String,
    pub card: String,
    #[serde(default)]
    pub status: Option<String>,
    pub begin: Option<String>,
    pub end: Option<String>,
    pub session_id: u64
}

#[derive(Deserialize, serde::Serialize)]
pub struct BocalResponse {
    pub card: Card
}

#[derive(Deserialize, serde::Serialize)]
pub struct Card {
    pub user: String,
    pub id: String,
}

#[derive(Deserialize, serde::Serialize)]
pub struct ModifySessionBody {
    pub data: Vec<Student>
}
#[derive(Deserialize, serde::Serialize)]
pub struct SessionUpdates {
    login:  String,
    updated: bool
}

#[derive(Deserialize, serde::Serialize)]
pub struct ModifySessionResponse {
    pub result: Vec<SessionUpdates>
}

#[derive(Deserialize, serde::Serialize)]
pub struct Session {
	pub id: u64,
	pub date: String,
	pub hour: String,
	pub is_approved: i8,
}

#[derive(Deserialize, serde::Serialize)]
pub struct SessionResponse {
    pub session: Vec<Session>,
    pub students: Vec<Student>
}



#[derive(Deserialize, serde::Serialize)]
pub struct Sessions {
	pub result: Vec<Session>,
}

#[derive(Clone, serde::Serialize)]
pub struct Payload {
  pub message: String,
}

pub type APIResult<T, E = TauriError> = Result<T, E>;

// impl Serialize for Session {
//     fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
//     where
//         S: Serializer,
//     {
//         let mut s = serializer.serialize_struct("Session", 4)?;
//         s.serialize_field("id", &self.id)?;
//         s.serialize_field("date", &self.date)?;
//         s.serialize_field("hour", &self.hour)?;
//         s.serialize_field("is_approved", &self.is_approved)?;
//         s.end()
//     }
// }

#[derive(Clone)]
pub struct AuthState {
    pub csrf_token: CsrfToken,
    pub pkce: Arc<(PkceCodeChallenge, String)>,
    pub client: Arc<BasicClient>,
    pub socket_addr: SocketAddr,
	pub token: Arc<Mutex<String>>,
    pub back_addr: String
}

pub struct ScannerState {
    pub handle: Arc<Mutex<Option<tauri::async_runtime::JoinHandle<()>>>>,
    pub signal: Arc<std::sync::atomic::AtomicBool>
}

#[derive(Deserialize)]
pub struct CallbackQuery {
    pub code: AuthorizationCode,
	pub state: CsrfToken,
}

#[derive(Clone)]
pub struct Signal {
	pub rx: Arc<Mutex<tokio::sync::mpsc::Receiver<String>>>,
	pub tx: tokio::sync::mpsc::Sender<String>,
}