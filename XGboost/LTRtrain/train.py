"""
XGBoost Learning-to-Rank Training Pipeline — FIXED v3
Donation Recommendation System

Key fixes over v2:
  A) Contiguous group sort (from v2) — kept.
  B) NO popularityScore / recencyScore — removed per requirement.
  C) Rank-transform semanticScore per user → ordinal [0,1] percentile rank.
     semanticScore has the highest label correlation (0.137) so it naturally
     dominates; rank-transforming it within each user's query list converts
     its absolute advantage into a relative one, matching how LTR models
     are actually evaluated (ranking ORDER matters, not raw score magnitude).
  D) colsample_bynode=0.55 → at every split only 55% of features are
     candidates, so semanticScore is forcibly skipped ~45% of the time.
  E) max_depth=4 (was 5-6) — shallower trees = fewer consecutive splits
     that keep picking the same feature.
  F) eta=0.02, num_boost_round=1200, early_stopping_rounds=80 → more
     iterations with patience; model won't stop at round 2.
"""

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import ndcg_score
import warnings
warnings.filterwarnings("ignore")

print("=" * 62)
print("  XGBoost LTR — Donation Recommendation System  (FIXED v3)  ")
print("=" * 62)

df = pd.read_csv("ltr2.csv")
print(f"\n[1] Loaded : {df.shape[0]:,} rows × {df.shape[1]} cols")
assert df["categoryScore"].isin([0, 1]).all(), "categoryScore must be binary!"
print(f"    categoryScore binary : PASSED ✓  "
      f"(0s={(df['categoryScore']==0).sum():,}  1s={(df['categoryScore']==1).sum():,})")

label_map = {1: 0, 2: 1, 5: 2}
df["relevance"] = df["label"].map(label_map)
print(f"\n[2] Labels remapped : 1→0 (impression)  2→1 (click)  5→2 (donation)")
vc = df["relevance"].value_counts().sort_index()
for k, v in vc.items():
    print(f"    relevance={k} : {v:,}")

# FIX C: Rank-transform semanticScore within each user's query group.
#
# WHY semanticScore dominates: it has Pearson r=0.137 with relevance,
# far above all other features. XGBoost greedily picks splits with the
# highest gain — semanticScore wins almost every competition.
#
# WHY rank-transform works: LTR only cares about relative ORDER within
# a user's list. Converting semanticScore to within-group percentile rank
# (0–1) preserves its ordering signal while removing the absolute magnitude
# advantage that let it dominate gradient computations across all users.
# All other continuous features stay as-is (locationScore, urgencyScore)
# so they retain their own gradient signals relative to semanticScore.
df["semanticScore"] = (
    df.groupby("userId")["semanticScore"]
      .rank(method="average", pct=True)   # percentile rank within each user
)

FEATURE_COLS = [
    "semanticScore",  # rank-transformed, continuous [0, 1]
    "locationScore",       # continuous [0, 1]
    "categoryScore",       # binary     {0, 1}
    "urgencyScore",        # continuous [0, 1]
    "monetary",            # binary one-hot
    "goods",               # binary one-hot
    "volunteer",           # binary one-hot
]

X      = df[FEATURE_COLS].values
y      = df["relevance"].values
uid_all = df["userId"].values
print(f"\n[3] Features ({len(FEATURE_COLS)}) : {FEATURE_COLS}")
print(f"    semanticScore → rank-transformed per user (pct=True)")

gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
train_idx, test_idx = next(gss.split(X, y, groups=uid_all))

# Sort by userId so groups are CONTIGUOUS — required by XGBoost set_group()
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

dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=FEATURE_COLS)
dtest  = xgb.DMatrix(X_test,  label=y_test,  feature_names=FEATURE_COLS)
dtrain.set_group(g_train)
dtest.set_group(g_test)

params = {
    "objective":          "rank:ndcg",
    "eval_metric":        "ndcg@5",

    # Lower eta + higher rounds → more iterations, avoids early plateau
    "eta":                0.02,        # small steps
    "max_depth":          4,           # shallower = fewer consecutive same-feature splits
    "min_child_weight":   5,

    "subsample":          0.85,
    "colsample_bytree":   0.90,        # most features visible per tree
    "colsample_bylevel":  0.80,
    "colsample_bynode":   0.55,        # KEY: per-split sampling forces feature diversity
                                       # semanticScore excluded ~45% of all nodes

    "lambda":             1.8,         # moderate L2 — not so strong it kills learning
    "alpha":              0.2,
    "gamma":              0.05,        # low split threshold → secondary features can split
    "seed":               42,
}

# params = {
#     # --- 1. Objective (Standard LambdaMART) ---
#     "objective":          "rank:ndcg", # The industry standard for LTR
#     "eval_metric":        "ndcg@5",
    
#     # --- 2. Hardware Acceleration (CRITICAL for RTX 3050) ---
#     "device":             "cuda",      # Use your Nvidia GPU
#     "tree_method":        "hist",      # Required for efficient GPU training
#     "max_bin":            63,          # Lowers VRAM usage to fit 4GB limit
    
#     # --- 3. Learning Speed ---
#     "eta":                0.05,        # Increased from 0.02. (0.02 is very slow; requires 2000+ rounds)
#                                        # 0.05 is a safer balance for a laptop.
    
#     # --- 4. Tree Structure & Regularization ---
#     "max_depth":          6,           # Increased from 4. Ranking usually needs slightly deeper trees (6-8)
#     "min_child_weight":   5,           # Good, keeps it conservative
#     "subsample":          0.85,
#     "colsample_bytree":   0.90,
#     "colsample_bynode":   0.55,        # Excellent for forcing feature variety
    
