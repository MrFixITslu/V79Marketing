#!/usr/bin/env python3
"""Owner-run image-only release; does not rewrite production source or data."""
import copy
import fcntl
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import tarfile
import tempfile

ROOT = Path('/home/firelion/V79Marketing')
TARGET = 'dd2bd7d5502c4044e4b91b5f433f60152ca0f2cd'
EXPECTED_IMAGE = 'sha256:5481a1b5f40ff08215c2d0c67282fe3bd8be181a68add13c666b1c90c4827110'
EXPECTED_REVISION = '3508888658ad772de7e4402077d7c4d65673d879'
FILES = [ROOT / 'docker-compose.yml', Path('/home/firelion/v79-marketing-release.v1258n55/app-image.yml')]
NAME, PROJECT, SERVICE = 'v79marketing-app', 'v79marketing', 'v79-marketing'


def run(args, capture=True, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=capture, **kwargs)


def inspect(name):
    return json.loads(run(['docker', 'inspect', name]).stdout)[0]


def compose(extra=None):
    args = ['docker', 'compose', '--project-directory', str(ROOT), '--project-name', PROJECT]
    for file in FILES + ([extra] if extra else []):
        args.extend(['-f', str(file)])
    return args


def model(extra=None):
    return json.loads(run(compose(extra) + ['config', '--format', 'json']).stdout)


def mounts(container):
    return sorted((m['Type'], m['Source'], m['Destination'], m['RW']) for m in container['Mounts'])


def require(value, message):
    if not value:
        raise RuntimeError(message)


def main():
    require(socket.gethostname() == 'v79sl', 'Run on v79sl only.')
    os.umask(0o077)
    with (Path.home() / '.v79-deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        before = inspect(NAME)
        require(before['Image'] == EXPECTED_IMAGE, 'Live image changed; stop and report new release.')
        require(before['State'].get('Health', {}).get('Status') == 'healthy', 'Original service is not healthy.')
        labels = before['Config'].get('Labels') or {}
        require(labels.get('org.opencontainers.image.revision') == EXPECTED_REVISION, 'Original revision changed.')
        require(labels.get('com.docker.compose.project') == PROJECT, 'Compose project changed.')
        require(labels.get('com.docker.compose.service') == SERVICE, 'Compose service changed.')
        require(labels.get('com.docker.compose.project.config_files') == ','.join(map(str, FILES)), 'Compose file set changed.')
        frozen = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in FILES + [ROOT / '.env']}
        baseline = model()
        release = Path(tempfile.mkdtemp(prefix='v79-marketing-release-20261029.', dir=Path.home()))
        print('RELEASE_DIRECTORY =', release, flush=True)
        print('EXISTING_TESTS = REUSED; NO BACKUP OR ROLLBACK REHEARSAL', flush=True)
        run(['git', '-C', str(ROOT), 'fetch', '--no-tags', 'origin', TARGET], capture=False)
        require(run(['git', '-C', str(ROOT), 'rev-parse', TARGET + '^{commit}']).stdout.strip() == TARGET, 'Source revision mismatch.')
        # These fixes require no schema or deployment-configuration changes.
        for path in ['src/lib/db.ts', 'src/lib/campaignAttribution.ts', 'docker-compose.yml', 'Dockerfile', 'package-lock.json']:
            old = run(['git', '-C', str(ROOT), 'rev-parse', EXPECTED_REVISION + ':' + path]).stdout
            new = run(['git', '-C', str(ROOT), 'rev-parse', TARGET + ':' + path]).stdout
            require(old == new, 'Unexpected schema/config/dependency change: ' + path)
        archive = release / 'source.tar'
        run(['git', '-C', str(ROOT), 'archive', '--format=tar', '--output=' + str(archive), TARGET])
        source = release / 'source'
        source.mkdir(mode=0o755)
        with tarfile.open(archive) as tar:
            tar.extractall(source, filter='data')
        tag = 'v79marketing:release-' + TARGET[:12]
        run(['docker', 'build', '--label', 'org.opencontainers.image.revision=' + TARGET, '-t', tag, str(source)], capture=False)
        image = json.loads(run(['docker', 'image', 'inspect', tag]).stdout)[0]
        require(image['Config']['User'] == before['Config']['User'] and image['Config']['User'] not in ['', 'root', '0', '0:0'], 'Candidate runtime user changed.')
        require(image['Config']['Cmd'] == before['Config']['Cmd'], 'Candidate command changed.')
        override = release / 'app-image.yml'
        override.write_text(json.dumps({'services': {SERVICE: {'image': image['Id']}}}, indent=2) + '\n')
        after_model = model(override)
        expected_model = copy.deepcopy(baseline)
        expected_model['services'][SERVICE]['image'] = image['Id']
        require(after_model == expected_model, 'Compose changes extend beyond the app image.')
        require(model() == baseline, 'Compose settings drifted during build.')
        require(all(hashlib.sha256(p.read_bytes()).hexdigest() == digest for p, digest in frozen.items()), 'Configuration changed during build.')
        require(inspect(NAME)['Id'] == before['Id'], 'Live container changed during build.')
        require(inspect(NAME)['State'].get('Health', {}).get('Status') == 'healthy', 'Live service became unhealthy during build.')
        print('IMAGE_ONLY_PREFLIGHT = PASS', flush=True)
        try:
            run(compose(override) + ['up', '-d', '--no-deps', '--no-build', '--pull', 'never', '--wait', '--wait-timeout', '180', SERVICE], capture=False)
            live = inspect(NAME)
            require(live['Image'] == image['Id'], 'Wrong image after switch.')
            require(live['State'].get('Health', {}).get('Status') == 'healthy', 'New service is unhealthy.')
            require(mounts(live) == mounts(before), 'Persistent mounts changed.')
            # Only baked image variables may differ; every old variable explicitly
            # set by the effective Compose configuration must be retained.
            old_env = dict(v.split('=', 1) for v in before['Config']['Env'])
            new_env = dict(v.split('=', 1) for v in live['Config']['Env'])
            require(all(old_env.get(k) == new_env.get(k) for k in baseline['services'][SERVICE].get('environment', {})), 'Runtime environment changed.')
            (release / 'receipt.json').write_text(json.dumps({'revision': TARGET, 'previousImage': EXPECTED_IMAGE, 'image': image['Id'], 'container': live['Id'], 'healthy': True}, indent=2) + '\n')
            print('MARKETING_RELEASE = PASS', flush=True)
            print('REVISION =', TARGET, flush=True)
            print('IMAGE =', image['Id'], flush=True)
            print('DATA_VOLUME = PRESERVED', flush=True)
        except Exception:
            print('SWITCH_FAILED = restoring original app image; this is recovery, not a rehearsal', flush=True)
            restore = release / 'restore-image.yml'
            restore.write_text(json.dumps({'services': {SERVICE: {'image': EXPECTED_IMAGE}}}) + '\n')
            run(compose(restore) + ['up', '-d', '--no-deps', '--no-build', '--pull', 'never', '--wait', '--wait-timeout', '180', SERVICE], capture=False)
            raise


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # No secret-bearing command output or Compose/environment data is printed.
        print('MARKETING_RELEASE = STOP:', type(error).__name__, flush=True)
        if isinstance(error, RuntimeError):
            print(str(error), flush=True)
        raise SystemExit(1)
