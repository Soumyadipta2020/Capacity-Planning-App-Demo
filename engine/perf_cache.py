"""High-performance mtime-validated caching, partitioning, and vectorization helpers.

All caches key strictly on filesystem path signatures ``(abs_path, size, mtime_ns)``
plus explicit monotonic invalidation epochs so neither edits on disk nor write paths
ever observe stale data, and no source data or computation results are altered.
"""

from __future__ import annotations

from collections import OrderedDict
import hashlib
import json
import math
import os
from pathlib import Path
import pickle
import tempfile
import threading
from typing import Any, Callable, Iterable, Optional

import numpy as np
import pandas as pd

_LOCK = threading.RLock()
_CACHE_DIR = Path(tempfile.gettempdir()) / "capacity_planning_perf_cache"
_WRITE_EPOCHS: dict[str, int] = {}
_VERIFIED_SIGNATURES: dict[tuple[Any, ...], dict[str, Any]] = {}


class _MemoryLRU:
    """Thread-safe bounded LRU cache."""

    def __init__(self, max_entries: int = 48):
        self._max_entries = max_entries
        self._data: OrderedDict[Any, Any] = OrderedDict()
        self._lock = threading.RLock()

    def get(self, key: Any) -> Any:
        with self._lock:
            if key not in self._data:
                return None
            self._data.move_to_end(key)
            return self._data[key]

    def put(self, key: Any, value: Any) -> None:
        with self._lock:
            if key in self._data:
                self._data.move_to_end(key)
            self._data[key] = value
            while len(self._data) > self._max_entries:
                self._data.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()

    def invalidate_matching(self, predicate: Callable[[Any], bool]) -> None:
        with self._lock:
            doomed = [k for k in self._data if predicate(k)]
            for k in doomed:
                del self._data[k]


_FINAL_DF_LRU = _MemoryLRU(max_entries=24)
_SUBCALC_DF_LRU = _MemoryLRU(max_entries=48)
_PACKED_FINAL_LRU = _MemoryLRU(max_entries=24)
_BUNDLE_LRU = _MemoryLRU(max_entries=16)
_INPUT_TABLE_LRU = _MemoryLRU(max_entries=64)
_CALC_MODULE_LRU = _MemoryLRU(max_entries=36)
_SCENARIO_LOG_LRU = _MemoryLRU(max_entries=8)
_PARTITION_META_LRU = _MemoryLRU(max_entries=32)


def path_signature(path: Optional[str | Path]) -> Optional[tuple[str, int, int]]:
    """Return ``(abspath, size, mtime_ns)`` for an existing file, else ``None``."""
    if not path:
        return None
    try:
        ap = os.path.abspath(str(path))
        st = os.stat(ap)
        return (ap, int(st.st_size), int(st.st_mtime_ns))
    except OSError:
        return None


def local_source_signature(
    csv_path: str | Path,
    gz_candidates: Optional[Iterable[str | Path]] = None,
) -> Optional[tuple[Any, ...]]:
    """Return an exact signature capturing whether CSV or its gzip fallback is active."""
    csv_sig = path_signature(csv_path)
    if csv_sig is not None:
        return ("csv", csv_sig)
    if gz_candidates:
        for cand in gz_candidates:
            gz_sig = path_signature(cand)
            if gz_sig is not None:
                return ("gz", gz_sig)
    return None


def get_write_epoch(namespace: str) -> int:
    """Return the current write invalidation counter for *namespace*."""
    with _LOCK:
        return _WRITE_EPOCHS.get(namespace, 0)


