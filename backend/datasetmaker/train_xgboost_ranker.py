import argparse
import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import ndcg_score
from xgboost import XGBRanker


FEATURES = [
    "semanticScore",
    "locationScore",
    "categoryScore",
    "monetary",
    "goods",
    "volunteer",
]


def group_sizes(frame: pd.DataFrame):
    return frame.groupby("queryId").size().tolist()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default=os.path.join("datasetmaker", "synthetic_rank_dataset.csv"))
    parser.add_argument("--model-out", default=os.path.join("datasetmaker", "xgb_ranker.joblib"))
    args = parser.parse_args()

    df = pd.read_csv(args.csv)
    df = df.sort_values(["queryId", "label"], ascending=[True, False]).reset_index(drop=True)

    train_queries, test_queries = train_test_split(
        df["queryId"].unique(),
        test_size=0.2,
        random_state=42,
    )

    train_df = df[df["queryId"].isin(train_queries)].copy()
    test_df = df[df["queryId"].isin(test_queries)].copy()

    X_train = train_df[FEATURES]
    y_train = train_df["label"]
    X_test = test_df[FEATURES]
    y_test = test_df["label"]

    model = XGBRanker(
        objective="rank:pairwise",
        n_estimators=400,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        random_state=42,
    )

    model.fit(
        X_train,
        y_train,
        group=group_sizes(train_df),
        eval_set=[(X_test, y_test)],
        eval_group=[group_sizes(test_df)],
        verbose=False,
    )

    preds = model.predict(X_test)

    ndcg = ndcg_score(
        [y_test.to_numpy()],
        [preds],
        k=min(10, len(y_test)),
    )

    print(f"NDCG@10: {ndcg:.4f}")
    joblib.dump(model, args.model_out)
    print(f"Saved model to {args.model_out}")


if __name__ == "__main__":
    main()
