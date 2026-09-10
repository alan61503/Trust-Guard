import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import json
import joblib
import pandas as pd
from urllib.parse import urlparse
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from ml.feature_extractor import extract_features

base_dir = r'c:\btech\development\Trust-Guard'
raw_csv = os.path.join(base_dir, 'ml', 'dataset', 'raw', 'phiusill dataset', 'PhiUSIIL_Phishing_URL_Dataset.csv')
urls_csv = os.path.join(base_dir, 'ml', 'dataset', 'urls.csv')
features_csv = os.path.join(base_dir, 'ml', 'dataset', 'processed_features.csv')
model_dir = os.path.join(base_dir, 'ml', 'model')
results_dir = os.path.join(base_dir, 'ml', 'results')
os.makedirs(model_dir, exist_ok=True)
os.makedirs(results_dir, exist_ok=True)

# Load raw data
df = pd.read_csv(raw_csv, low_memory=False)
url_col = [c for c in df.columns if c.lower() == 'url'][0]
label_col = [c for c in df.columns if c.lower() == 'label'][0]
# Convert original label to TrustGuard convention (0=legitimate,1=phishing)
trustguard_labels = 1 - df[label_col].astype(int)
urls_df = pd.DataFrame({'url': df[url_col], 'label': trustguard_labels})
urls_df.to_csv(urls_csv, index=False)

# Extract features
features = [extract_features(u) for u in urls_df['url']]
features_df = pd.DataFrame(features)
features_df['label'] = trustguard_labels.values
features_df.to_csv(features_csv, index=False)

# Feature order
feature_order = [
    'url_length', 'hostname_length', 'path_length', 'num_dots', 'num_subdomains',
    'num_hyphens', 'num_digits', 'num_special_chars', 'has_https', 'has_ip',
    'has_at_symbol', 'has_punycode', 'has_encoded_chars', 'path_depth',
    'suspicious_term_count'
]
with open(os.path.join(model_dir, 'feature_order.json'), 'w') as f:
    json.dump(feature_order, f, indent=2)

X = features_df[feature_order].values
y = features_df['label'].values

# Random stratified split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
rf = RandomForestClassifier(n_estimators=300, random_state=42, class_weight='balanced', n_jobs=-1)
rf.fit(X_train, y_train)

y_pred = rf.predict(X_test)
metrics_random = {
    'train_samples': int(len(y_train)),
    'test_samples': int(len(y_test)),
    'accuracy': accuracy_score(y_test, y_pred),
    'precision': precision_score(y_test, y_pred),
    'recall': recall_score(y_test, y_pred),
    'f1': f1_score(y_test, y_pred),
    'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
    'phishing_precision': precision_score(y_test, y_pred, pos_label=1),
    'phishing_recall': recall_score(y_test, y_pred, pos_label=1),
    'phishing_f1': f1_score(y_test, y_pred, pos_label=1)
}

# Domain-aware split
import numpy as np
# Domain-aware split without external fetch
registrable = []
for u in urls_df['url']:
    hostname = urlparse(u).hostname or ''
    parts = hostname.split('.')
    if len(parts) >= 2:
        registrable.append('.'.join(parts[-2:]))
    else:
        registrable.append(hostname)
urls_df['registrable'] = registrable
unique_domains = list(urls_df['registrable'].unique())
np.random.seed(42)
np.random.shuffle(unique_domains)
train_domains = set(unique_domains[:int(0.8*len(unique_domains))])
mask_train = urls_df['registrable'].isin(train_domains)
X_train_dom = X[mask_train]
y_train_dom = y[mask_train]
X_test_dom = X[~mask_train]
y_test_dom = y[~mask_train]
rf_dom = RandomForestClassifier(n_estimators=300, random_state=42, class_weight='balanced', n_jobs=-1)
rf_dom.fit(X_train_dom, y_train_dom)
y_pred_dom = rf_dom.predict(X_test_dom)
metrics_domain = {
    'train_samples': int(len(y_train_dom)),
    'test_samples': int(len(y_test_dom)),
    'accuracy': accuracy_score(y_test_dom, y_pred_dom),
    'precision': precision_score(y_test_dom, y_pred_dom),
    'recall': recall_score(y_test_dom, y_pred_dom),
    'f1': f1_score(y_test_dom, y_pred_dom),
    'confusion_matrix': confusion_matrix(y_test_dom, y_pred_dom).tolist(),
    'phishing_precision': precision_score(y_test_dom, y_pred_dom, pos_label=1),
    'phishing_recall': recall_score(y_test_dom, y_pred_dom, pos_label=1),
    'phishing_f1': f1_score(y_test_dom, y_pred_dom, pos_label=1),
    'registrable_overlap': bool(
        set(urls_df[mask_train]['registrable']).intersection(
            set(urls_df[~mask_train]['registrable'])
        )
    ),
}

# Save model
model_path = os.path.join(model_dir, 'trustguard_model.pkl')
joblib.dump(rf, model_path)

# Save metrics
with open(os.path.join(results_dir, 'random_split_evaluation.json'), 'w') as f:
    json.dump(metrics_random, f, indent=2)
with open(os.path.join(results_dir, 'domain_split_evaluation.json'), 'w') as f:
    json.dump(metrics_domain, f, indent=2)

print('Training complete')
