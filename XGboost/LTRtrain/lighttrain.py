
"""
LightGBM Learning-to-Rank Training Pipeline — v2 (Feature Balanced)
Donation Recommendation System
Comparative study against XGBoost LTR v3

v2 change over v1 — semanticScore dominance fix:
──────────────────────────────────────────────────
ROOT CAUSE: semanticScore has the highest Pearson correlation with relevance
(~0.137). Even after per-user rank-transform, it wins almost every split
competition in a leaf-wise tree because LightGBM's histogram algorithm
evaluates all features at each leaf expansion and greedily picks the best.

THREE LEVERS applied (all independent, non-collapsing):

  LEVER 1 — feature_fraction_bynode=0.30  (PRIMARY, structural)
    At each individual node expansion, only 30% of features are candidates
    (~2.1 of 7). semanticScore is forcibly absent from ~70% of all node
    splits. This mirrors XGBoost's colsample_bynode=0.30 exactly.
    LightGBM exposes this as feature_fraction_bynode (≥ v3.1.0).
    NOTE: feature_fraction (per-tree) is kept at 0.90 — lowering both
    simultaneously over-restricts and can collapse training.

  LEVER 2 — feature_fraction=0.90 (per-tree, relaxed)
    Keep per-tree sampling high so every tree CAN use semanticScore,
    but node-level sampling (lever 1) controls actual frequency.

  LEVER 3 — extra_trees=True  (randomization boost)
    Instead of finding the optimal threshold for each feature at each split,
    LightGBM draws random thresholds. This reduces the gain advantage of
    high-correlation features like semanticScore (which wins partly because
    it always has a near-optimal threshold). Extra trees mode spreads gain
    more evenly across all features.
    Trade-off: slight NDCG reduction (~0.01–0.02) in exchange for balance.
    If NDCG drops below 0.60, remove this lever first.

  NOT USED — feature_pre_filter=False + custom feature weights
    LightGBM does not expose a feature_weights parameter analogous to
    XGBoost's DMatrix(feature_weights=...). The closest proxy is
    extra_trees + feature_fraction_bynode, which achieves the same effect
    structurally rather than via weight penalties.

All v1 settings retained:
  learning_rate=0.02, num_leaves=31, max_depth=4, bagging_fraction=0.85,
  lambda_l2=1.8, lambda_l1=0.2, min_gain_to_split=0.05, early_stopping=150
"""

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import ndcg_score
import matplotlib.pyplot as plt
import warnings, os
warnings.filterwarnings("ignore")

print("=" * 66)
print("  LightGBM LTR v2 — Feature Balanced (semanticScore fix)")
print("=" * 66)

# ── 1. Load ───────────────────────────────────────────────────────────────────
df = pd.read_csv("ltr2.csv")
print(f"\n[1] Loaded : {df.shape[0]:,} rows × {df.shape[1]} cols")
assert df["categoryScore"].isin([0, 1]).all(), "categoryScore must be binary!"
print(f"    categoryScore binary : PASSED ✓  "
      f"(0s={(df['categoryScore']==0).sum():,}  1s={(df['categoryScore']==1).sum():,})")

# ── 2. Label remap ─────────────────────────────────────────────────────────────
# Identical to XGBoost v3: 1→0 (impression), 2→1 (click), 5→2 (donation)
label_map = {1: 0, 2: 1, 5: 2}
df["relevance"] = df["label"].map(label_map)
print(f"\n[2] Labels remapped : 1→0 (impression)  2→1 (click)  5→2 (donation)")
for k, v in df["relevance"].value_counts().sort_index().items():
    print(f"    relevance={k} : {v:,}")

# ── 3. Feature engineering ─────────────────────────────────────────────────────
# Identical rank-transform as XGBoost v3 — percentile rank within each user.
# Converts semanticScore's absolute magnitude advantage into a relative signal.
df["semanticScore"] = (
    df.groupby("userId")["semanticScore"]
      .rank(method="average", pct=True)
)

FEATURE_COLS = [
    "semanticScore",   # rank-transformed [0, 1]
    "locationScore",   # continuous [0, 1]
    "categoryScore",   # binary {0, 1}
    "urgencyScore",    # continuous [0, 1]
    "monetary",        # binary one-hot
    "goods",           # binary one-hot
    "volunteer",       # binary one-hot
]

X       = df[FEATURE_COLS].values
y       = df["relevance"].values
uid_all = df["userId"].values
print(f"\n[3] Features ({len(FEATURE_COLS)}) : {FEATURE_COLS}")
print(f"    semanticScore → rank-transformed per user (pct=True)")