def invalidate_namespace(namespace: str) -> None:
    """Invalidate in-memory caches and bump the write epoch for *namespace*."""
    with _LOCK:
        _WRITE_EPOCHS[namespace] = _WRITE_EPOCHS.get(namespace, 0) + 1
        _VERIFIED_SIGNATURES.clear()
    if namespace == "final_plan":
        _FINAL_DF_LRU.clear()
        _PACKED_FINAL_LRU.clear()
        _BUNDLE_LRU.clear()
        _PARTITION_META_LRU.clear()
    elif namespace.startswith("subcalc:"):
        _SUBCALC_DF_LRU.invalidate_matching(lambda k: len(k) > 0 and k[0] == namespace)
        _CALC_MODULE_LRU.invalidate_matching(lambda k: len(k) > 0 and k[0] == namespace)
        _PARTITION_META_LRU.invalidate_matching(lambda k: len(k) > 0 and k[0] == namespace)
    elif namespace == "subcalc_all":
        _SUBCALC_DF_LRU.clear()
        _CALC_MODULE_LRU.clear()
        _PARTITION_META_LRU.clear()
    elif namespace == "scenario_log":
        _SCENARIO_LOG_LRU.clear()
        _BUNDLE_LRU.clear()
    elif namespace == "input_tables":
        _INPUT_TABLE_LRU.clear()
    else:
        _FINAL_DF_LRU.clear()
        _SUBCALC_DF_LRU.clear()
        _PACKED_FINAL_LRU.clear()
        _BUNDLE_LRU.clear()
        _INPUT_TABLE_LRU.clear()
        _CALC_MODULE_LRU.clear()
        _SCENARIO_LOG_LRU.clear()
        _PARTITION_META_LRU.clear()


def _sig_hash(tag: str, sig: Any) -> str:
    raw = json.dumps([tag, sig], sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:24]


def _key_filename(prefix: str, key_value: str) -> str:
    h = hashlib.sha256(key_value.encode("utf-8", errors="replace")).hexdigest()[:20]
    return f"{prefix}_{h}.pkl"


def _atomic_write_bytes(target: Path, payload: bytes) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=".tmp_", dir=str(target.parent))
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(payload)
        os.replace(tmp_name, target)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def _read_pickle(path: Path) -> Any:
    import gc
    was_enabled = gc.isenabled()
    if was_enabled:
        gc.disable()
    try:
        with open(path, "rb") as fh:
            return pickle.load(fh)
    finally:
        if was_enabled:
            gc.enable()


def _write_pickle(path: Path, obj: Any) -> None:
    _atomic_write_bytes(path, pickle.dumps(obj, protocol=pickle.HIGHEST_PROTOCOL))


def get_verified_default_state(sig_tuple: tuple[Any, ...]) -> Optional[dict[str, Any]]:
    """Return cached verification summary if *sig_tuple* matches prior validation."""
    with _LOCK:
        cached = _VERIFIED_SIGNATURES.get(sig_tuple)
        if cached is not None:
            return cached
    try:
        marker = _CACHE_DIR / "verified" / f"{_sig_hash('defaults', sig_tuple)}.json"
        if marker.exists():
            data = json.loads(marker.read_text(encoding="utf-8"))
            if data.get("ok") is True and _to_json_tuple(data.get("sig") or ()) == _to_json_tuple(sig_tuple):
                res = data.get("result") or {}
                with _LOCK:
                    _VERIFIED_SIGNATURES[sig_tuple] = res
                return res
    except Exception:
        pass
    return None


def _to_json_tuple(obj: Any) -> Any:
    if isinstance(obj, (list, tuple)):
        return tuple(_to_json_tuple(x) for x in obj)
    return obj


def mark_default_state_verified(sig_tuple: tuple[Any, ...], result: Optional[dict[str, Any]] = None) -> None:
    """Record that *sig_tuple* passed default-scenario integrity checks."""
    res_obj = dict(result or {})
    with _LOCK:
        _VERIFIED_SIGNATURES[sig_tuple] = res_obj
    try:
        marker = _CACHE_DIR / "verified" / f"{_sig_hash('defaults', sig_tuple)}.json"
        payload = json.dumps({"ok": True, "sig": sig_tuple, "result": res_obj}).encode("utf-8")
        _atomic_write_bytes(marker, payload)
    except Exception:
        pass


