#!/usr/bin/env python3
"""Security and privacy audit for this repository. Run it before every push:

    python tools/audit_security.py

It scans every tracked file AND every line ever added in the full git history (git log -p --all) for
secrets, local paths, usernames, emails, IP addresses and phone numbers; checks that every commit's
author and committer email is a GitHub no-reply address; checks media files for EXIF/GPS/device metadata;
checks that no secret or machine-specific file is tracked and that .gitignore blocks them; and runs
gitleaks too when it is installed. Pass refs to limit the history scan (default: --all), e.g. `python tools/audit_security.py main`.
It prints every finding with its file, line and commit, and exits 1
if there is anything to fix (0 when clean).

Your own username and computer name are read from the environment at run time, so this file holds no
personal data itself.
"""
import getpass
import math
import os
import re
import shutil
import socket
import subprocess
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REVS = [a for a in sys.argv[1:] if not a.startswith('-') or a == '--all'] or ['--all']

# public, intentional mentions that are not findings
ALLOW = [
    r'kevintngo', r'Kevin Ngo',                    # the original author, credited on purpose
    r'kevo589',                                    # this fork's public GitHub handle (credit line, Pages URL)
    r'noreply@anthropic\.com',                     # Co-Authored-By trailer
    r'[0-9]+\+[A-Za-z0-9-]+@users\.noreply\.github\.com', r'[A-Za-z0-9-]+@users\.noreply\.github\.com',
]
# loopback in the Chrome automation tools is expected
ALLOW_IP = {'127.0.0.1', '0.0.0.0'}
GENERATED = {'index.html', 'vendor/three.module.min.js'}   # built or third-party minified: skip the entropy check
BINARY = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mov', '.webm', '.ico', '.pdf')


def machine_names():
    names = set()
    for v in (os.environ.get('USERNAME'), os.environ.get('USER'), _safe(getpass.getuser), _safe(socket.gethostname), os.environ.get('COMPUTERNAME')):
        if v and len(v) >= 3 and v.lower() not in ('root', 'user', 'admin', 'runner', 'localhost'):
            names.add(v)
    return names


def _safe(f):
    try:
        return f()
    except Exception:
        return None


PATTERNS = {
    'local-path': r'[A-Za-z]:[\\/]+(?:Users|Documents and Settings)[\\/]|/Users/[A-Za-z0-9._-]+/|/home/[A-Za-z0-9._-]+/|AppData[\\/]|OneDrive[\\/ -]|\.gem[i]ni[\\/]|anti[g]ravity',   # bracketed so this file never matches itself
    'email': r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',
    'ipv4': r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
    'phone': r'(?<![\w.#])(?:\+?1[ .-])?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?![\w.])',
    'github-token': r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})',
    'google-key': r'\bAIza[0-9A-Za-z_-]{35}\b',
    'aws-key': r'\b(?:AKIA|ASIA)[0-9A-Z]{16}\b',
    'private-key': r'-----BEGIN [A-Z ]*PRIVATE KEY-----',
    'webhook': r'hooks\.slack\.com/services/|discord(?:app)?\.com/api/webhooks/|\bxox[baprs]-[A-Za-z0-9-]{10,}',
    'api-secret': r'\b(?:sk_live|rk_live|sk-ant-|sk-proj-|sk-)[A-Za-z0-9_-]{20,}',
    'jwt': r'\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',
    'password': r'(?i)\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\b\s*[:=]\s*[\'"][^\'"\s]{6,}[\'"]',
    'bearer': r'(?i)\bbearer\s+[A-Za-z0-9._~+/-]{20,}',
    'personal-cloud': r'(?i)drive\.google\.com/|docs\.google\.com/|dropbox\.com/s/|onedrive\.live\.com|1drv\.ms/|ngrok(?:-free)?\.(?:io|app)|trycloudflare\.com',
}
FORBIDDEN_FILES = r'(^|/)(\.env(\..*)?|.*\.(pem|key|p12|pfx|keystore|jks|log|har|secret)|local\.properties|credentials.*\.json|.*cookies.*\.(txt|json)|.*localstorage.*\.json)$|(^|/)(\.claude|brain|node_modules)/'
GITIGNORE_MUST = ['.env', '.env.*', '*.pem', '*.key', '*.keystore', '*.jks', 'local.properties', '*.log', '*.har', '.claude/', 'node_modules/']
ENTROPY_RUN = re.compile(r'[A-Za-z0-9+/=_-]{32,}')


def git(*args):
    r = subprocess.run(['git', '-C', ROOT, *args], capture_output=True)
    if r.returncode:
        sys.exit('git ' + ' '.join(args) + ' failed: ' + r.stderr.decode('utf-8', 'replace'))
    return r.stdout.decode('utf-8', 'replace')


def entropy(s):
    c = Counter(s)
    return -sum(v / len(s) * math.log2(v / len(s)) for v in c.values())


def allowed(v):
    return any(re.fullmatch(a, v) or re.search(a, v) and len(v) < 80 and not re.search(PATTERNS['local-path'], v) for a in ALLOW)