# ── 4. Split ──────────────────────────────────────────────────────────────────
# Identical split as XGBoost v3 — same seed ensures same users in train/test.
gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
train_idx, test_idx = next(gss.split(X, y, groups=uid_all))

# Sort by userId so groups are CONTIGUOUS — required by LightGBM group array.
train_idx = train_idx[np.argsort(uid_all[train_idx])]
test_idx  = test_idx[np.argsort(uid_all[test_idx])]

X_train, X_test = X[train_idx], X[test_idx]
y_train, y_test = y[train_idx], y[test_idx]
uid_train       = uid_all[train_idx]
uid_test        = uid_all[test_idx]

def make_group_sizes(uid_array):
    """Count contiguous runs — valid only after sorting by userId."""
    sizes = []
    prev, count = uid_array[0], 0
    for uid in uid_array:
        if uid == prev:
            count += 1
        else:
            sizes.append(count)
            prev, count = uid, 1
    sizes.append(count)
    return sizes

g_train = make_group_sizes(uid_train)
g_test  = make_group_sizes(uid_test)
print(f"\n[4] Split (GroupShuffleSplit + userId sort for contiguous groups):")
print(f"    Train : {X_train.shape[0]:,} rows | {len(g_train)} users")
print(f"    Test  : {X_test.shape[0]:,} rows  | {len(g_test)} users")

# ── 5. LightGBM Dataset ───────────────────────────────────────────────────────
# LightGBM uses lgb.Dataset with group= (list of group sizes), not set_group().
# categorical_feature marks categoryScore as categorical so LGBM handles
# it with its native histogram splits (more efficient than treating as float).
dtrain = lgb.Dataset(
    X_train, label=y_train,
    feature_name=FEATURE_COLS,
    group=g_train,
    categorical_feature=[2],   # index of categoryScore in FEATURE_COLS
    free_raw_data=False,
)
dtest = lgb.Dataset(
    X_test, label=y_test,
    feature_name=FEATURE_COLS,
    group=g_test,
    categorical_feature=[2],
    reference=dtrain,          # must reference train dataset for consistent binning
    free_raw_data=False,
)

# ── 6. Parameters ─────────────────────────────────────────────────────────────
# v2 BALANCING LEVERS — see docstring at top for full rationale.
#
# KEY CHANGE: feature_fraction_bynode=0.30
#   At every node expansion, only 30% of features (~2.1 of 7) are candidates.
#   semanticScore is absent from ~70% of all splits — identical in effect to
#   XGBoost's colsample_bynode=0.30 which solved the same problem there.
#   This is the primary structural lever. Do NOT simultaneously lower
#   feature_fraction (per-tree) below 0.80 — combined restriction collapses
#   leaf expansions in leaf-wise trees faster than depth-wise trees.
#
# KEY CHANGE: extra_trees=True
#   Splits use random thresholds instead of optimal thresholds. semanticScore
#   wins partly because its optimal threshold is always available; random
#   thresholds level the playing field and spread gain across all features.
#   If NDCG@5 drops below 0.60 → set extra_trees=False first.
#
# UNCHANGED from v1: all regularization, depth, bagging, LR settings.

params = {
    "objective":              "lambdarank",
    "metric":                 "ndcg",
    "ndcg_eval_at":           [5],        # eval NDCG@5
    "label_gain":             [0, 1, 3],  # 2^rel-1 gain formula for grades 0,1,2

    "learning_rate":          0.02,       # same as XGBoost v3 eta=0.02
    "num_leaves":             31,         # leaf-wise; ~comparable to max_depth=4
    "max_depth":              4,          # hard depth cap

    "min_child_samples":      20,         # min samples per leaf

    # ── BALANCING LEVERS (v2) ──────────────────────────────────────────────
    "feature_fraction":       0.90,       # per-TREE: keep high — node-level does the work
    "feature_fraction_bynode": 0.30,      # per-NODE: ~2.1/7 features → semanticScore
                                          # excluded ~70% of splits (PRIMARY LEVER)
    "extra_trees":            True,       # random split thresholds → reduces high-corr
                                          # feature's threshold advantage (SECONDARY LEVER)
    # ──────────────────────────────────────────────────────────────────────

    "bagging_fraction":       0.85,       # row subsampling
    "bagging_freq":           1,          # enable bagging every round

    "lambda_l2":              1.8,        # L2 regularization
    "lambda_l1":              0.2,        # L1 regularization
    "min_gain_to_split":      0.05,       # minimum split gain

    "verbose":                -1,
    "seed":                   42,
    "n_jobs":                 -1,
}

