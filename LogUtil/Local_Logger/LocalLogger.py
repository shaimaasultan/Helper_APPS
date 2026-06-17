import logging
from logging.handlers import RotatingFileHandler
import os
import sys
import json
import glob
import shutil
import time
import zipfile
from datetime import datetime, timedelta
from enum import Enum


try:
    from . import config as cfg  # Works when imported from outside
except ModuleNotFoundError:
    import config as cfg  # Works when run directly from inside util



# ----------------------------
# Encoding + optional color
# ----------------------------
try:
    import colorama
    colorama.just_fix_windows_console()
    COLORAMA_AVAILABLE = True
except Exception:
    COLORAMA_AVAILABLE = False

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass





# ----------------------------
# Helpers for I/O robustness
# ----------------------------
def _retry(op, *args, tries=5, delay=0.15, backoff=2.0, exceptions=(OSError, PermissionError, shutil.Error), **kwargs):
    last_exc = None
    for _ in range(tries):
        try:
            return op(*args, **kwargs)
        except exceptions as e:
            last_exc = e
            time.sleep(delay)
            delay *= backoff
    raise last_exc

def _ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

def _safe_remove(path: str):
    if os.path.exists(path):
        _retry(os.remove, path)

def _safe_move(src: str, dst: str):
    _ensure_dir(os.path.dirname(dst))
    _retry(shutil.move, src, dst)

def _safe_copy_append(src: str, dst: str):
    _ensure_dir(os.path.dirname(dst))
    def _op():
        with open(dst, "ab") as w:
            if os.path.getsize(dst) > 0:
                w.write(b"\n")
            with open(src, "rb") as r:
                shutil.copyfileobj(r, w, length=1024 * 1024)
    _retry(_op)

def _unique_path(path: str) -> str:
    if not os.path.exists(path):
        return path
    root, ext = os.path.splitext(path)
    i = 1
    while True:
        cand = f"{root}_{i}{ext}"
        if not os.path.exists(cand):
            return cand
        i += 1

# ----------------------------
# Text styles and levels
# ----------------------------
class LogLevel(str, Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class JSONFormatter(logging.Formatter):
    EMOJIS = {"DEBUG": "🔍", "INFO": "✅", "WARNING": "⚠️", "ERROR": "❌", "CRITICAL": "🔥"}
    def format(self, record):
        emoji = self.EMOJIS.get(record.levelname, "")
        payload = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "emoji": emoji,
            "logger": record.name,
            "message": f"{emoji} {record.getMessage()}",
            "filename": record.filename,
            "line": record.lineno,
            "function": record.funcName,
        }
        return json.dumps(payload, ensure_ascii=False)

class TextFormatter(logging.Formatter):
    EMOJIS = {"DEBUG": "🔍", "INFO": "✅", "WARNING": "⚠️", "ERROR": "❌", "CRITICAL": "🔥"}
    def format(self, record):
        emoji = self.EMOJIS.get(record.levelname, "")
        return f"{emoji} " + super().format(record)

class ColorFormatter(logging.Formatter):
    COLORS = {"DEBUG": "\033[94m", "INFO": "\033[92m", "WARNING": "\033[93m", "ERROR": "\033[91m", "CRITICAL": "\033[95m"}
    EMOJIS = {"DEBUG": "🔍", "INFO": "✅", "WARNING": "⚠️", "ERROR": "❌", "CRITICAL": "🔥"}
    RESET = "\033[0m"
    def format(self, record):
        level = record.levelname.upper()
        color = self.COLORS.get(level, self.RESET)
        emoji = self.EMOJIS.get(level, "")
        return f"{color}{emoji} " + super().format(record) + f"{self.RESET}"

# ----------------------------
# Paths and handler lifecycle
# ----------------------------
BASE_FOLDER = os.path.dirname(os.path.abspath(__file__))

def _log_dir_abs():
    # LOG_DIR may be relative -> resolve under BASE_FOLDER
    #return cfg.LOG_DIR if os.path.isabs(cfg.LOG_DIR) else os.path.join(BASE_FOLDER, cfg.LOG_DIR)
    return cfg.LOG_DIR if os.path.isabs(cfg.LOG_DIR) else cfg.LOG_DIR

def _log_paths(for_date: datetime | None = None):
    d = (for_date or datetime.now()).strftime("%Y-%m-%d")
    base = cfg.LOG_BASENAME
    dir_abs = _log_dir_abs()
    _ensure_dir(dir_abs)
    json_path = os.path.join(dir_abs, f"{base}_{d}.json")
    txt_path = os.path.join(dir_abs, f"{base}_{d}.txt")
    return json_path, txt_path