def load_partitioned_dataframe(
    namespace: str,
    sig: Optional[tuple[Any, ...]],
    partition_col: str,
    key_value: Optional[str],
    raw_loader: Callable[[], pd.DataFrame],
    period: Optional[str] = None,
    period_col: str = "period",
) -> pd.DataFrame:
    """Load and cache a DataFrame partitioned on disk by *partition_col*.

    When *key_value* is given and a valid disk partition exists for *sig*, only that
    single partition pickle is read rather than re-parsing the multi-megabyte CSV.
    """
    epoch = get_write_epoch(namespace)
    lru = _FINAL_DF_LRU if namespace == "final_plan" else _SUBCALC_DF_LRU
    cache_key = (namespace, sig, epoch, key_value, period)
    cached = lru.get(cache_key)
    if cached is not None:
        return cached.copy()

    # Check if we already hold the unfiltered partition in RAM when filtering by period.
    if key_value is not None and period is not None:
        base_cached = lru.get((namespace, sig, epoch, key_value, None))
        if base_cached is not None:
            filtered = base_cached[base_cached[period_col] == str(period)].reset_index(drop=True)
            lru.put(cache_key, filtered)
            return filtered.copy()

    if sig is None:
        df = raw_loader()
        return _filter_and_copy(df, partition_col, key_value, period, period_col)

    part_dir = _CACHE_DIR / "partitions" / _sig_hash(namespace, sig)
    meta_path = part_dir / "manifest.json"
    meta = _PARTITION_META_LRU.get((namespace, sig))

    if meta is None and meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            _PARTITION_META_LRU.put((namespace, sig), meta)
        except Exception:
            meta = None

    if meta is None:
        # Build partition index from a single full parse of the underlying file.
        with _LOCK:
            meta = _PARTITION_META_LRU.get((namespace, sig))
            if meta is None and meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text(encoding="utf-8"))
                    _PARTITION_META_LRU.put((namespace, sig), meta)
                except Exception:
                    meta = None
            if meta is None:
                full_df = raw_loader()
                meta = _build_disk_partitions(part_dir, meta_path, full_df, partition_col)
                if meta is not None:
                    _PARTITION_META_LRU.put((namespace, sig), meta)
                # Return directly from full_df without re-reading disk right now.
                sub = _filter_and_copy(full_df, partition_col, key_value, period, period_col)
                lru.put(cache_key, sub)
                if key_value is None and period is None:
                    lru.put((namespace, sig, epoch, None, None), full_df)
                return sub.copy()

    if key_value is not None and meta is not None:
        files = meta.get("files") or {}
        if key_value not in files:
            empty_df = _read_empty_schema(part_dir, meta)
            if empty_df is not None:
                lru.put(cache_key, empty_df)
                return empty_df.copy()
        else:
            part_file = part_dir / files[key_value]
            if part_file.exists():
                try:
                    part_df = _read_pickle(part_file)
                    lru.put((namespace, sig, epoch, key_value, None), part_df)
                    if period is not None:
                        filtered = part_df[part_df[period_col] == str(period)].reset_index(drop=True)
                        lru.put(cache_key, filtered)
                        return filtered.copy()
                    return part_df.copy()
                except Exception:
                    pass

    # key_value is None (full dataset requested) or partition file missing.
    if key_value is None and meta is not None and meta.get("files"):
        try:
            frames = [_read_pickle(part_dir / fname) for fname in meta["files"].values()]
            full_df = pd.concat(frames, ignore_index=True) if frames else _read_empty_schema(part_dir, meta)
            if full_df is not None:
                lru.put((namespace, sig, epoch, None, None), full_df)
                if period is not None:
                    filtered = full_df[full_df[period_col] == str(period)].reset_index(drop=True)
                    lru.put(cache_key, filtered)
                    return filtered.copy()
                return full_df.copy()
        except Exception:
            pass

    full_df = raw_loader()
    sub = _filter_and_copy(full_df, partition_col, key_value, period, period_col)
    lru.put(cache_key, sub)
    return sub.copy()


def _filter_and_copy(
    df: pd.DataFrame,
    partition_col: str,
    key_value: Optional[str],
    period: Optional[str],
    period_col: str,
) -> pd.DataFrame:
    out = df
    if key_value is not None and partition_col in out.columns:
        out = out[out[partition_col] == str(key_value)]
    if period is not None and period_col in out.columns:
        out = out[out[period_col] == str(period)]
    return out.reset_index(drop=True)


def _read_empty_schema(part_dir: Path, meta: dict[str, Any]) -> Optional[pd.DataFrame]:
    schema_file = meta.get("schema_file")
    if schema_file and (part_dir / schema_file).exists():
        try:
            return _read_pickle(part_dir / schema_file)
        except Exception:
            return None
    return None