print(f"\n[5] LightGBM v2 params (feature balance levers):")
print(f"    feature_fraction_bynode = 0.30  ← PRIMARY: ~70% node-exclusion for semanticScore")
print(f"    feature_fraction        = 0.90  ← per-tree kept high (node lever does the work)")
print(f"    extra_trees             = True  ← random thresholds reduce high-corr advantage")
print(f"    learning_rate=0.02  num_leaves=31  max_depth=4")
print(f"    bagging_fraction=0.85  lambda_l2=1.8  lambda_l1=0.2  min_gain=0.05")

# ── 7. Callbacks — early stopping + logging ────────────────────────────────────
# LightGBM uses callback objects instead of kwargs for early stopping.
# log_evaluation(100) prints metrics every 100 rounds (matches verbose_eval=200
# in XGBoost but at half the interval for better visibility).
callbacks = [
    lgb.early_stopping(stopping_rounds=150, verbose=True),
    lgb.log_evaluation(period=100),
]

# ── 8. Train ──────────────────────────────────────────────────────────────────
evals_result = {}   # will be populated by record_evaluation callback

model = lgb.train(
    params,
    dtrain,
    num_boost_round = 2000,
    valid_sets      = [dtrain, dtest],
    valid_names     = ["train", "test"],
    callbacks       = callbacks + [lgb.record_evaluation(evals_result)],
)

best_iter  = model.best_iteration
best_score = model.best_score["test"]["ndcg@5"]

print(f"\n[6] Best iteration    : {best_iter}")
print(f"    LightGBM NDCG@5   : {best_score:.4f}  THIS IS THE NDCG@5 SCORE")

# ── 9. Per-user NDCG evaluation ───────────────────────────────────────────────
# Identical evaluation loop as XGBoost v3.
preds = model.predict(X_test, num_iteration=best_iter)

df_test              = pd.DataFrame(X_test, columns=FEATURE_COLS)
df_test["userId"]    = uid_test
df_test["relevance"] = y_test
df_test["score"]     = preds

ndcg5_list, ndcg_full_list = [], []
for uid, grp in df_test.groupby("userId"):
    if grp["relevance"].sum() == 0:
        continue
    rel = grp["relevance"].values.reshape(1, -1)
    sc  = grp["score"].values.reshape(1, -1)
    ndcg5_list.append(ndcg_score(rel, sc, k=5))
    ndcg_full_list.append(ndcg_score(rel, sc))

mean_ndcg5 = np.mean(ndcg5_list)
print(f"\n[7] sklearn per-user NDCG on test set ({len(g_test)} users):")
print(f"    NDCG@5 mean   : {mean_ndcg5:.4f}  "
      f"{'✓' if 0.60 <= mean_ndcg5 <= 0.70 else '⚠ outside target'}")
print(f"    NDCG@5 std    : {np.std(ndcg5_list):.4f}")
print(f"    NDCG@5 min    : {np.min(ndcg5_list):.4f}")
print(f"    NDCG@5 max    : {np.max(ndcg5_list):.4f}")
print(f"    NDCG full     : {np.mean(ndcg_full_list):.4f}  "
      f"<- full ranking always inflated vs @k, not the target metric")

# ── 10. Feature importance ─────────────────────────────────────────────────────
# LightGBM importance_type="gain" matches XGBoost importance_type="gain".
gain_vals  = model.feature_importance(importance_type="gain")
split_vals = model.feature_importance(importance_type="split")  # equiv to XGB weight
feat_names = model.feature_name()

total_gain = gain_vals.sum()
max_g      = gain_vals.max() if gain_vals.max() > 0 else 1

print(f"\n[8] Feature Importance (gain | split):")
print(f"    {'Feature':<22}  {'Gain':>10}  {'Gain%':>6}  {'Split':>7}  Bar")
print(f"    {'-'*22}  {'-'*10}  {'-'*6}  {'-'*7}  ---")
sorted_idx = np.argsort(gain_vals)[::-1]
for i in sorted_idx:
    f    = feat_names[i]
    g    = gain_vals[i]
    s    = split_vals[i]
    pct  = g / total_gain * 100 if total_gain > 0 else 0
    bar  = "█" * int(g / max_g * 25)
    flag = " ⚠ dominant" if pct > 35 else (" ✓" if pct >= 8 else "")
    print(f"    {f:<22}  {g:>10.2f}  {pct:>5.1f}%  {s:>7}  {bar}{flag}")

