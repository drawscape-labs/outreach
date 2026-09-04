# Hunter.io Examples

Set `SKILL_DIR` to the Hunter skill directory and run these examples from the repository root.

## Smoke Tests

Check that the real key in `.env` authenticates without spending search or verification credits:

```bash
node "$SKILL_DIR/scripts/hunter-api.js" account --summary
```

Exercise Hunter's dummy responses for the three endpoints that support `test-api-key`:

```bash
node "$SKILL_DIR/scripts/hunter-api.js" domain-search --domain hunter.io --test-key --summary
node "$SKILL_DIR/scripts/hunter-api.js" email-finder --domain hunter.io --first-name Matthew --last-name Tharp --test-key --summary
node "$SKILL_DIR/scripts/hunter-api.js" email-verifier --email matt@hunter.io --test-key --summary
```

## Prospecting

Find sales people at a target company:

```bash
node "$SKILL_DIR/scripts/hunter-api.js" domain-search \
  --domain porschebeverlyhills.com \
  --type personal \
  --department sales \
  --required-field full_name,position \
  --verification-status valid,accept_all \
  --limit 25 \
  --summary
```

Find an email for a specific prospect:

```bash
node "$SKILL_DIR/scripts/hunter-api.js" email-finder \
  --domain porschebeverlyhills.com \
  --first-name Jane \
  --last-name Doe \
  --max-duration 10 \
  --summary
```

Verify a candidate before QuickMail:

```bash
node "$SKILL_DIR/scripts/hunter-api.js" email-verifier \
  --email jane.doe@example.com \
  --summary
```

Enrich company context:

```bash
node "$SKILL_DIR/scripts/hunter-api.js" enrich-company \
  --domain porschebeverlyhills.com \
  --summary
```

Enrich a person or a combined email/company profile:

```bash
node "$SKILL_DIR/scripts/hunter-api.js" enrich-person --email jane.doe@example.com --summary
node "$SKILL_DIR/scripts/hunter-api.js" enrich-combined --email jane.doe@example.com --summary
```

## Dry Runs

Validate required parameters and show the request URL without calling Hunter:

```bash
node "$SKILL_DIR/scripts/hunter-api.js" email-finder \
  --domain example.com \
  --full-name "Jane Doe" \
  --dry-run
```

## Review Notes

- `valid` is the best verification status for person outreach.
- `accept_all` needs human review because the mail server may accept false positives.
- `unknown`, `webmail`, `disposable`, and `invalid` are not ready for outreach.
- A high Hunter score without direct public source evidence is still secondary evidence.