def _build_disk_partitions(
    part_dir: Path,
    meta_path: Path,
    df: pd.DataFrame,
    partition_col: str,
) -> Optional[dict[str, Any]]:
    try:
        part_dir.mkdir(parents=True, exist_ok=True)
        files: dict[str, str] = {}
        schema_name = "__empty_schema__.pkl"
        _write_pickle(part_dir / schema_name, df.iloc[0:0].copy())
        if not df.empty and partition_col in df.columns:
            for key_val, grp in df.groupby(partition_col, sort=False):
                k_str = str(key_val)
                fname = _key_filename("part", k_str)
                _write_pickle(part_dir / fname, grp.reset_index(drop=True))
                files[k_str] = fname
        meta = {
            "partition_col": partition_col,
            "row_count": int(len(df)),
            "schema_file": schema_name,
            "files": files,
        }
        _atomic_write_bytes(meta_path, json.dumps(meta).encode("utf-8"))
        return meta
    except Exception:
        return None


def get_cached_packed_final(
    sig: Optional[tuple[Any, ...]],
    version: Optional[str],
    period: Optional[str],
    loader_and_packer: Callable[[], dict[str, Any]],
) -> dict[str, Any]:
    """Return cached packed final payload when source signature matches."""
    if sig is None:
        return loader_and_packer()
    epoch = get_write_epoch("final_plan")
    key = ("packed_final", sig, epoch, version, period)
    cached = _PACKED_FINAL_LRU.get(key)
    if cached is not None:
        return cached
    # Also check disk cache so cross-process Decision Studio / Insights loads stay instant.
    disk_path = _CACHE_DIR / "packed" / f"{_sig_hash('packed', (sig, version, period))}.pkl"
    if disk_path.exists():
        try:
            packed = _read_pickle(disk_path)
            _PACKED_FINAL_LRU.put(key, packed)
            return packed
        except Exception:
            pass
    packed = loader_and_packer()
    _PACKED_FINAL_LRU.put(key, packed)
    try:
        _write_pickle(disk_path, packed)
    except Exception:
        pass
    return packed


def _series_to_clean_str_series(series: Optional[pd.Series], length: int) -> pd.Series:
    if series is None:
        return pd.Series([""] * length, dtype=object)
    has_na = bool(series.isna().any())
    dtype_name = str(series.dtype)
    if not has_na and dtype_name in ("str", "string", "object"):
        if dtype_name != "object":
            return series
        # Check if object column already holds only str
        vals = series.tolist()
        if all(type(v) is str for v in vals):
            return series
        return pd.Series([v if isinstance(v, str) else str(v) for v in vals], dtype=object)
    vals = series.tolist()
    return pd.Series([v if isinstance(v, str) else ("" if v is None or pd.isna(v) else str(v)) for v in vals], dtype=object)


