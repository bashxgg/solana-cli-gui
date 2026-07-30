import type { CatalogCommand } from "../types";

/** Catalog of Solana CLI operations exposed as forms. Full surface also via Console. */
export const CATALOG: CatalogCommand[] = [
  // ── Config ──────────────────────────────────────────────
  {
    id: "config-get",
    binary: "solana",
    label: "Config get",
    description:
      "Print your Solana CLI settings: default RPC URL (cluster), keypair file path, commitment level, and websocket URL. Read-only; does not change anything.",
    subcommand: ["config", "get"],
    fields: [],
    page: "config",
  },
  {
    id: "config-set-url",
    binary: "solana",
    label: "Set RPC URL",
    description:
      "Change which cluster the CLI talks to (devnet, testnet, mainnet-beta, localhost, or a custom RPC URL). All later commands use this until you change it again.",
    subcommand: ["config", "set"],
    fields: [
      {
        name: "url",
        label: "URL or moniker",
        type: "select",
        flag: "--url",
        required: true,
        options: [
          { value: "devnet", label: "devnet" },
          { value: "testnet", label: "testnet" },
          { value: "mainnet-beta", label: "mainnet-beta" },
          { value: "localhost", label: "localhost" },
        ],
        help: "Monikers map to public RPCs. For a private RPC, use Console: config set --url https://…",
      },
    ],
    page: "config",
    requiresConfirm: true,
  },
  {
    id: "config-set-keypair",
    binary: "solana",
    label: "Set keypair path",
    description:
      "Set the default keypair file the CLI uses as your wallet (for signing and as the fee payer). This only stores a path — it does not move or create keys.",
    subcommand: ["config", "set"],
    fields: [
      {
        name: "keypair",
        label: "Keypair path",
        type: "path",
        flag: "--keypair",
        required: true,
        placeholder: "~/.config/solana/id.json",
        help: "Path to a JSON keypair file on disk (e.g. ~/.config/solana/id.json).",
      },
    ],
    page: "config",
    requiresConfirm: true,
  },
  {
    id: "config-set-commitment",
    binary: "solana",
    label: "Set commitment",
    description:
      "Set how confirmed a slot must be before the CLI treats data as ready: processed (fastest), confirmed, or finalized (safest / slowest).",
    subcommand: ["config", "set"],
    fields: [
      {
        name: "commitment",
        label: "Commitment",
        type: "select",
        flag: "--commitment",
        required: true,
        options: [
          { value: "processed", label: "processed — leader saw it" },
          { value: "confirmed", label: "confirmed — supermajority voted" },
          { value: "finalized", label: "finalized — rooted, irreversible" },
        ],
        help: "Affects balance/account reads and when transactions are considered done.",
      },
    ],
    page: "config",
  },

  // ── Wallet ──────────────────────────────────────────────
  {
    id: "address",
    binary: "solana",
    label: "Address",
    description:
      "Show the public key (wallet address) of your configured keypair. Safe to share; this is not the private key.",
    subcommand: ["address"],
    fields: [],
    page: "wallet",
  },
  {
    id: "balance",
    binary: "solana",
    label: "Balance",
    description:
      "Show how much SOL an address holds. Omit the account field to check your configured wallet; pass an address to check any account.",
    subcommand: ["balance"],
    fields: [
      {
        name: "account",
        label: "Account (optional)",
        type: "pubkey",
        positional: true,
        position: 0,
        placeholder: "defaults to configured keypair",
        help: "Leave empty for your default wallet balance.",
      },
    ],
    preferJson: true,
    page: "wallet",
  },
  {
    id: "airdrop",
    binary: "solana",
    label: "Airdrop",
    description:
      "Request free test SOL from a faucet. Only works on devnet/testnet/local (not mainnet). Optional recipient defaults to your configured wallet.",
    subcommand: ["airdrop"],
    fields: [
      {
        name: "amount",
        label: "Amount (SOL)",
        type: "amount",
        positional: true,
        position: 0,
        required: true,
        defaultValue: "1",
        help: "Faucets often cap amounts (e.g. 1–5 SOL per request).",
      },
      {
        name: "recipient",
        label: "Recipient (optional)",
        type: "pubkey",
        positional: true,
        position: 1,
        help: "Address to receive SOL. Empty = your configured keypair.",
      },
    ],
    requiresConfirm: true,
    dangerous: true,
    page: "wallet",
  },
  {
    id: "keygen-pubkey",
    binary: "solana-keygen",
    label: "Keygen pubkey",
    description:
      "Print the public address for a keypair file without changing it. Useful to verify which file you are about to use.",
    subcommand: ["pubkey"],
    fields: [
      {
        name: "keypair",
        label: "Keypair path",
        type: "path",
        positional: true,
        position: 0,
        placeholder: "~/.config/solana/id.json",
        help: "Path to the keypair JSON file.",
      },
    ],
    page: "wallet",
  },
  {
    id: "keygen-new",
    binary: "solana-keygen",
    label: "Keygen new",
    description:
      "Create a brand-new random keypair and write it to a file. Back this file up securely — losing it means losing access to funds on that address.",
    subcommand: ["new"],
    fields: [
      {
        name: "outfile",
        label: "Output path",
        type: "path",
        flag: "--outfile",
        required: true,
        placeholder: "./my-keypair.json",
        help: "Where to write the keypair JSON. Do not commit this file to git.",
      },
      {
        name: "force",
        label: "Overwrite if exists",
        type: "flag",
        flag: "--force",
        defaultValue: false,
        help: "Replace an existing file at the output path (irreversible for that file).",
      },
      {
        name: "noPassphrase",
        label: "No passphrase",
        type: "flag",
        flag: "--no-passphrase",
        defaultValue: true,
        help: "Skip interactive passphrase (needed for non-interactive GUI runs).",
      },
    ],
    requiresConfirm: true,
    dangerous: true,
    page: "wallet",
  },

  // ── Accounts ────────────────────────────────────────────
  {
    id: "account",
    binary: "solana",
    label: "Account",
    description:
      "Inspect any on-chain account: owner program, lamports (SOL), data length, executable flag, and raw data. Essential for debugging programs and wallets.",
    subcommand: ["account"],
    fields: [
      {
        name: "address",
        label: "Account address",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
        help: "Base58 public key of the account to fetch.",
      },
    ],
    preferJson: true,
    page: "accounts",
  },
  {
    id: "rent",
    binary: "solana",
    label: "Rent",
    description:
      "Calculate how much SOL must stay in an account of a given data size to be rent-exempt (never deleted for unpaid rent). Size 0 = system account minimum.",
    subcommand: ["rent"],
    fields: [
      {
        name: "dataLength",
        label: "Data length (bytes)",
        type: "number",
        positional: true,
        position: 0,
        required: true,
        defaultValue: "0",
        help: "Account data field size in bytes (not including metadata).",
      },
    ],
    page: "accounts",
  },
  {
    id: "confirm",
    binary: "solana",
    label: "Confirm transaction",
    description:
      "Look up a transaction by signature and report whether it landed, failed, or is still pending. Use the sig from a transfer or program deploy.",
    subcommand: ["confirm"],
    fields: [
      {
        name: "signature",
        label: "Signature",
        type: "text",
        positional: true,
        position: 0,
        required: true,
        help: "Base58 transaction signature from a previous send.",
      },
    ],
    page: "accounts",
  },
  {
    id: "transaction-history",
    binary: "solana",
    label: "Transaction history",
    description:
      "List recent transaction signatures that touched an address, newest first. Good for auditing activity on a wallet or program.",
    subcommand: ["transaction-history"],
    fields: [
      {
        name: "address",
        label: "Address",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
        help: "Wallet, program, or account public key.",
      },
      {
        name: "limit",
        label: "Limit",
        type: "number",
        flag: "--limit",
        defaultValue: "10",
        help: "Max number of signatures to return.",
      },
    ],
    page: "accounts",
  },
  {
    id: "find-pda",
    binary: "solana",
    label: "Find PDA",
    description:
      "Derive a Program Derived Address for a program ID and seed. PDAs are deterministic accounts controlled by programs (not private keys).",
    subcommand: ["find-program-derived-address"],
    fields: [
      {
        name: "programId",
        label: "Program ID",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
        help: "The on-chain program that owns this PDA.",
      },
      {
        name: "seed",
        label: "Seed string",
        type: "text",
        flag: "--seed",
        required: true,
        help: "Seed bytes as a string (CLI encoding). For complex seeds, use Console.",
      },
    ],
    page: "accounts",
  },

  // ── Transfer ────────────────────────────────────────────
  {
    id: "transfer",
    binary: "solana",
    label: "Transfer SOL",
    description:
      "Send SOL from a keypair to another address. Signs and broadcasts a system transfer. Always double-check cluster (devnet vs mainnet) before confirming.",
    subcommand: ["transfer"],
    fields: [
      {
        name: "recipient",
        label: "Recipient",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
        help: "Destination wallet address.",
      },
      {
        name: "amount",
        label: "Amount (SOL)",
        type: "amount",
        positional: true,
        position: 1,
        required: true,
        help: "Amount of SOL to send (not lamports).",
      },
      {
        name: "from",
        label: "From keypair path",
        type: "path",
        flag: "--from",
        help: "Source keypair file. Empty = configured default keypair.",
      },
      {
        name: "feePayer",
        label: "Fee payer path",
        type: "path",
        flag: "--fee-payer",
        help: "Who pays the network fee. Empty = same as from / default.",
      },
      {
        name: "allowUnfunded",
        label: "Allow unfunded recipient",
        type: "flag",
        flag: "--allow-unfunded-recipient",
        defaultValue: false,
        help: "Allow sending to an address that has never held SOL (creates the account).",
      },
    ],
    requiresConfirm: true,
    dangerous: true,
    page: "transfer",
  },
  {
    id: "create-nonce",
    binary: "solana",
    label: "Create nonce account",
    description:
      "Create a durable nonce account funded with SOL. Nonces let you build offline or long-lived transactions that don’t expire with a normal blockhash.",
    subcommand: ["create-nonce-account"],
    fields: [
      {
        name: "nonceAccount",
        label: "Nonce account keypair path",
        type: "path",
        positional: true,
        position: 0,
        required: true,
        help: "New keypair file that will become the nonce account address.",
      },
      {
        name: "amount",
        label: "Amount (SOL)",
        type: "amount",
        positional: true,
        position: 1,
        required: true,
        help: "SOL deposited into the nonce account (must cover rent + buffer).",
      },
    ],
    requiresConfirm: true,
    dangerous: true,
    page: "transfer",
  },

  // ── Stake ───────────────────────────────────────────────
  {
    id: "stake-account",
    binary: "solana",
    label: "Stake account",
    description:
      "Show details of a stake account: balance, activation state, delegated vote account, authorities, and lockup.",
    subcommand: ["stake-account"],
    fields: [
      {
        name: "account",
        label: "Stake account",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
        help: "Public key of the stake account.",
      },
    ],
    preferJson: true,
    page: "stake",
  },
  {
    id: "create-stake-account",
    binary: "solana",
    label: "Create stake account",
    description:
      "Create a new stake account and fund it with SOL. Stake is inactive until you delegate it to a validator vote account.",
    subcommand: ["create-stake-account"],
    fields: [
      {
        name: "stakeAccount",
        label: "Stake account keypair",
        type: "path",
        positional: true,
        position: 0,
        required: true,
        help: "New keypair file for the stake account address.",
      },
      {
        name: "amount",
        label: "Amount (SOL)",
        type: "amount",
        positional: true,
        position: 1,
        required: true,
        help: "SOL to stake (subject to minimum delegation rules).",
      },
    ],
    requiresConfirm: true,
    dangerous: true,
    page: "stake",
  },
  {
    id: "delegate-stake",
    binary: "solana",
    label: "Delegate stake",
    description:
      "Assign a stake account to a validator’s vote account so it earns rewards. Stake activates over one or more epochs after this.",
    subcommand: ["delegate-stake"],
    fields: [
      {
        name: "stakeAccount",
        label: "Stake account",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
        help: "Stake account to delegate.",
      },
      {
        name: "voteAccount",
        label: "Vote account",
        type: "pubkey",
        positional: true,
        position: 1,
        required: true,
        help: "Validator vote account public key (not the node identity).",
      },
    ],
    requiresConfirm: true,
    dangerous: true,
    page: "stake",
  },
  {
    id: "deactivate-stake",
    binary: "solana",
    label: "Deactivate stake",
    description:
      "Start undelegation so stake cools down and can later be withdrawn. Deactivation finishes after epoch boundaries — funds are not liquid immediately.",
    subcommand: ["deactivate-stake"],
    fields: [
      {
        name: "stakeAccount",
        label: "Stake account",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
        help: "Stake account currently delegated.",
      },
    ],
    requiresConfirm: true,
    dangerous: true,
    page: "stake",
  },
  {
    id: "withdraw-stake",
    binary: "solana",
    label: "Withdraw stake",
    description:
      "Move inactive (undelegated / cooled-down) SOL from a stake account to a destination wallet. Fails if stake is still activating or deactivating.",
    subcommand: ["withdraw-stake"],
    fields: [
      {
        name: "stakeAccount",
        label: "Stake account",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
      },
      {
        name: "destination",
        label: "Destination",
        type: "pubkey",
        positional: true,
        position: 1,
        required: true,
        help: "Wallet that receives the withdrawn SOL.",
      },
      {
        name: "amount",
        label: "Amount (SOL)",
        type: "amount",
        positional: true,
        position: 2,
        required: true,
      },
    ],
    requiresConfirm: true,
    dangerous: true,
    page: "stake",
  },
  {
    id: "stakes",
    binary: "solana",
    label: "Stakes",
    description:
      "List stake accounts, optionally filtered by vote account. Useful to see what is delegated to a given validator.",
    subcommand: ["stakes"],
    fields: [
      {
        name: "voteAccount",
        label: "Vote account (optional filter)",
        type: "pubkey",
        positional: true,
        position: 0,
        help: "If set, only stakes delegated to this vote account.",
      },
    ],
    page: "stake",
  },

  // ── Vote / validators ───────────────────────────────────
  {
    id: "vote-account",
    binary: "solana",
    label: "Vote account",
    description:
      "Show a validator vote account: identity, commission, root slot, credits, and authorities. Vote accounts are what stake delegates to.",
    subcommand: ["vote-account"],
    fields: [
      {
        name: "account",
        label: "Vote account",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
      },
    ],
    preferJson: true,
    page: "vote",
  },
  {
    id: "validators",
    binary: "solana",
    label: "Validators",
    description:
      "Cluster-wide validator summary: stake weight, skip rate, version, and identity. Helps pick healthy validators or monitor the set.",
    subcommand: ["validators"],
    fields: [],
    preferJson: true,
    page: "vote",
  },
  {
    id: "gossip",
    binary: "solana",
    label: "Gossip",
    description:
      "List nodes currently visible on the gossip network (IPs, pubkeys, RPC/TPU ports). Low-level cluster membership view.",
    subcommand: ["gossip"],
    fields: [],
    page: "vote",
  },

  // ── Program ─────────────────────────────────────────────
  {
    id: "program-show",
    binary: "solana",
    label: "Program show",
    description:
      "Display on-chain program metadata: upgrade authority, last deploy slot, data length, and whether it is immutable.",
    subcommand: ["program", "show"],
    fields: [
      {
        name: "programId",
        label: "Program ID",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
        help: "Deployed program public key.",
      },
    ],
    page: "program",
  },
  {
    id: "program-deploy",
    binary: "solana",
    label: "Program deploy",
    description:
      "Upload a compiled program binary (.so) to the cluster. Costs SOL for rent and fees. Optional program keypair reuses an address; max-len reserves upgrade room.",
    subcommand: ["program", "deploy"],
    fields: [
      {
        name: "program",
        label: "Program .so path",
        type: "path",
        positional: true,
        position: 0,
        required: true,
        help: "Path to the built SBF/BPF shared object.",
      },
      {
        name: "programId",
        label: "Program keypair path",
        type: "path",
        flag: "--program-id",
        help: "Keypair that becomes the program address. Omit to generate a new one.",
      },
      {
        name: "maxLen",
        label: "Max len",
        type: "number",
        flag: "--max-len",
        help: "Max program data size in bytes (for future upgrades). Default ≈ binary size.",
      },
    ],
    requiresConfirm: true,
    dangerous: true,
    page: "program",
  },
  {
    id: "program-dump",
    binary: "solana",
    label: "Program dump",
    description:
      "Download an on-chain program’s ELF/binary to a local file. Useful for inspection, audit, or offline analysis.",
    subcommand: ["program", "dump"],
    fields: [
      {
        name: "programId",
        label: "Program ID",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
      },
      {
        name: "outfile",
        label: "Output file",
        type: "path",
        positional: true,
        position: 1,
        required: true,
        help: "Local path to write the dumped program bytes.",
      },
    ],
    page: "program",
  },

  // ── Cluster ─────────────────────────────────────────────
  {
    id: "epoch-info",
    binary: "solana",
    label: "Epoch info",
    description:
      "Current epoch number, slot range, progress through the epoch, and absolute slot. Core timing unit for staking and rewards.",
    subcommand: ["epoch-info"],
    fields: [],
    preferJson: true,
    page: "cluster",
  },
  {
    id: "slot",
    binary: "solana",
    label: "Slot",
    description:
      "Current cluster slot (roughly ~400ms time units). Slots advance continuously as the network produces blocks.",
    subcommand: ["slot"],
    fields: [],
    page: "cluster",
  },
  {
    id: "block-height",
    binary: "solana",
    label: "Block height",
    description:
      "Number of confirmed blocks from genesis. Differs from slot count because some slots are skipped.",
    subcommand: ["block-height"],
    fields: [],
    page: "cluster",
  },
  {
    id: "cluster-version",
    binary: "solana",
    label: "Cluster version",
    description:
      "Software version reported by the connected RPC / entrypoint. Useful when debugging feature gates and API differences.",
    subcommand: ["cluster-version"],
    fields: [],
    page: "cluster",
  },
  {
    id: "supply",
    binary: "solana",
    label: "Supply",
    description:
      "Total SOL supply figures: circulating, non-circulating, and total. Network-level monetary stats.",
    subcommand: ["supply"],
    fields: [],
    preferJson: true,
    page: "cluster",
  },
  {
    id: "inflation",
    binary: "solana",
    label: "Inflation",
    description:
      "Show protocol inflation parameters and current rates that fund staking rewards and foundation allocations.",
    subcommand: ["inflation"],
    fields: [],
    page: "cluster",
  },
  {
    id: "recent-fees",
    binary: "solana",
    label: "Prioritization fees",
    description:
      "Sample recent priority fees paid by transactions. Helps choose a compute-unit price when the network is congested.",
    subcommand: ["recent-prioritization-fees"],
    fields: [],
    page: "cluster",
  },
  {
    id: "transaction-count",
    binary: "solana",
    label: "Transaction count",
    description:
      "Lifetime (or cluster-reported) transaction count from the RPC. A simple activity / health metric.",
    subcommand: ["transaction-count"],
    fields: [],
    page: "cluster",
  },
  {
    id: "ping",
    binary: "solana",
    label: "Ping",
    description:
      "Send a series of lightweight transactions and report confirmation latency. Stress-tests your RPC and keypair connectivity (uses tiny fees).",
    subcommand: ["ping"],
    fields: [
      {
        name: "count",
        label: "Count",
        type: "number",
        flag: "-c",
        defaultValue: "5",
        help: "How many ping transactions to send.",
      },
      {
        name: "interval",
        label: "Interval (seconds)",
        type: "number",
        flag: "-i",
        defaultValue: "1",
        help: "Seconds between pings.",
      },
    ],
    page: "cluster",
  },

  // ── Tokens ──────────────────────────────────────────────
  {
    id: "spl-accounts",
    binary: "spl-token",
    label: "Token accounts",
    description:
      "List SPL token accounts owned by a wallet: mint, balance, and account address for each token held.",
    subcommand: ["accounts"],
    fields: [
      {
        name: "owner",
        label: "Owner (optional)",
        type: "pubkey",
        flag: "--owner",
        help: "Wallet that owns the token accounts. Empty = configured keypair.",
      },
    ],
    page: "tokens",
  },
  {
    id: "spl-balance",
    binary: "spl-token",
    label: "Token balance",
    description:
      "Show your balance of a specific SPL token mint (e.g. USDC), not SOL. Uses the associated token account for the configured wallet.",
    subcommand: ["balance"],
    fields: [
      {
        name: "mint",
        label: "Token mint",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
        help: "Mint address of the token (not your wallet).",
      },
    ],
    page: "tokens",
  },
  {
    id: "spl-supply",
    binary: "spl-token",
    label: "Token supply",
    description:
      "Total supply of an SPL token mint (how many tokens exist across all holders).",
    subcommand: ["supply"],
    fields: [
      {
        name: "mint",
        label: "Token mint",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
      },
    ],
    page: "tokens",
  },
  {
    id: "spl-transfer",
    binary: "spl-token",
    label: "Token transfer",
    description:
      "Send an amount of an SPL token to another wallet. Optionally fund (create) the recipient’s associated token account if missing.",
    subcommand: ["transfer"],
    fields: [
      {
        name: "mint",
        label: "Token mint",
        type: "pubkey",
        positional: true,
        position: 0,
        required: true,
      },
      {
        name: "amount",
        label: "Amount",
        type: "amount",
        positional: true,
        position: 1,
        required: true,
        help: "Human amount in token units (respects mint decimals).",
      },
      {
        name: "recipient",
        label: "Recipient",
        type: "pubkey",
        positional: true,
        position: 2,
        required: true,
        help: "Destination wallet (owner), not necessarily their token account.",
      },
      {
        name: "fundRecipient",
        label: "Fund recipient ATA",
        type: "flag",
        flag: "--fund-recipient",
        defaultValue: false,
        help: "Pay rent to create the recipient’s associated token account if needed.",
      },
    ],
    requiresConfirm: true,
    dangerous: true,
    page: "tokens",
  },
  {
    id: "spl-create-token",
    binary: "spl-token",
    label: "Create token",
    description:
      "Create a new SPL token mint. You become the mint authority and can later mint tokens to accounts. Decimals define divisibility (9 is SOL-like).",
    subcommand: ["create-token"],
    fields: [
      {
        name: "decimals",
        label: "Decimals",
        type: "number",
        flag: "--decimals",
        defaultValue: "9",
        help: "0 = whole tokens only; 6 common for stablecoins; 9 like SOL.",
      },
    ],
    requiresConfirm: true,
    dangerous: true,
    page: "tokens",
  },
];

export function commandsForPage(page: string): CatalogCommand[] {
  return CATALOG.filter((c) => c.page === page);
}

export function buildArgsFromFields(
  cmd: CatalogCommand,
  values: Record<string, string | boolean>
): string[] {
  const args: string[] = [...cmd.subcommand, ...(cmd.fixedArgs ?? [])];

  const positionals = cmd.fields
    .filter((f) => f.positional)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  for (const f of positionals) {
    const v = values[f.name];
    if (v === undefined || v === "" || v === false) continue;
    args.push(String(v));
  }

  for (const f of cmd.fields.filter((x) => !x.positional)) {
    const v = values[f.name];
    if (f.type === "flag") {
      if (v === true || v === "true") {
        if (f.flag) args.push(f.flag);
      }
      continue;
    }
    if (v === undefined || v === "" || v === false) continue;
    if (f.flag) {
      args.push(f.flag);
      args.push(String(v));
    }
  }

  return args;
}