def scan_line(line, path, names):
    out = []
    for kind, pat in PATTERNS.items():
        for m in re.finditer(pat, line):
            v = m.group(0)
            if kind == 'ipv4' and (v in ALLOW_IP or not all(int(x) <= 255 for x in v.split('.'))):
                continue
            if kind == 'email' and allowed(v):
                continue
            out.append((kind, v))
    # your username / computer name as a whole word, outside the allowed public credits
    bare = line
    for a in ALLOW:
        bare = re.sub(a, ' ', bare)
    for n in names:
        for m in re.finditer(r'(?<![A-Za-z0-9])' + re.escape(n) + r'(?![A-Za-z0-9])', bare, re.I):
            out.append(('machine-name', m.group(0)))
    if path not in GENERATED:
        for m in ENTROPY_RUN.finditer(line):
            v = m.group(0)
            if entropy(v) > 4.5 and not re.fullmatch(r'[a-z0-9_-]+|[A-Z0-9_-]+', v):
                out.append(('high-entropy', v[:48]))
    return out


def main():
    names = machine_names()
    findings = []
    tracked = git('ls-files', '-z').split('\0')
    tracked = [f for f in tracked if f]

    # 1. tracked files
    for f in tracked:
        if f.lower().endswith(BINARY):
            continue
        try:
            text = open(os.path.join(ROOT, f), encoding='utf-8', errors='replace').read()
        except OSError:
            continue
        for n, line in enumerate(text.split('\n'), 1):
            for kind, v in scan_line(line, f, names):
                findings.append(('file', f + ':' + str(n), kind, v))

    # 2. every added line in the full history, every branch, tag and stash
    commit, path = None, None
    for line in git('log', '-p', *REVS, '--no-color', '--format=@@COMMIT %H').split('\n'):
        if line.startswith('@@COMMIT '):
            commit = line[9:]
            continue
        if line.startswith('+++ b/'):
            path = line[6:]
            continue
        if line.startswith('+') and not line.startswith('+++'):
            for kind, v in scan_line(line[1:], path, names):
                findings.append(('history', commit[:10] + ' ' + str(path), kind, v))

    # 3. commit messages, and every author / committer identity
    for block in git('log', *REVS, '--format=@@COMMIT %H%n%B').split('@@COMMIT ')[1:]:
        h, _, body = block.partition('\n')
        for n, line in enumerate(body.split('\n'), 1):
            for kind, v in scan_line(line, 'commit-message', names):
                if kind != 'high-entropy':
                    findings.append(('message', h[:10], kind, v))
    for line in git('log', *REVS, '--format=%H|%an|%ae|%cn|%ce').splitlines():
        h, an, ae, cn, ce = line.split('|')
        for who, email in (('author', ae), ('committer', ce)):
            if not re.fullmatch(r'([0-9]+\+)?[A-Za-z0-9-]+@users\.noreply\.github\.com|noreply@github\.com', email):
                findings.append(('identity', h[:10], who + '-email', email))
        for nm in (an, cn):
            if any(n.lower() == nm.lower() for n in names):
                findings.append(('identity', h[:10], 'machine-name', nm))

    # 4. media metadata: EXIF / XMP / GPS / camera and device tags
    for f in tracked:
        if not f.lower().endswith(BINARY):
            continue
        b = open(os.path.join(ROOT, f), 'rb').read()
        if f.lower().endswith(('.jpg', '.jpeg')) and (b'Exif\0\0' in b[:65536] or b'http://ns.adobe.com/xap' in b[:65536]):
            findings.append(('media', f, 'exif-xmp', 'JPEG carries EXIF/XMP metadata'))
        if f.lower().endswith('.png') and any(t in b for t in (b'eXIf', b'iTXt', b'tEXt', b'zTXt')):
            findings.append(('media', f, 'png-text', 'PNG carries text/EXIF chunks'))
        if f.lower().endswith(('.mp4', '.mov')):
            for atom in (b'\xa9xyz', b'loci', b'\xa9mak', b'\xa9mod', b'\xa9ART', b'\xa9nam', b'XMP_'):
                if atom in b:
                    findings.append(('media', f, 'video-metadata', atom.decode('latin1')))
        for n in names:
            if n.encode() in b:
                findings.append(('media', f, 'machine-name', n))

    # 5. files that must never be tracked, and the .gitignore rules that keep them out
    for f in tracked:
        if re.search(FORBIDDEN_FILES, f, re.I):
            findings.append(('tracked-file', f, 'forbidden-file', f))
    gi = open(os.path.join(ROOT, '.gitignore'), encoding='utf-8').read().split('\n') if os.path.exists(os.path.join(ROOT, '.gitignore')) else []
    for rule in GITIGNORE_MUST:
        if rule not in [g.strip() for g in gi]:
            findings.append(('gitignore', '.gitignore', 'missing-rule', rule))

    # 6. gitleaks, when installed
    gl = shutil.which('gitleaks')
    if gl:
        for mode in (['git', '--redact', '-v', ROOT], ['dir', '--redact', '-v', ROOT]):
            r = subprocess.run([gl, *mode], capture_output=True, text=True)
            print('gitleaks ' + mode[0] + ': exit ' + str(r.returncode))
            if r.returncode == 1:
                findings.append(('gitleaks', mode[0], 'leak', (r.stdout + r.stderr).strip()[-400:]))
    else:
        print('gitleaks: not installed (pattern + entropy scan only)')

    # report
    seen, uniq = set(), []
    for f in findings:
        if f not in seen:
            seen.add(f)
            uniq.append(f)
    print('Scanned %d tracked files, %d commits, full history (git log -p %s).' % (len(tracked), len(git('rev-list', *REVS).split()), ' '.join(REVS)))
    if not uniq:
        print('CLEAN: no secrets, personal info, local paths, non-noreply identities or metadata found.')
        return 0
    print('FINDINGS (%d):' % len(uniq))
    for where, loc, kind, v in uniq:
        print('  [%s] %s  %s: %r' % (where, loc, kind, v))
    return 1


if __name__ == '__main__':
    sys.exit(main())
