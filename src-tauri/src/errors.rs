use std::fmt::{Display, Formatter};
use reqwest::StatusCode;

#[derive(Debug)]
pub struct TauriError {
    pub detail: &'static str,
}

impl From<reqwest::Error> for TauriError {
    fn from(error: reqwest::Error) -> Self {
        println!("{:?}", error);
        let error_message = match error.status() {
            Some(StatusCode::FORBIDDEN) => "You don't have appropriate privileges to access this ressource.",
            Some(StatusCode::BAD_REQUEST) => "There was a problem with the formating of the request",
            Some(StatusCode::UNAUTHORIZED) => "This endpoint requires a valid token.",
            _ => "Something went wrong handling this request"
        };
        TauriError {
            detail: error_message
        }
    }
}

impl serde::Serialize for TauriError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

impl Display for TauriError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.detail)
    }
}