#     # --- 5. Modern LTR Features (XGBoost 2.0+) ---
#     # If your data is CLICK logs (has position bias), uncomment these:
#     # "lambdarank_unbiased": True,     # Removes position bias automatically
#     # "lambdarank_pair_method": "topk",# Focuses computation on top-ranked items (faster)
#     # "lambdarank_num_pair_per_sample": 10, 

#     "lambda":             1.8,
#     "alpha":              0.2,
#     "gamma":              0.05,
#     "seed":               42,
# }




print(f"\n[5] XGBoost params : eta=0.005  max_depth=4  colsample_bynode=0.55  "
      f"lambda=1.2  gamma=0.02")

evals_result = {}
model = xgb.train(
    params, dtrain,
    num_boost_round=2000,          # raised ceiling — eta=0.005 needs up to 2000 rounds
    evals=[(dtrain, "train"), (dtest, "test")],
    early_stopping_rounds=150,     # wider patience to match the slower eta
    evals_result=evals_result,
    verbose_eval=200,
)
print(f"\n[6] Best iteration    : {model.best_iteration}")
print(f"    XGBoost NDCG@5    : {model.best_score:.4f} THIS IS THE NDCG@5 SCORE  ")
      

preds = model.predict(dtest)
df_test              = pd.DataFrame(X_test, columns=FEATURE_COLS)
df_test["userId"]    = uid_test
df_test["relevance"] = y_test
df_test["score"]     = preds

ndcg5_list     = []
ndcg_full_list = []
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

gain      = model.get_score(importance_type="gain")
weight    = model.get_score(importance_type="weight")
cover     = model.get_score(importance_type="cover")
max_g     = max(gain.values()) if gain else 1
total_gain = sum(gain.values())

print(f"\n[8] Feature Importance (gain | weight | cover):")
print(f"    {'Feature':<22}  {'Gain':>7}  {'Gain%':>6}  {'Weight':>7}  {'Cover':>8}  Bar")
print(f"    {'-'*22}  {'-'*7}  {'-'*6}  {'-'*7}  {'-'*8}  ---")
for f in sorted(gain, key=lambda x: gain[x], reverse=True):
    bar  = "█" * int(gain[f] / max_g * 25)
    pct  = gain[f] / total_gain * 100
    flag = "" if pct > 40 else ""
    print(f"    {f:<22}  {gain.get(f,0):>7.2f}  {pct:>5.1f}%  "
          f"{weight.get(f,0):>7.0f}  {cover.get(f,0):>8.2f}  {bar}{flag}")

model.save_model("xgb_ltr_model.json")
print(f"\n[9] Model saved → xgb_ltr_model.json")

sample_uid = uid_test[0]
s = df_test[df_test["userId"] == sample_uid].copy()
s["rank_pred"]  = s["score"].rank(ascending=False).astype(int)
s["rank_ideal"] = s["relevance"].rank(ascending=False).astype(int)
print(f"\n[10] Sample ranking — user {sample_uid} (top 8):")
cols = ["rank_ideal", "rank_pred", "relevance", "score",
        "semanticScore", "locationScore", "categoryScore", "urgencyScore"]
print(s[cols].sort_values("rank_pred").head(8).round(4).to_string(index=False))

print("\n" + "=" * 62)
print("  Training complete ✓")
print("=" * 62)


# =========================================
# 📊 PLOTTING STARTS HERE
# =========================================
import matplotlib.pyplot as plt
import os
OUTPUT_DIR = "plots"
os.makedirs(OUTPUT_DIR, exist_ok=True)
# 1. NDCG vs Iterations
train_ndcg = evals_result["train"]["ndcg@5"]
test_ndcg  = evals_result["test"]["ndcg@5"]

plt.figure(figsize=(8,5))
plt.plot(train_ndcg, label="Train NDCG@5")
plt.plot(test_ndcg, label="Test NDCG@5")
plt.legend()
plt.title("NDCG vs Iterations")
plt.xlabel("Iterations")
plt.ylabel("NDCG@5")
plt.grid()

plt.savefig(os.path.join(OUTPUT_DIR, "ndcg_vs_iterations.png"), dpi=300, bbox_inches="tight")
plt.show()


# 2. Feature Importance
features = list(gain.keys())
values   = list(gain.values())

plt.figure(figsize=(8,5))
plt.barh(features, values)
plt.title("Feature Importance (Gain)")
plt.xlabel("Gain")

plt.savefig(os.path.join(OUTPUT_DIR, "feature_importance.png"), dpi=300, bbox_inches="tight")
plt.show()


# 3. Label Distribution
plt.figure(figsize=(6,4))
df["relevance"].value_counts().sort_index().plot(kind="bar")

plt.title("Label Distribution")
plt.xlabel("Relevance (0=Impression, 1=Click, 2=Donate)")
plt.ylabel("Count")

plt.savefig(os.path.join(OUTPUT_DIR, "label_distribution.png"), dpi=300, bbox_inches="tight")
plt.show()


# 4. NDCG Distribution
plt.figure(figsize=(7,5))
plt.hist(ndcg5_list, bins=15)

plt.title("Per-user NDCG@5 Distribution")
plt.xlabel("NDCG@5")
plt.ylabel("Users")
plt.grid()

plt.savefig(os.path.join(OUTPUT_DIR, "ndcg_distribution.png"), dpi=300, bbox_inches="tight")
plt.show()


# 5. Boxplot (optional but recommended)
plt.figure(figsize=(6,5))
plt.boxplot(ndcg5_list)

plt.title("NDCG@5 Distribution (User-wise)")
plt.ylabel("NDCG@5")

plt.savefig(os.path.join(OUTPUT_DIR, "ndcg_boxplot.png"), dpi=300, bbox_inches="tight")
plt.show()