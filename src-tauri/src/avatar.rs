//! Allowlisted binary avatar bridge with bounded in-memory caching.

use std::{
  collections::{HashMap, VecDeque},
  sync::Mutex,
};

use serde::{Deserialize, Serialize};
use tauri::State;
use url::Url;

use crate::python_sidecar;

const AVATAR_HOST: &str = "ff14risingstones.gcloud.com.cn";
const MAX_AVATAR_URL_BYTES: usize = 2048;
const MAX_AVATAR_DATA_URL_BYTES: usize = 3 * 1024 * 1024;
const MAX_AVATAR_SIDECAR_BYTES: usize = MAX_AVATAR_DATA_URL_BYTES + 1024;
const MAX_AVATAR_CACHE_ENTRIES: usize = 256;
const MAX_AVATAR_CACHE_BYTES: usize = 32 * 1024 * 1024;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AvatarRequest {
  url: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AvatarResponse {
  data_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AvatarSidecarRequest {
  operation: &'static str,
  url: String,
}

#[derive(Default)]
struct AvatarCache {
  values: HashMap<String, AvatarResponse>,
  order: VecDeque<String>,
  total_bytes: usize,
}

#[derive(Default)]
pub struct AvatarState {
  cache: Mutex<AvatarCache>,
}

#[tauri::command]
pub async fn fetch_rising_stones_avatar(
  request: AvatarRequest,
  state: State<'_, AvatarState>,
) -> Result<AvatarResponse, String> {
  validate_avatar_url(&request.url)?;
  if let Some(cached) = state
    .cache
    .lock()
    .map_err(|_| "Unable to read the avatar cache.".to_owned())?
    .values
    .get(&request.url)
    .cloned()
  {
    return Ok(cached);
  }

  let cache_key = request.url.clone();
  let response = tauri::async_runtime::spawn_blocking(move || {
    python_sidecar::request(
      &AvatarSidecarRequest {
        operation: "fetchAvatar",
        url: request.url,
      },
      MAX_AVATAR_SIDECAR_BYTES,
      "Rising Stones avatar",
    )
  })
  .await
  .map_err(|_| "The avatar request task stopped unexpectedly.".to_owned())??;
  validate_avatar_response(&response)?;
  cache_avatar(&state, cache_key, response.clone())?;
  Ok(response)
}

fn validate_avatar_url(raw_url: &str) -> Result<(), String> {
  if raw_url.len() > MAX_AVATAR_URL_BYTES {
    return Err("The avatar URL is too long.".to_owned());
  }
  let url = Url::parse(raw_url).map_err(|_| "The avatar URL is invalid.".to_owned())?;
  if url.scheme() != "https"
    || url.host_str() != Some(AVATAR_HOST)
    || url.port_or_known_default() != Some(443)
    || !url.username().is_empty()
    || url.password().is_some()
    || !url.path().starts_with("/avatar/")
    || url.query().is_some()
    || url.fragment().is_some()
  {
    return Err("The avatar URL is not supported.".to_owned());
  }
  Ok(())
}

fn validate_avatar_response(response: &AvatarResponse) -> Result<(), String> {
  if response.data_url.len() > MAX_AVATAR_DATA_URL_BYTES
    || ![
      "data:image/jpeg;base64,",
      "data:image/png;base64,",
      "data:image/webp;base64,",
      "data:image/avif;base64,",
      "data:image/gif;base64,",
    ]
    .iter()
    .any(|prefix| response.data_url.starts_with(prefix))
  {
    return Err("The avatar response is invalid.".to_owned());
  }
  Ok(())
}

fn cache_avatar(state: &AvatarState, key: String, response: AvatarResponse) -> Result<(), String> {
  let mut cache = state
    .cache
    .lock()
    .map_err(|_| "Unable to update the avatar cache.".to_owned())?;
  if let Some(previous) = cache.values.remove(&key) {
    cache.total_bytes = cache.total_bytes.saturating_sub(previous.data_url.len());
  }
  cache.order.retain(|cached_key| cached_key != &key);
  while cache.values.len() >= MAX_AVATAR_CACHE_ENTRIES
    || cache.total_bytes + response.data_url.len() > MAX_AVATAR_CACHE_BYTES
  {
    if let Some(oldest) = cache.order.pop_front() {
      if let Some(removed) = cache.values.remove(&oldest) {
        cache.total_bytes = cache.total_bytes.saturating_sub(removed.data_url.len());
      }
    } else {
      break;
    }
  }
  cache.total_bytes += response.data_url.len();
  cache.order.push_back(key.clone());
  cache.values.insert(key, response);
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn accepts_only_the_rising_stones_avatar_path() {
    assert!(validate_avatar_url(
      "https://ff14risingstones.gcloud.com.cn/avatar/2026/user/avatar.jpeg"
    )
    .is_ok());
    assert!(
      validate_avatar_url("https://ff14risingstones.gcloud.com.cn/other/avatar.jpeg").is_err()
    );
    assert!(validate_avatar_url("https://example.com/avatar/user.jpeg").is_err());
  }

  #[test]
  fn rejects_non_image_and_oversized_avatar_responses() {
    assert!(validate_avatar_response(&AvatarResponse {
      data_url: "data:image/jpeg;base64,YQ==".to_owned(),
    })
    .is_ok());
    assert!(validate_avatar_response(&AvatarResponse {
      data_url: "data:text/plain;base64,YQ==".to_owned(),
    })
    .is_err());
  }

  #[test]
  fn replacing_a_cached_avatar_keeps_one_entry_and_correct_byte_count() {
    let state = AvatarState::default();
    cache_avatar(
      &state,
      "https://ff14risingstones.gcloud.com.cn/avatar/a.jpeg".to_owned(),
      AvatarResponse {
        data_url: "data:image/jpeg;base64,YQ==".to_owned(),
      },
    )
    .unwrap();
    cache_avatar(
      &state,
      "https://ff14risingstones.gcloud.com.cn/avatar/a.jpeg".to_owned(),
      AvatarResponse {
        data_url: "data:image/jpeg;base64,YWI=".to_owned(),
      },
    )
    .unwrap();

    let cache = state.cache.lock().unwrap();
    assert_eq!(cache.values.len(), 1);
    assert_eq!(cache.order.len(), 1);
    assert_eq!(cache.total_bytes, "data:image/jpeg;base64,YWI=".len());
  }
}
