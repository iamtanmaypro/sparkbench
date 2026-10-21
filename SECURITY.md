# Security and data boundaries

Sparkbench is a static browser application. Circuit state, notes, positions, and completed lesson IDs are saved to localStorage on the app's origin. There is no application backend or API-key setup. Tools can expose circuit and note data to an attached agent host; that host's data handling is separate from this app.

The four circuit-edit tools require approval. Lesson navigation resets the bench immediately, focus changes immediately, and agent notes are added immediately. Batch approval is an explicit UI action. These are application-level interaction rules, not a sandbox against an extension, developer tools, or a browser host that has broader access.

## Report a vulnerability

Email the maintainer at [tanmay@iamtanmay.pro](mailto:tanmay@iamtanmay.pro). Include the affected revision, browser/host version, steps to reproduce, and impact. Approval bypasses, unsafe note rendering, and unexpected data exposure are useful areas to investigate. Do not post private traces, credentials, or sensitive exploit details in public issues.

There is no guaranteed response time or bug bounty. Fixes currently target the default branch; no older release branches are supported. The simplified educational simulation is not intended for designing safety-critical physical circuits.