dominant = [feat_names[i] for i in range(len(feat_names))
            if (gain_vals[i] / total_gain * 100 if total_gain > 0 else 0) > 35]
if not dominant:
    print(f"\n    ✓ No feature exceeds 35% gain — importance balanced!")
else:
    print(f"       → Lower feature_fraction_bynode: 0.30 → 0.25")
    print(f"       → Confirm extra_trees=True is set")
    print(f"       → Do NOT lower feature_fraction (per-tree) below 0.80")

model.save_model("lgbm_ltr_v2_balanced.json", num_iteration=best_iter)
print(f"\n[9] Model saved → lgbm_ltr_v2_balanced.json")

# ── 11. Sample ranking ────────────────────────────────────────────────────────
sample_uid = uid_test[0]
s = df_test[df_test["userId"] == sample_uid].copy()
s["rank_pred"]  = s["score"].rank(ascending=False).astype(int)
s["rank_ideal"] = s["relevance"].rank(ascending=False).astype(int)
print(f"\n[10] Sample ranking — user {sample_uid} (top 8):")
cols = ["rank_ideal", "rank_pred", "relevance", "score",
        "semanticScore", "locationScore", "categoryScore", "urgencyScore"]
print(s[cols].sort_values("rank_pred").head(8).round(4).to_string(index=False))

print("\n" + "=" * 66)
print("  Training complete ✓")
print("=" * 66)

# ── 12. Plots ─────────────────────────────────────────────────────────────────
OUTPUT_DIR = "plots_lgbm_v2"
os.makedirs(OUTPUT_DIR, exist_ok=True)

train_ndcg = evals_result["train"]["ndcg@5"]
test_ndcg  = evals_result["test"]["ndcg@5"]

# ── COLORS (consistent palette) ───────────────────────────────────────────────
C_TRAIN  = "#185FA5"
C_TEST   = "#1D9E75"
C_BEST   = "#E24B4A"
C_HIST   = "#378ADD"
C_BOX    = "#B5D4F4"
C_LGBM   = "#1D9E75"
C_XGB    = "#E24B4A"

# 12a. NDCG@5 vs Iterations
fig, ax = plt.subplots(figsize=(9, 5))
ax.plot(train_ndcg, label="Train NDCG@5", color=C_TRAIN, linewidth=1.2)
ax.plot(test_ndcg,  label="Test NDCG@5",  color=C_TEST,  linewidth=1.2)
ax.axvline(best_iter, color=C_BEST, linestyle="--", alpha=0.8,
           label=f"Best iter {best_iter} (NDCG@5={best_score:.4f})")
ax.axhline(0.60, color="gray", linestyle=":", alpha=0.5, linewidth=1)
ax.axhline(0.70, color="gray", linestyle=":", alpha=0.5, linewidth=1)
n = len(train_ndcg)
ax.text(n * 0.98, 0.605, "target low 0.60",  ha="right", fontsize=8, color="gray")
ax.text(n * 0.98, 0.705, "target high 0.70", ha="right", fontsize=8, color="gray")
ax.legend()
ax.set_title("LightGBM LTR v2 — NDCG@5 vs Iterations")
ax.set_xlabel("Iterations")
ax.set_ylabel("NDCG@5")
ax.grid(True, alpha=0.35)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "ndcg_vs_iterations.png"), dpi=300, bbox_inches="tight")
plt.show()

# 12b. Feature importance (gain)
sorted_features = [feat_names[i] for i in sorted_idx]
sorted_gains    = [gain_vals[i]   for i in sorted_idx]
gain_pct        = [g / total_gain * 100 for g in sorted_gains]

fig, ax = plt.subplots(figsize=(9, 5))
bars = ax.barh(sorted_features[::-1], gain_pct[::-1], color=C_LGBM, alpha=0.85)
ax.axvline(35, color="gray", linestyle="--", alpha=0.6, linewidth=1.2,
           label="35% dominance threshold")
ax.set_xlabel("Gain %")
ax.set_title("LightGBM LTR v2 — Feature Importance (Gain %)")
ax.legend()
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "feature_importance.png"), dpi=300, bbox_inches="tight")
plt.show()

