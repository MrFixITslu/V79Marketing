#!/usr/bin/env python3
"""Read-only release hold inspection for an OWNER-AUTHORISED V79 host.

Never restarts containers, reads databases, dumps private env vars, creates
backups, changes permissions, or makes production deploy decisions.
"""
import datetime as dt
import json
import os
import pathlib
import subprocess
import sys

EXPECTED_HOST = "v79sl"
TARGETS = ("v79marketing-app", "v79-hub", "v79-tiquet-manager")
MARKETING_VOLUME = "v79marketing_v79_data"

def docker(*args):
    try:
        p = subprocess.run(["docker", *args], check=False, capture_output=True,
                           text=True, timeout=15)
        return json.loads(p.stdout) if p.returncode == 0 else None
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return None

def main():
    host = os.uname().nodename
    checks = {}
    checks["HOST"] = "PASS" if host == EXPECTED_HOST else "STOP_WRONG_HOST"
    if checks["HOST"] != "PASS":
        print("V79_MARKETING_RELEASE_READONLY="+json.dumps(checks))
        return 2
    containers = docker("inspect", *TARGETS)
    if not isinstance(containers, list) or len(containers) != len(TARGETS):
        checks["DOCKER_READONLY_INSPECT"] = "UNAVAILABLE"
    else:
        checks["DOCKER_READONLY_INSPECT"] = "PASS"
        for item in containers:
            name = str(item.get("Name","")).lstrip("/")
            label = name.upper().replace("-","_")
            state = item.get("State") or {}
            image = str(item.get("Image", ""))
            checks[label+"_RUNNING"] = "PASS" if state.get("Running") else "FAIL"
            checks[label+"_HEALTH"] = str((state.get("Health") or {}).get("Status") or "NOT_REPORTED")
            checks[label+"_IMAGE_PIN"] = "PASS" if image.startswith("sha256:") else "UNKNOWN"
            if name == "v79marketing-app":
                mounts = item.get("Mounts") or []
                checks["MARKETING_DATA_MOUNT"] = (
                    "PASS" if any(m.get("Destination")=="/app/data" and
                                  m.get("Name")==MARKETING_VOLUME for m in mounts)
                    else "STOP_VOLUME_MISMATCH"
                )
                checks["MARKETING_PRIVILEGED"] = (
                    "PASS" if (item.get("HostConfig") or {}).get("Privileged") is False
                    else "REVIEW"
                )
    volume = docker("volume", "inspect", MARKETING_VOLUME)
    checks["MARKETING_DOCKER_VOLUME"] = (
        "PASS" if isinstance(volume, list) and len(volume)==1 else "UNVERIFIED"
    )
    # These cannot be proven from a running container's *existence*.
    # Full recovery requires a separate isolated restore and customer test.
    checks["BACKUP_LAST_SUCCESS"] = "NOT_VERIFIED"
    checks["ISOLATED_PRODUCTION_RESTORE"] = "NOT_VERIFIED"
    checks["SIGNING_AND_VAULT_KEY_RECOVERY"] = "NOT_VERIFIED"
    checks["LIVE_PERSONAL_OAUTH_PROVIDER_POSTING"] = "NOT_VERIFIED"
    checks["STUDIO_MULTIUSER_MFA_STEPUP"] = "NOT_VERIFIED"
    checks["FINAL_OWNER_RELEASE_APPROVAL"] = "NOT_GIVEN"
    checks["PRODUCTION_MUTATIONS"] = "NONE"
    checks["PRODUCTION_ENV_VALUES_DISCLOSED"] = "NONE"
    checks["READONLY_UTC"] = dt.datetime.now(dt.timezone.utc).isoformat()
    print("V79_MARKETING_RELEASE_READONLY="+json.dumps(checks,sort_keys=True))
    blocked=any(v.startswith("STOP") or v=="FAIL" for v in checks.values())
    return 2 if blocked else 0

if __name__=="__main__":
    sys.exit(main())