def _build_file_handlers(for_date: datetime | None = None):
    json_path, txt_path = _log_paths(for_date)
    jh = RotatingFileHandler(json_path, maxBytes=cfg.MAX_LOG_SIZE, backupCount=cfg.BACKUP_COUNT, encoding="utf-8")
    jh.setFormatter(JSONFormatter(datefmt="%Y-%m-%d %H:%M:%S"))
    jh.setLevel(logging.DEBUG)
    th = RotatingFileHandler(txt_path, maxBytes=cfg.MAX_LOG_SIZE, backupCount=cfg.BACKUP_COUNT, encoding="utf-8")
    th.setFormatter(TextFormatter("[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"))
    th.setLevel(logging.DEBUG)
    return jh, th

def _close_file_handlers(logger_obj: logging.Logger):
    for h in list(logger_obj.handlers):
        if isinstance(h, RotatingFileHandler):
            try: h.flush()
            except Exception: pass
            try: h.close()
            except Exception: pass
            try: logger_obj.removeHandler(h)
            except Exception: pass

# ----------------------------
# Logger
# ----------------------------
def get_logger(name: str | None = None):
    log = logging.getLogger(name or "LocalLogger")
    log.setLevel(logging.DEBUG)
    log.propagate = False

    if not any(isinstance(h, logging.StreamHandler) and not isinstance(h, RotatingFileHandler) for h in log.handlers):
        stream = colorama.AnsiToWin32(sys.stdout, convert=True, strip=False).stream if COLORAMA_AVAILABLE else sys.stdout
        ch = logging.StreamHandler(stream)
        ch.setFormatter(ColorFormatter("%(asctime)s - %(levelname)s - %(message)s", datefmt="%H:%M:%S"))
        ch.setLevel(logging.DEBUG)
        log.addHandler(ch)

    has_json = any(isinstance(h, RotatingFileHandler) and getattr(h, "baseFilename", "").endswith(".json") for h in log.handlers)
    has_txt = any(isinstance(h, RotatingFileHandler) and getattr(h, "baseFilename", "").endswith(".txt") for h in log.handlers)
    if not (has_json and has_txt):
        try:
            jh, th = _build_file_handlers()
            log.addHandler(jh)
            log.addHandler(th)
        except Exception as e:
            log.error(f"❌ Failed to initialize file handlers: {e}")
    return log

logger = get_logger()

def reload_logger_from_config():
    """
    Re-reads env via config.reload_env() and rebuilds file handlers with new settings.
    """
    try:
        cfg.reload_env()
    except Exception as e:
        logger.error(f"❌ Failed to reload environment: {e}")
        return
    try:
        _close_file_handlers(logger)
        jh, th = _build_file_handlers()
        logger.addHandler(jh)
        logger.addHandler(th)
        logger.info("🔁 Logger reloaded from config.")
    except Exception as e:
        logger.error(f"❌ Failed to reinitialize file handlers: {e}")

def combine_messages(*messages, separator: str = " | ") -> str:
    cleaned = [
        str(msg).strip()
        for msg in messages
        if msg is not None and str(msg).strip()
    ]
    return separator.join(cleaned)

def log(*messages, level: LogLevel = None, separator: str = " | "):
    # Extract LogLevel from messages if present
    extracted_level = next((msg for msg in messages if isinstance(msg, LogLevel)), None)
    level = level or extracted_level or LogLevel.INFO

    # Filter out LogLevel from messages
    filtered_messages = [msg for msg in messages if not isinstance(msg, LogLevel)]

    try:
        message = combine_messages(*filtered_messages, separator=separator)
        getattr(logger, level.value)(message)
    except Exception as e:
        try:
            print(f"FALLBACK LOG [{level.value.upper()}]: {message} (logger error: {e})", file=sys.stderr)
        except Exception:
            pass

