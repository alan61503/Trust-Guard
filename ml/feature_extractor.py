import re
import ipaddress
from urllib.parse import urlparse

# List of suspicious terms used in the original JS implementation
_SUSPICIOUS_TERMS = [
    'login',
    'verify',
    'account',
    'secure',
    'update',
    'bank',
    'paypal',
    'confirm',
    'reset',
]

def _is_ip(hostname: str) -> bool:
    """Return True if the hostname is a valid IPv4 or IPv6 address."""
    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        return False

def extract_features(url: str) -> dict:
    """Extract the 15 numeric TrustGuard features from a URL.

    Returns a dictionary mapping feature names to their numeric values.
    """
    parsed = urlparse(url)
    hostname = parsed.hostname or ''
    raw_path = parsed.path or ''
    full = url

    # Normalize homepage trailing slash: treat 'https://example.com/' as 'https://example.com'
    is_homepage_slash = (raw_path == '/' or raw_path == '') and not parsed.query and not parsed.fragment and full.endswith('/')
    norm_url = full[:-1] if is_homepage_slash else full

    # Normalize hostname for domain structure analysis:
    # 'www.' is a standard web host prefix, not an intrinsic subdomain.
    norm_hostname = hostname[4:] if hostname.lower().startswith('www.') else hostname

    # Basic length features
    url_length = len(norm_url)
    hostname_length = len(hostname)
    clean_path = raw_path.strip('/')
    path_length = len(clean_path)

    # Character based counts on domain structure
    num_dots = norm_hostname.count('.')
    num_subdomains = max(0, num_dots - 1)
    num_hyphens = hostname.count('-')
    num_digits = sum(ch.isdigit() for ch in hostname)
    num_special_chars = sum(1 for ch in hostname if not (ch.isalnum() or ch in '.-'))

    # Boolean flags as integers (consistent numeric values)
    has_https = int(parsed.scheme.lower() == 'https')
    has_ip = int(_is_ip(hostname))
    has_at_symbol = int('@' in full)
    has_punycode = int(hostname.startswith('xn--'))
    has_encoded_chars = int(bool(re.search(r'%[0-9A-Fa-f]{2}', full)))

    # Path depth (number of non-empty segments)
    path_depth = len([seg for seg in raw_path.split('/') if seg])

    # Suspicious term count (numeric)
    lowered = hostname.lower()
    suspicious_term_count = sum(1 for term in _SUSPICIOUS_TERMS if term in lowered)

    return {
        'url_length': url_length,
        'hostname_length': hostname_length,
        'path_length': path_length,
        'num_dots': num_dots,
        'num_subdomains': num_subdomains,
        'num_hyphens': num_hyphens,
        'num_digits': num_digits,
        'num_special_chars': num_special_chars,
        'has_https': has_https,
        'has_ip': has_ip,
        'has_at_symbol': has_at_symbol,
        'has_punycode': has_punycode,
        'has_encoded_chars': has_encoded_chars,
        'path_depth': path_depth,
        'suspicious_term_count': suspicious_term_count,
    }