# 12c. Label distribution
fig, ax = plt.subplots(figsize=(6, 4))
df["relevance"].value_counts().sort_index().plot(kind="bar", ax=ax, color=C_HIST, edgecolor="white")
ax.set_title("Label Distribution")
ax.set_xlabel("Relevance (0=Impression, 1=Click, 2=Donate)")
ax.set_ylabel("Count")
ax.set_xticklabels(["0 – Impression", "1 – Click", "2 – Donation"], rotation=0)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "label_distribution.png"), dpi=300, bbox_inches="tight")
plt.show()

# 12d. Per-user NDCG@5 distribution
fig, ax = plt.subplots(figsize=(7, 5))
ax.hist(ndcg5_list, bins=15, color=C_HIST, edgecolor="white", alpha=0.85)
ax.axvline(mean_ndcg5, color=C_BEST, linestyle="--", label=f"Mean={mean_ndcg5:.3f}")
ax.axvspan(0.60, 0.70, alpha=0.08, color="green", label="Target zone 0.60–0.70")
ax.legend()
ax.set_title("LightGBM LTR v2 — Per-user NDCG@5 Distribution")
ax.set_xlabel("NDCG@5")
ax.set_ylabel("Users")
ax.grid(True, alpha=0.35)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "ndcg_distribution.png"), dpi=300, bbox_inches="tight")
plt.show()

# 12e. Boxplot
fig, ax = plt.subplots(figsize=(6, 5))
ax.boxplot(ndcg5_list, patch_artist=True,
           boxprops=dict(facecolor=C_BOX, color=C_TRAIN),
           medianprops=dict(color=C_BEST, linewidth=2))
ax.axhline(0.60, color="gray", linestyle=":", alpha=0.7)
ax.axhline(0.70, color="gray", linestyle=":", alpha=0.7)
ax.set_title("LightGBM LTR v2 — NDCG@5 (User-wise)")
ax.set_ylabel("NDCG@5")
ax.set_xticks([1])
ax.set_xticklabels(["Test users"])
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "ndcg_boxplot.png"), dpi=300, bbox_inches="tight")
plt.show()

# ── 13. COMPARATIVE STUDY: XGBoost v3 vs LightGBM v1 ─────────────────────────
# Paste your XGBoost v3 results here after running the XGBoost script.
# These are the reference numbers from XGBoost v3 for the comparison charts.
# ──────────────────────────────────────────────────────────────────────────────
XGB_NDCG5_MEAN = 0.6200   # ← REPLACE with your actual XGBoost NDCG@5 mean
XGB_NDCG5_STD  = 0.1904   # ← REPLACE with your actual XGBoost NDCG@5 std
XGB_BEST_ITER  = 482      # ← REPLACE with your actual XGBoost best_iteration

LGBM_NDCG5_MEAN = mean_ndcg5
LGBM_NDCG5_STD  = float(np.std(ndcg5_list))
LGBM_BEST_ITER  = best_iter

# XGBoost v3 feature gain percentages (paste from your v3 run output):
XGB_FEAT_GAIN_PCT = {
    "semanticScore":  28.9,   # ← REPLACE with actual
    "urgencyScore":   20.1,
    "locationScore":  12.7,
    "categoryScore":  12.1,
    "monetary":        10.3,
    "volunteer":        10.2,
    "goods":            5.7,
}

LGBM_FEAT_GAIN_PCT = {
    feat_names[i]: gain_vals[i] / total_gain * 100 for i in range(len(feat_names))
}

print("\n" + "=" * 62)
print("  COMPARATIVE STUDY — XGBoost v3 vs LightGBM v2")
print("=" * 62)
print(f"  {'Metric':<30}  {'XGBoost v3':>12}  {'LightGBM v2':>12}")
print(f"  {'-'*30}  {'-'*12}  {'-'*12}")
print(f"  {'NDCG@5 Mean':<30}  {XGB_NDCG5_MEAN:>12.4f}  {LGBM_NDCG5_MEAN:>12.4f}")
print(f"  {'NDCG@5 Std':<30}  {XGB_NDCG5_STD:>12.4f}  {LGBM_NDCG5_STD:>12.4f}")
print(f"  {'Best Iteration':<30}  {XGB_BEST_ITER:>12}  {LGBM_BEST_ITER:>12}")
winner_ndcg = "XGBoost v3" if XGB_NDCG5_MEAN > LGBM_NDCG5_MEAN else "LightGBM v2"
print(f"\n  → Higher NDCG@5 : {winner_ndcg}")
winner_iter = "XGBoost v3" if XGB_BEST_ITER > LGBM_BEST_ITER else "LightGBM v2"
print(f"  → More iterations (less early stop) : {winner_iter}")

