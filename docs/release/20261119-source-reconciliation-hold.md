# Source reconciliation hold — 19 November 2026

Source reconciliation is not production release authorization. Publication,
delivery bundle creation and deployment are disabled while validation and
regressions remain enabled. Require verified recovery, exact candidate
acceptance including Hub canonical-name propagation, and separately reviewed
release control before resuming these operations. Preserve the live image.

Evidence to date: the 45 application backend source-map entries in the
running manifest-fixed image match the previous review SHA 9de46b21.
The Dockerfile includes the public web-manifest read-permission fix.
Frontend and cross-app acceptance must be assessed independently.
