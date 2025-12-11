import sys, json, os
import pandas as pd
from joblib import load

MODEL_PATH = os.path.join(os.path.dirname(__file__), "rf_model_lead.pkl")
model = load(MODEL_PATH)

numeric_features = [
    'age','duration','campaign','pdays','previous',
    'emp.var.rate','cons.price.idx','cons.conf.idx','euribor3m','nr.employed'
]
categorical_features = [
    'job','marital','education','default','housing',
    'loan','contact','month','poutcome'
]
all_features = numeric_features + categorical_features

def main():

    try:
        input_data = json.loads(sys.stdin.read())
    except Exception as e:
        print(json.dumps({"error": f"Invalid input JSON: {str(e)}"}))
        return

    df = pd.DataFrame([input_data])

    for col in all_features:
        if col not in df.columns:
            df[col] = 0 if col in numeric_features else "unknown"

    try:
        prediction = model.predict(df)
        prediction_proba = model.predict_proba(df)[:, 1]
    except Exception as e:
        print(json.dumps({"error": f"Prediction failed: {str(e)}"}))
        return

    lead_score = int(round(prediction_proba[0] * 100))

    result = {
        "lead_score": lead_score,  
        "probability": float(prediction_proba[0]),
        "status_kampanye": "call needed" if prediction[0] == 1 else "no call",
        "aktivitas": ["telepon"] if prediction[0] == 1 else [],
        "subscription_status": "subscribed" if prediction[0] == 1 else "not subscribed"
    }
    print(json.dumps(result))

if __name__ == "__main__":
    main()
