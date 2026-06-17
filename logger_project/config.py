import os
from dotenv import load_dotenv
from datetime import datetime

# Get the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(script_dir, "LocalLogger.env")

# Load .env if it exists
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print(f"🔍 configurations loaded from your .env file")
else:
    print("⚠️ No .env file found at expected location. Falling back to OS environment variables.")

def ensure_env(key: str, default: str = None) -> str:
    val = os.getenv(key)
    if val is None:
        os.environ[key] = default or ""
        print(f"⚙️ Environment variable '{key}' was missing. Set to default: '{default}'")
        return default
    return val

def get_env(key: str, default: str = None) -> str:
    return ensure_env(key, default)

def get_env_int(key: str, default: int) -> int:
    try:
        return int(get_env(key, str(default)))
    except ValueError:
        print(f"⚠️ Invalid int for {key}. Using default: {default}")
        return default

def get_env_float(key: str, default: float) -> float:
    try:
        return float(get_env(key, str(default)))
    except ValueError:
        print(f"⚠️ Invalid float for {key}. Using default: {default}")
        return default

def get_env_bool(key: str, default: bool = False) -> bool:
    val = get_env(key, str(default)).strip().lower()
    return val in {"1", "true", "yes", "on"}

def as_dict():
    return {
        "LOG_BASENAME": get_env("LOG_BASENAME", "LocalLogger"),
        "LOG_DIR": get_env("LOG_DIR", "log"),
        "MAX_LOG_SIZE_MB": get_env_float("MAX_LOG_SIZE_MB", 5),
        "BACKUP_COUNT": get_env_int("BACKUP_COUNT", 5),
        "ARCHIVE_DAYS": get_env_int("ARCHIVE_DAYS", 0),
        "KEEP_RAW_FILES": get_env_bool("KEEP_RAW_FILES", True),
        "CLEANUP_DAYS": get_env_int("CLEANUP_DAYS", 7),
    }

def _v():
    d = as_dict()
    return (
        d["LOG_BASENAME"],
        d["LOG_DIR"],
        int(d["MAX_LOG_SIZE_MB"] * 1024 * 1024),
        d["BACKUP_COUNT"],
        d["ARCHIVE_DAYS"],
        d["KEEP_RAW_FILES"],
        d["CLEANUP_DAYS"],
    )

LOG_BASENAME, LOG_DIR, MAX_LOG_SIZE, BACKUP_COUNT, ARCHIVE_DAYS, KEEP_RAW_FILES, CLEANUP_DAYS = _v()

def reload_env():
    if dotenv_path:
        load_dotenv(dotenv_path, override=True)
    global LOG_BASENAME, LOG_DIR, MAX_LOG_SIZE, BACKUP_COUNT, ARCHIVE_DAYS, KEEP_RAW_FILES, CLEANUP_DAYS
    LOG_BASENAME, LOG_DIR, MAX_LOG_SIZE, BACKUP_COUNT, ARCHIVE_DAYS, KEEP_RAW_FILES, CLEANUP_DAYS = _v()

def write_env(updates: dict, path: str):
    existing = []
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            existing = f.read().splitlines()

    idx = {}
    for i, line in enumerate(existing):
        if not line or line.strip().startswith("#") or "=" not in line:
            continue
        k = line.split("=", 1)[0].strip()
        idx[k] = i

    def to_str_val(v):
        if isinstance(v, bool):
            return "true" if v else "false"
        return str(v)

    for k, v in updates.items():
        new_line = f"{k}={to_str_val(v)}"
        if k in idx:
            existing[idx[k]] = new_line
        else:
            existing.append(new_line)

    content = "\n".join(existing) + "\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

# 🕒 Dump current config to timestamped .env file
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
snapshot_path = os.path.join(script_dir, f"currentConfig_{timestamp}.env")
write_env(as_dict(), snapshot_path)
print(f"📦 Current config snapshot saved to: {snapshot_path}")
print(f"✅ Configuration loaded: {as_dict()}")