# 13a. NDCG@5 Mean ± Std bar chart
fig, ax = plt.subplots(figsize=(7, 5))
models     = ["XGBoost v3", "LightGBM v2"]
means      = [XGB_NDCG5_MEAN, LGBM_NDCG5_MEAN]
stds       = [XGB_NDCG5_STD,  LGBM_NDCG5_STD]
colors     = [C_XGB, C_LGBM]
bars = ax.bar(models, means, yerr=stds, color=colors, alpha=0.85,
              capsize=8, edgecolor="white", linewidth=1.2)
ax.axhline(0.60, color="gray", linestyle=":", alpha=0.6, label="Target low 0.60")
ax.axhline(0.70, color="gray", linestyle=":",  alpha=0.6, label="Target high 0.70")
for bar, mean in zip(bars, means):
    ax.text(bar.get_x() + bar.get_width() / 2, mean + 0.005,
            f"{mean:.4f}", ha="center", va="bottom", fontsize=11, fontweight="bold")
ax.set_ylim(0, max(means) + max(stds) + 0.08)
ax.set_ylabel("NDCG@5")
ax.set_title("Comparative Study — NDCG@5 Mean ± Std")
ax.legend()
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "comparison_ndcg5_bar.png"), dpi=300, bbox_inches="tight")
plt.show()

# 13b. Best iteration comparison
fig, ax = plt.subplots(figsize=(7, 4))
bars = ax.bar(models, [XGB_BEST_ITER, LGBM_BEST_ITER], color=colors,
              alpha=0.85, edgecolor="white")
for bar, val in zip(bars, [XGB_BEST_ITER, LGBM_BEST_ITER]):
    ax.text(bar.get_x() + bar.get_width() / 2, val + 5,
            str(val), ha="center", va="bottom", fontsize=11, fontweight="bold")
ax.set_ylabel("Best Iteration")
ax.set_title("Comparative Study — Best Iteration (Early Stopping)")
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "comparison_best_iter.png"), dpi=300, bbox_inches="tight")
plt.show()

# 13c. Feature gain % side-by-side
all_features    = FEATURE_COLS
xgb_pct_list    = [XGB_FEAT_GAIN_PCT.get(f, 0)  for f in all_features]
lgbm_pct_list   = [LGBM_FEAT_GAIN_PCT.get(f, 0) for f in all_features]

x  = np.arange(len(all_features))
w  = 0.38
fig, ax = plt.subplots(figsize=(12, 5))
ax.bar(x - w/2, xgb_pct_list,  w, label="XGBoost v3",  color=C_XGB,  alpha=0.85)
ax.bar(x + w/2, lgbm_pct_list, w, label="LightGBM v2", color=C_LGBM, alpha=0.85)
ax.axhline(40, color="gray", linestyle="--", alpha=0.6, linewidth=1.2,
           label="40% dominance threshold")
ax.set_xticks(x)
ax.set_xticklabels(all_features, rotation=20, ha="right", fontsize=10)
ax.set_ylabel("Gain %")
ax.set_title("Comparative Study — Feature Gain % (XGBoost v3 vs LightGBM v2)")
ax.legend()
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "comparison_feature_gain.png"), dpi=300, bbox_inches="tight")
plt.show()

print(f"\nAll plots saved to ./{OUTPUT_DIR}/")
print("  LightGBM v2 plots:")
print("    ndcg_vs_iterations.png")
print("    feature_importance.png        ← check semanticScore ≤ 35%")
print("    label_distribution.png")
print("    ndcg_distribution.png")
print("    ndcg_boxplot.png")
print("  Comparative plots:")
print("    comparison_ndcg5_bar.png    ← NDCG@5 mean ± std")
print("    comparison_best_iter.png    ← Best iteration")
print("    comparison_feature_gain.png ← Feature gain % side-by-side")
print()
print("Troubleshooting feature balance:")
print("  semanticScore still >35% → lower feature_fraction_bynode to 0.25")
print("  NDCG@5 < 0.60            → set extra_trees=False first, then")
print("                             raise feature_fraction_bynode to 0.35")
print("  DO NOT lower feature_fraction (per-tree) below 0.80")
print()
print("NOTE: Update XGB_NDCG5_MEAN, XGB_NDCG5_STD, XGB_BEST_ITER and")
print("      XGB_FEAT_GAIN_PCT near line ~220 with your actual XGBoost v3")
print("      output values for accurate comparative charts.")

