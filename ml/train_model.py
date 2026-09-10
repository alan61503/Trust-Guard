import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import json
import joblib
import pandas as pd
import numpy as np
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

# 1. Load raw dataset and preserve TrustGuard convention (0=legitimate, 1=phishing)
df = pd.read_csv(raw_csv, low_memory=False)
url_col = [c for c in df.columns if c.lower() == 'url'][0]
label_col = [c for c in df.columns if c.lower() == 'label'][0]
trustguard_labels = 1 - df[label_col].astype(int)

urls_df = pd.DataFrame({'url': df[url_col], 'label': trustguard_labels})
urls_df.to_csv(urls_csv, index=False)

# 2. Extract 15 features for all base dataset URLs
print('Extracting features for base dataset...')
features = [extract_features(u) for u in urls_df['url']]
features_df = pd.DataFrame(features)
features_df['label'] = trustguard_labels.values
features_df.to_csv(features_csv, index=False)

feature_order = [
    'url_length', 'hostname_length', 'path_length', 'num_dots', 'num_subdomains',
    'num_hyphens', 'num_digits', 'num_special_chars', 'has_https', 'has_ip',
    'has_at_symbol', 'has_punycode', 'has_encoded_chars', 'path_depth',
    'suspicious_term_count'
]
with open(os.path.join(model_dir, 'feature_order.json'), 'w') as f:
    json.dump(feature_order, f, indent=2)

X_base = features_df[feature_order].values
y_base = features_df['label'].values

# Common realistic benign paths for controlled augmentation
BENIGN_PATHS = [
    '/feed', '/feed/', '/home', '/home/', '/about', '/about/',
    '/contact', '/contact/', '/search', '/terms', '/privacy',
    '/help', '/products', '/services', '/news', '/blog', '/faq'
]

# 3. Domain-Aware Split (Grouping BEFORE legitimate-path augmentation to prevent data leakage)
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
train_domains = set(unique_domains[:int(0.8 * len(unique_domains))])
test_domains = set(unique_domains[int(0.8 * len(unique_domains)):])

mask_train_dom = urls_df['registrable'].isin(train_domains)

# Base domain train/test sets
X_train_dom_base = X_base[mask_train_dom]
y_train_dom_base = y_base[mask_train_dom]
X_test_dom = X_base[~mask_train_dom]
y_test_dom = y_base[~mask_train_dom]

# Controlled augmentation on legitimate training domains ONLY (no leakage to test)
train_legit_indices = urls_df[mask_train_dom & (urls_df['label'] == 0)].index
np.random.seed(42)
aug_sample_dom = np.random.choice(train_legit_indices, size=20000, replace=False)

aug_dom_features = []
for i, idx in enumerate(aug_sample_dom):
    base_u = urls_df.loc[idx, 'url'].rstrip('/')
    p = BENIGN_PATHS[i % len(BENIGN_PATHS)]
    f = extract_features(base_u + p)
    aug_dom_features.append([f[k] for k in feature_order])

X_train_dom = np.vstack([X_train_dom_base, np.array(aug_dom_features)])
y_train_dom = np.concatenate([y_train_dom_base, np.zeros(len(aug_dom_features), dtype=int)])

print('Fitting Domain-Aware RandomForest...')
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
        set(urls_df[mask_train_dom]['registrable']).intersection(
            set(urls_df[~mask_train_dom]['registrable'])
        )
    ),
}

# 4. Stratified Random Split Evaluation (80/20)
indices = np.arange(len(y_base))
train_idx_strat, test_idx_strat = train_test_split(indices, test_size=0.2, stratify=y_base, random_state=42)

# Augment only on the training indices of the stratified split
legit_train_strat = [idx for idx in train_idx_strat if y_base[idx] == 0]
np.random.seed(42)
aug_sample_strat = np.random.choice(legit_train_strat, size=20000, replace=False)

aug_strat_features = []
for i, idx in enumerate(aug_sample_strat):
    base_u = urls_df.loc[idx, 'url'].rstrip('/')
    p = BENIGN_PATHS[i % len(BENIGN_PATHS)]
    f = extract_features(base_u + p)
    aug_strat_features.append([f[k] for k in feature_order])

X_train_strat = np.vstack([X_base[train_idx_strat], np.array(aug_strat_features)])
y_train_strat = np.concatenate([y_base[train_idx_strat], np.zeros(len(aug_strat_features), dtype=int)])
X_test_strat = X_base[test_idx_strat]
y_test_strat = y_base[test_idx_strat]

print('Fitting Stratified Random RandomForest...')
rf_strat = RandomForestClassifier(n_estimators=300, random_state=42, class_weight='balanced', n_jobs=-1)
rf_strat.fit(X_train_strat, y_train_strat)
y_pred_strat = rf_strat.predict(X_test_strat)

metrics_random = {
    'train_samples': int(len(y_train_strat)),
    'test_samples': int(len(y_test_strat)),
    'accuracy': accuracy_score(y_test_strat, y_pred_strat),
    'precision': precision_score(y_test_strat, y_pred_strat),
    'recall': recall_score(y_test_strat, y_pred_strat),
    'f1': f1_score(y_test_strat, y_pred_strat),
    'confusion_matrix': confusion_matrix(y_test_strat, y_pred_strat).tolist(),
    'phishing_precision': precision_score(y_test_strat, y_pred_strat, pos_label=1),
    'phishing_recall': recall_score(y_test_strat, y_pred_strat, pos_label=1),
    'phishing_f1': f1_score(y_test_strat, y_pred_strat, pos_label=1),
}

# 5. Production Model Training (Full dataset + controlled benign path representation)
print('Training production model...')
all_legit_indices = urls_df[urls_df['label'] == 0].index
np.random.seed(42)
aug_sample_full = np.random.choice(all_legit_indices, size=25000, replace=False)

aug_full_features = []
for i, idx in enumerate(aug_sample_full):
    base_u = urls_df.loc[idx, 'url'].rstrip('/')
    p = BENIGN_PATHS[i % len(BENIGN_PATHS)]
    f = extract_features(base_u + p)
    aug_full_features.append([f[k] for k in feature_order])

X_full = np.vstack([X_base, np.array(aug_full_features)])
y_full = np.concatenate([y_base, np.zeros(len(aug_full_features), dtype=int)])

rf_prod = RandomForestClassifier(n_estimators=300, random_state=42, class_weight='balanced', n_jobs=-1)
rf_prod.fit(X_full, y_full)

# Save model and metrics
model_path = os.path.join(model_dir, 'trustguard_model.pkl')
joblib.dump(rf_prod, model_path)

with open(os.path.join(results_dir, 'random_split_evaluation.json'), 'w') as f:
    json.dump(metrics_random, f, indent=2)
with open(os.path.join(results_dir, 'domain_split_evaluation.json'), 'w') as f:
    json.dump(metrics_domain, f, indent=2)

print('Training complete')