# ----------------------------
# Archive and cleanup
# ----------------------------
def archive_logs(days: int | None = None, keep_raw_files: bool | None = None):
    """
    Archive logs by filename date (not mtime), compress into per-date ZIPs.
    days=None -> cfg.ARCHIVE_DAYS; keep_raw_files=None -> cfg.KEEP_RAW_FILES
    """
    if days is None:
        days = cfg.ARCHIVE_DAYS
    if keep_raw_files is None:
        keep_raw_files = cfg.KEEP_RAW_FILES

    start_ts = datetime.now()
    timestamp = start_ts.strftime("%H%M%S")
    today = start_ts.date()

    log_dir = _log_dir_abs()
    archive_root = os.path.join(log_dir, "archive")
    _ensure_dir(archive_root)

    try:
        _close_file_handlers(logger)
    except Exception as e:
        log(f"❌ Failed to close file handlers: {e}", LogLevel.ERROR)

    patterns = [os.path.join(log_dir, f"{cfg.LOG_BASENAME}_*.json"),
                os.path.join(log_dir, f"{cfg.LOG_BASENAME}_*.txt")]
    to_process = []
    for patt in patterns:
        try:
            to_process.extend(glob.glob(patt))
        except Exception as e:
            log(f"❌ Failed to expand pattern {patt}: {e}", LogLevel.ERROR)

    touched_by_date = {}
    for path in to_process:
        try:
            base = os.path.basename(path)
            name_no_ext, ext = os.path.splitext(base)
            try:
                date_part = name_no_ext.split("_", 1)[1]
                file_date = datetime.strptime(date_part, "%Y-%m-%d").date()
            except Exception:
                continue

            should_archive = (days == 0 and file_date == today) or (days > 0 and file_date <= today - timedelta(days=days))
            if not should_archive:
                continue

            date_str = file_date.strftime("%Y-%m-%d")
            archive_folder = os.path.join(archive_root, date_str)
            _ensure_dir(archive_folder)

            # Timestamped backup name
            target_name = f"{name_no_ext}_{timestamp}{ext}"
            target_path = _unique_path(os.path.join(archive_folder, target_name))

            if os.path.exists(target_path):
                try:
                    _safe_copy_append(path, target_path)
                    _safe_remove(path)
                    log(f"📎 Appended log to archive: {path} → {target_path}", LogLevel.DEBUG)
                except Exception as e:
                    log(f"❌ Append failed for {path} → {target_path}: {e}", LogLevel.ERROR)
                    continue
            else:
                try:
                    _safe_move(path, target_path)
                    log(f"📦 Archived log: {path} → {target_path}", LogLevel.DEBUG)
                except Exception as e:
                    log(f"❌ Move failed for {path} → {target_path}: {e}", LogLevel.ERROR)
                    continue

            touched_by_date.setdefault(date_str, []).append(target_path)

        except Exception as e:
            log(f"❌ Unexpected error while processing {path}: {e}", LogLevel.ERROR)

    for date_str, files in touched_by_date.items():
        if not files:
            continue
        try:
            zip_name = f"{date_str}_{timestamp}.zip"
            zip_path = _unique_path(os.path.join(archive_root, zip_name))
            with zipfile.ZipFile(zip_path, "a", compression=zipfile.ZIP_DEFLATED) as zf:
                for f in files:
                    try:
                        arcname = os.path.join(date_str, os.path.basename(f))
                        zf.write(f, arcname)
                    except Exception as e:
                        log(f"❌ Failed to add to zip {f}: {e}", LogLevel.ERROR)

            if not keep_raw_files:
                for f in files:
                    try:
                        _safe_remove(f)
                    except Exception as e:
                        log(f"❌ Failed to remove archived file {f}: {e}", LogLevel.ERROR)

            log(f"🗜️ Compressed {len(files)} file(s) for {date_str} → {zip_path}", LogLevel.INFO)
        except Exception as e:
            log(f"❌ Compression failed for {date_str}: {e}", LogLevel.ERROR)

    try:
        jh, th = _build_file_handlers()
        logger.addHandler(jh)
        logger.addHandler(th)
    except Exception as e:
        log(f"❌ Failed to reinitialize file handlers: {e}", LogLevel.ERROR)

def clean_old_logs(days: int | None = None):
    """
    Deletes unarchived loose files older than days inside log/.
    """
    if days is None:
        days = cfg.CLEANUP_DAYS

    log_dir = _log_dir_abs()
    cutoff = time.time() - (days * 86400)
    try:
        for f in glob.glob(os.path.join(log_dir, "*")):
            if os.path.isdir(f) or f.lower().endswith(".zip"):
                continue
            try:
                if os.path.getmtime(f) < cutoff:
                    _safe_remove(f)
                    log(f"🧹 Deleted old log: {f}", LogLevel.DEBUG)
            except Exception as e:
                log(f"❌ Failed to consider {f} for cleanup: {e}", LogLevel.ERROR)
    except Exception as e:
        log(f"❌ Cleanup failed: {e}", LogLevel.ERROR)

# ----------------------------
# Example direct run
# ----------------------------
if __name__ == "__main__":
    reload_logger_from_config()
    log("Logger ready.", LogLevel.INFO)
    log("Logger initialized.", LogLevel.INFO)
    log("Disk space below 10%.", LogLevel.WARNING)
    log("Cache cleared for session 123.", LogLevel.DEBUG)
    log("SMTP server error in payment gateway", LogLevel.CRITICAL)
    log(cfg.LOG_DIR, LogLevel.DEBUG)
    #archive_logs(days=0, keep_raw_files=True)