def fast_pack_final_dataframe(df: pd.DataFrame, json_safe: bool = False) -> dict[str, Any]:
    """Vectorized equivalent of ``_pack_final_dataframe`` with identical output."""
    if df is None or df.empty:
        return {
            "regions": [],
            "areaCodes": [],
            "patches": [],
            "combos": [],
            "periods": [],
            "weeks": [],
            "rows": [],
            "rowCount": 0,
        }

    n = len(df)
    reg_s = _series_to_clean_str_series(df["region"] if "region" in df.columns else None, n)
    area_s = _series_to_clean_str_series(df["area_code"] if "area_code" in df.columns else None, n)
    patch_s = _series_to_clean_str_series(df["patch"] if "patch" in df.columns else None, n)
    skill_s = _series_to_clean_str_series(df["skill"] if "skill" in df.columns else None, n)
    grp_s = _series_to_clean_str_series(df["group"] if "group" in df.columns else None, n)
    met_s = _series_to_clean_str_series(df["metric"] if "metric" in df.columns else None, n)
    lvl2_s = _series_to_clean_str_series(df["level2"] if "level2" in df.columns else None, n)
    flag_s = _series_to_clean_str_series(df["flag"] if "flag" in df.columns else None, n)
    per_s = _series_to_clean_str_series(df["period"] if "period" in df.columns else None, n)
    wk_s = _series_to_clean_str_series(df["weekcomm"] if "weekcomm" in df.columns else None, n)

    p_codes, p_uniques = pd.factorize(patch_s, sort=True)
    r_codes, r_uniques = pd.factorize(reg_s, sort=True)
    a_codes, a_uniques = pd.factorize(area_s, sort=True)
    pe_codes, pe_uniques = pd.factorize(per_s, sort=True)
    w_codes, w_uniques = pd.factorize(wk_s, sort=True)

    s_c, s_u = pd.factorize(skill_s, sort=False)
    g_c, g_u = pd.factorize(grp_s, sort=False)
    m_c, m_u = pd.factorize(met_s, sort=False)
    l_c, l_u = pd.factorize(lvl2_s, sort=False)
    f_c, f_u = pd.factorize(flag_s, sort=False)

    radix_prod = max(1, len(g_u)) * max(1, len(m_u)) * max(1, len(l_u)) * max(1, len(f_u))
    if max(1, len(s_u)) * radix_prod < 2**62:
        mg = max(1, len(g_u))
        mm = max(1, len(m_u))
        ml = max(1, len(l_u))
        mf = max(1, len(f_u))
        combo_key = (((s_c * mg + g_c) * mm + m_c) * ml + l_c) * mf + f_c
        uniq_ck, c_inv = np.unique(combo_key, return_inverse=True)
        combos_unsorted = [
            [
                str(s_u[k // (mg * mm * ml * mf)]),
                str(g_u[(k // (mm * ml * mf)) % mg]),
                str(m_u[(k // (ml * mf)) % mm]),
                str(l_u[(k // mf) % ml]),
                str(f_u[k % mf]),
            ]
            for k in uniq_ck
        ]
        order = sorted(range(len(combos_unsorted)), key=lambda i: combos_unsorted[i])
        unique_combos = [combos_unsorted[i] for i in order]
        remap = np.empty(len(order), dtype=np.int64)
        for new_i, old_i in enumerate(order):
            remap[old_i] = new_i
        c_codes_list = remap[c_inv].tolist()
    else:
        raw_combos = list(zip(skill_s.tolist(), grp_s.tolist(), met_s.tolist(), lvl2_s.tolist(), flag_s.tolist()))
        unique_combo_tuples = sorted(set(raw_combos))
        combo_idx = {c: i for i, c in enumerate(unique_combo_tuples)}
        unique_combos = [list(c) for c in unique_combo_tuples]
        c_codes_list = [combo_idx[c] for c in raw_combos]

    if "value" in df.columns:
        val_arr = pd.to_numeric(df["value"], errors="coerce").fillna(0.0).to_numpy(dtype=np.float64, copy=False)
        rounded_arr = np.round(val_arr, 4)
        rounded_vals = rounded_arr.tolist()
        if json_safe and not np.isfinite(rounded_arr).all():
            bad_indices = np.flatnonzero(~np.isfinite(rounded_arr))
            for idx in bad_indices:
                rounded_vals[int(idx)] = None
    else:
        rounded_vals = [0.0] * n

    rows = [
        [p_i, c_i, pe_i, w_i, val, r_i, a_i]
        for p_i, c_i, pe_i, w_i, val, r_i, a_i in zip(
            p_codes.tolist(),
            c_codes_list,
            pe_codes.tolist(),
            w_codes.tolist(),
            rounded_vals,
            r_codes.tolist(),
            a_codes.tolist(),
        )
    ]

    version_str = ""
    if "version" in df.columns:
        ver_series = df["version"].dropna()
        if not ver_series.empty:
            version_str = str(ver_series.iloc[0])

    stamp_str = ""
    if "create_datestamp" in df.columns:
        stamp_series = df["create_datestamp"].dropna()
        if not stamp_series.empty:
            stamp_str = str(stamp_series.iloc[0])

    return {
        "version": version_str,
        "create_datestamp": stamp_str,
        "regions": [str(x) for x in r_uniques.tolist()],
        "areaCodes": [str(x) for x in a_uniques.tolist()],
        "patches": [str(x) for x in p_uniques.tolist()],
        "combos": unique_combos,
        "periods": [str(x) for x in pe_uniques.tolist()],
        "weeks": [str(x) for x in w_uniques.tolist()],
        "rows": rows,
        "rowCount": n,
    }


def fast_clean_for_json(obj: Any) -> Any:
    """Fast recursive JSON sanitizer avoiding slow ``pd.isna`` calls on primitives."""
    t = type(obj)
    if t is str or t is int or t is bool or obj is None:
        return obj
    if t is float:
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if t is list:
        return [fast_clean_for_json(x) for x in obj]
    if t is dict:
        return {k: fast_clean_for_json(v) for k, v in obj.items()}
    if t is tuple:
        return [fast_clean_for_json(x) for x in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        fval = float(obj)
        return None if (math.isnan(fval) or math.isinf(fval)) else fval
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: fast_clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [fast_clean_for_json(x) for x in obj]
    try:
        if pd.isna(obj):
            return None
    except (TypeError, ValueError):
        pass
    return obj


def fast_sanitize_dataframe_for_json(df: pd.DataFrame) -> tuple[list[str], list[dict[str, Any]]]:
    """Vectorized equivalent of ``sanitize_dataframe_for_json``."""
    if df is None or df.empty:
        return (list(df.columns) if df is not None else [], [])

    cols = list(df.columns)
    work = df.copy()
    for col in cols:
        s = work[col]
        if pd.api.types.is_float_dtype(s):
            arr = s.to_numpy(dtype=np.float64, copy=True)
            invalid = ~np.isfinite(arr)
            if invalid.any():
                obj_col = s.astype(object)
                obj_col[invalid] = None
                work[col] = obj_col
        elif pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s):
            if s.isna().any():
                work[col] = s.astype(object).where(s.notna(), None)
        elif pd.api.types.is_datetime64_any_dtype(s):
            if s.isna().any():
                work[col] = s.astype(object).where(s.notna(), None)
        else:
            # Object/string column: replace any NaN/NaT/inf float sentinels cleanly.
            vals = s.tolist()
            changed = False
            cleaned = []
            for v in vals:
                if v is None or isinstance(v, (str, int, bool)):
                    cleaned.append(v)
                elif isinstance(v, float):
                    if math.isnan(v) or math.isinf(v):
                        cleaned.append(None)
                        changed = True
                    else:
                        cleaned.append(v)
                else:
                    try:
                        if pd.isna(v):
                            cleaned.append(None)
                            changed = True
                        else:
                            cleaned.append(v)
                    except (TypeError, ValueError):
                        cleaned.append(v)
            if changed:
                work[col] = cleaned

    return cols, work.to_dict(orient="records")


def get_cached_scenario_log(sig: Any, loader: Callable[[], pd.DataFrame]) -> pd.DataFrame:
    """Return mtime-cached scenario log DataFrame."""
    if sig is None:
        return loader()
    epoch = get_write_epoch("scenario_log")
    key = ("scenario_log", sig, epoch)
    cached = _SCENARIO_LOG_LRU.get(key)
    if cached is not None:
        return cached.copy()
    df = loader()
    _SCENARIO_LOG_LRU.put(key, df)
    return df.copy()


def get_cached_input_table(sig: Any, category_key: str, option_name: str, loader: Callable[[], dict[str, Any]]) -> dict[str, Any]:
    """Return mtime-cached input table response."""
    if sig is None:
        return loader()
    epoch = get_write_epoch("input_tables")
    key = ("input_table", sig, epoch, category_key, option_name)
    cached = _INPUT_TABLE_LRU.get(key)
    if cached is not None:
        return cached
    res = loader()
    if res.get("success"):
        _INPUT_TABLE_LRU.put(key, res)
    return res


def get_cached_calc_module(
    sig: Any,
    module_key: str,
    scenario_id: Optional[str],
    max_preview_rows: int,
    loader: Callable[[], dict[str, Any]],
) -> dict[str, Any]:
    """Return mtime-cached calculation module payload (RAM + disk preview cache)."""
    ns = f"subcalc:{module_key}"
    if sig is None:
        return loader()
    epoch = get_write_epoch(ns)
    key = (ns, sig, epoch, scenario_id, max_preview_rows)
    cached = _CALC_MODULE_LRU.get(key)
    if cached is not None:
        return cached
    disk_path = _CACHE_DIR / "calc_preview" / f"{_sig_hash('calc_preview', (module_key, sig, scenario_id, max_preview_rows))}.pkl"
    if disk_path.exists():
        try:
            res = _read_pickle(disk_path)
            if isinstance(res, dict) and res.get("success"):
                _CALC_MODULE_LRU.put(key, res)
                return res
        except Exception:
            pass
    res = loader()
    if res.get("success"):
        _CALC_MODULE_LRU.put(key, res)
        try:
            _write_pickle(disk_path, res)
        except Exception:
            pass
    return res
