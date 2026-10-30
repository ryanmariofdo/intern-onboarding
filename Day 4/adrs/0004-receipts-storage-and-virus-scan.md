# ADR 0004: Store receipts in Blob Storage with signed URLs and a virus scan

## Status
Accepted (date: 2026-10-29)

## Context
- Staff upload receipt photos from their phones. Each file can be up to 10 MB, with up to 5 files per claim.
- Uploads must work even when the connection drops. Office Wi-Fi is not always stable.
- Submitting a claim must stay under 1.5 s (p95). Big uploads should not slow it down.
- Receipts are files from many people. Some could carry malware, and finance and managers open them on work laptops.
- Only the claimant, line manager, finance, and auditors may see a receipt.
- The brief requires Azure Blob Storage with a signed-URL pattern.
- We don't yet know how long a virus scan takes on a 10 MB file. We also don't know how many people will upload a bad file by accident.

## Decision
We store receipts in a private Azure Blob Storage container and scan every upload for malware.

- The database keeps only the blob name. It never keeps the file.
- The API Service gives the Web app a short-lived signed URL that allows upload only. The Web app uploads straight to Blob Storage in blocks, so it can retry.
- The signed URL for uploading expires in 15 minutes. A signed URL for viewing is read-only and expires in 5 minutes.
- The API Service checks the limits: 10 MB per file, 5 files per claim, and only JPEG, PNG, or PDF.
- We use Microsoft Defender for Storage to scan each new blob. It tags the blob with the result.
- The API Service only gives a viewing URL for blobs tagged as clean. Infected blobs are deleted and the claim goes back to Draft with a reason.
- After 90 days, receipts move to a cheaper storage tier. We keep them for 7 years, like the claims.

## Consequences
- Easier
  - Big files never pass through the API Service, so the submit path stays fast.
  - Retrying a failed block is automatic. A dropped connection does not restart the whole upload.
  - Scanning is built into Azure. We do not run our own scanner.
- Harder
  - Signed URLs need careful settings. A URL that lives too long or allows too much is a leak.
  - We pay extra each month for scanning.
  - The API Service must handle a "scan pending" state in the receipt screens.
- Different
  - A receipt is not visible until the scan finishes. Users see "Scanning" for a few seconds.
- Uncomfortable
  - A claim can be submitted before its receipts finish scanning. A manager might get the notification and find the receipt not yet viewable. If a scan then finds malware, the claim moves from Submitted back to Draft after the manager has already seen it.
  - We accept this to keep submit fast. We will tell users clearly when this happens.

## Alternatives considered
- Upload through the API Service: rejected. Five files of 10 MB would use the same CPU and memory as claim submission. A weak connection would also keep requests open longer. That puts the 1.5 s target at risk.
- Run our own scanner: rejected. We would have to patch it, update its virus signatures, and run a container. Our team has no container experience.
- No scanning, trust the file types: rejected. File extensions can be faked. Finance and managers open these files on work laptops, so the risk is too high.
