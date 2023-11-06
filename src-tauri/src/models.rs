use super::errors::TauriError;
use serde::Deserialize;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::ser::{Serialize, SerializeStruct, Serializer};
use oauth2::{
	PkceCodeChallenge, 
	CsrfToken, 
    AuthorizationCode,
	basic::BasicClient,
};

#[derive(Deserialize)]
pub struct Session {
	pub id: i64,
	pub date: String,
	pub hour: String,
	pub is_approved: i8,
}
#[derive(Deserialize)]
pub struct Sessions {
	pub result: Vec<Session>,
}

pub type APIResult<T, E = TauriError> = Result<T, E>;

impl Serialize for Session {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut s = serializer.serialize_struct("Session", 3)?;
        s.serialize_field("id", &self.id)?;
        s.serialize_field("date", &self.date)?;
        s.serialize_field("hour", &self.hour)?;
        s.serialize_field("is_approved", &self.is_approved)?;
        s.end()
    }
}

#[derive(Clone)]
pub struct AuthState {
    pub csrf_token: CsrfToken,
    pub pkce: Arc<(PkceCodeChallenge, String)>,
    pub client: Arc<BasicClient>,
    pub socket_addr: SocketAddr,
	pub token: Arc<Mutex<String>>
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
