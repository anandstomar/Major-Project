Build:
  cd programs/anchor_program
  anchor build

Deploy (local dev):
  anchor deploy

Notes:
- Set program ID in Anchor.toml after first build/deploy.
- Keep account sizes small; store large payloads off-chain.
