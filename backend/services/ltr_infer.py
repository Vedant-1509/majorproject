# """
# ltr_infer.py
# ------------
# Called by Node.js as a child process.
# Reads a JSON feature matrix from stdin, returns scores as JSON to stdout.

# Usage (internal — do not call directly):
#   echo '<json>' | python ltr_infer.py /path/to/xgb_ltr_model.json
# """

# import sys
# import json
# import numpy as np
# import xgboost as xgb

# FEATURE_COLS = [
#     "semanticScore",
#     "locationScore",
#     "categoryScore",
#     "urgencyScore",
#     "monetary",
#     "goods",
#     "volunteer",
# ]

# def main():
#     if len(sys.argv) < 2:
#         print(json.dumps({"error": "Model path argument missing"}))
#         sys.exit(1)

#     model_path = sys.argv[1]

#     # Read feature matrix from stdin
#     raw = sys.stdin.read().strip()
#     if not raw:
#         print(json.dumps({"error": "No input received on stdin"}))
#         sys.exit(1)

#     try:
#         payload = json.loads(raw)          # list of feature dicts
#     except json.JSONDecodeError as e:
#         print(json.dumps({"error": f"JSON parse error: {e}"}))
#         sys.exit(1)

#     # Build numpy matrix in the exact column order used during training
#     try:
#         matrix = np.array(
#             [[row.get(f, 0) for f in FEATURE_COLS] for row in payload],
#             dtype=np.float32,
#         )
#     except Exception as e:
#         print(json.dumps({"error": f"Matrix build error: {e}"}))
#         sys.exit(1)

#     # Load model and predict
#     try:
#         model  = xgb.Booster()
#         model.load_model(model_path)
#         dmat   = xgb.DMatrix(matrix, feature_names=FEATURE_COLS)
#         scores = model.predict(dmat).tolist()
#     except Exception as e:
#         print(json.dumps({"error": f"Model inference error: {e}"}))
#         sys.exit(1)

#     # Return scores to Node
#     print(json.dumps({"scores": scores}))

# if __name__ == "__main__":
#     main()


"""
ltr_infer.py
------------
Called by Node.js as a child process.
Reads a JSON feature matrix from stdin, returns scores as JSON to stdout.
All errors are written to stderr AND returned as JSON so Node can surface them.
"""

import sys
import json
import traceback

def main():
    # ── Step 1: args ─────────────────────────────────────────────────────
    if len(sys.argv) < 2:
        msg = "Model path argument missing. Expected: python ltr_infer.py <model_path>"
        print(json.dumps({"error": msg}), flush=True)
        sys.stderr.write(msg + "\n")
        sys.exit(1)

    model_path = sys.argv[1]
    sys.stderr.write(f"[ltr_infer] model_path={model_path}\n")
    sys.stderr.flush()

    # ── Step 2: imports (deferred so import errors surface clearly) ───────
    try:
        import numpy as np
        sys.stderr.write(f"[ltr_infer] numpy OK ({np.__version__})\n")
    except ImportError as e:
        msg = f"numpy import failed: {e}"
        print(json.dumps({"error": msg}), flush=True)
        sys.stderr.write(msg + "\n")
        sys.exit(1)

    try:
        import xgboost as xgb
        sys.stderr.write(f"[ltr_infer] xgboost OK ({xgb.__version__})\n")
    except ImportError as e:
        msg = f"xgboost import failed: {e}"
        print(json.dumps({"error": msg}), flush=True)
        sys.stderr.write(msg + "\n")
        sys.exit(1)

    sys.stderr.flush()

    # ── Step 3: read stdin ────────────────────────────────────────────────
    try:
        raw = sys.stdin.read().strip()
        sys.stderr.write(f"[ltr_infer] stdin bytes={len(raw)}\n")
        sys.stderr.flush()
    except Exception as e:
        msg = f"stdin read failed: {e}"
        print(json.dumps({"error": msg}), flush=True)
        sys.stderr.write(msg + "\n")
        sys.exit(1)

    if not raw:
        msg = "No input received on stdin"
        print(json.dumps({"error": msg}), flush=True)
        sys.stderr.write(msg + "\n")
        sys.exit(1)

    # ── Step 4: parse JSON ────────────────────────────────────────────────
    try:
        payload = json.loads(raw)
        sys.stderr.write(f"[ltr_infer] parsed {len(payload)} rows\n")
        sys.stderr.flush()
    except json.JSONDecodeError as e:
        msg = f"JSON parse error: {e} | raw[:200]={raw[:200]}"
        print(json.dumps({"error": msg}), flush=True)
        sys.stderr.write(msg + "\n")
        sys.exit(1)

    # ── Step 5: build matrix ──────────────────────────────────────────────
    FEATURE_COLS = [
        "semanticScore",
        "locationScore",
        "categoryScore",
        "urgencyScore",
        "monetary",
        "goods",
        "volunteer",
    ]

    try:
        matrix = np.array(
            [[row.get(f, 0) for f in FEATURE_COLS] for row in payload],
            dtype=np.float32,
        )
        sys.stderr.write(f"[ltr_infer] matrix shape={matrix.shape}\n")
        sys.stderr.flush()
    except Exception as e:
        msg = f"Matrix build error: {e}\n{traceback.format_exc()}"
        print(json.dumps({"error": msg}), flush=True)
        sys.stderr.write(msg + "\n")
        sys.exit(1)

    # ── Step 6: load model ────────────────────────────────────────────────
    try:
        model = xgb.Booster()
        model.load_model(model_path)
        sys.stderr.write(f"[ltr_infer] model loaded OK\n")
        sys.stderr.flush()
    except Exception as e:
        msg = f"Model load error (path={model_path}): {e}\n{traceback.format_exc()}"
        print(json.dumps({"error": msg}), flush=True)
        sys.stderr.write(msg + "\n")
        sys.exit(1)

    # ── Step 7: predict ───────────────────────────────────────────────────
    try:
        dmat   = xgb.DMatrix(matrix, feature_names=FEATURE_COLS)
        scores = model.predict(dmat).tolist()
        sys.stderr.write(f"[ltr_infer] predicted {len(scores)} scores OK\n")
        sys.stderr.flush()
    except Exception as e:
        msg = f"Inference error: {e}\n{traceback.format_exc()}"
        print(json.dumps({"error": msg}), flush=True)
        sys.stderr.write(msg + "\n")
        sys.exit(1)

    # ── Step 8: return scores ─────────────────────────────────────────────
    print(json.dumps({"scores": scores}), flush=True)

if __name__ == "__main__":
    main()